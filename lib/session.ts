import {
  License,
  LicenseRequest,
  LicenseType,
  ProtocolVersion,
  SignedDrmCertificate,
  SignedMessage,
} from './proto';
import {
  convert,
  createHmacSha256,
  getRandomBytes,
  getRandomHex,
} from './crypto';
import { Key } from './key';
import { Client } from './client';
import { PSSH, createPssh } from './pssh';
import { deriveContext, deriveKeys } from './context';
import { MessageEvent, getMessageType } from './message';
import { parseCertificate, verifyCertificate } from './certificate';
import { concatUint8Arrays } from './buffer';

export type Logger = Pick<typeof console, 'debug' | 'error' | 'info' | 'warn'>;

export const SESSION_TYPES = {
  temporary: 0,
  'persistent-license': 1,
} as const;

export type SessionType = keyof typeof SESSION_TYPES;

export const generateSessionId = (deviceType: string) => {
  switch (deviceType) {
    case 'chrome':
      return convert.bytes(getRandomBytes()).toBase64();
    case 'android':
    default: {
      // format: 16 random hexdigits, 2 digit counter, 14 0s
      const randAscii = getRandomHex();
      const counter = '01'; // this resets regularly so its fine to use 01
      const rest = '00000000000000';
      const hex = randAscii + counter + rest;
      return hex;
    }
  }
};

/**
 * https://www.w3.org/TR/encrypted-media-2/#mediakeysession-interface
 */

export class Session extends EventTarget implements MediaKeySession {
  readonly sessionId: string;
  readonly keyStatuses: MediaKeyStatusMap;
  readonly keys: Map<string, Key>;
  readonly expiration: number;
  readonly closed: Promise<MediaKeySessionClosedReason>;

  onmessage: ((this: MediaKeySession, ev: MediaKeyMessageEvent) => any) | null;
  onkeyschange: ((this: MediaKeySession, ev: Event) => any) | null;
  onkeystatuseschange: ((this: MediaKeySession, ev: Event) => any) | null;

  sessionType: SessionType;
  privacyMode?: boolean = false;

  #individualizationSent: boolean = false;
  #client: Client;
  #serviceCertificate?: SignedDrmCertificate;
  #contexts: Map<string, { enc: Uint8Array; auth: Uint8Array }>;
  #log: Logger;
  #initData?: BufferSource;
  #initDataType?: string;

  constructor(sessionType: SessionType = 'temporary', client: Client) {
    super();
    this.sessionId = generateSessionId('android');
    this.keyStatuses = new Map();
    this.keys = new Map();
    this.expiration = NaN;
    this.closed = new Promise<MediaKeySessionClosedReason>((resolve) => {
      this.addEventListener('closed', () => resolve('closed-by-application'));
    });

    this.onmessage = null;
    this.onkeyschange = null;
    this.onkeystatuseschange = null;

    this.sessionType = sessionType;
    this.#client = client;
    this.#contexts = new Map();
    this.#log = console;
  }

  setLogger(logger: Logger) {
    this.#log = logger;
  }

  async generateRequest(
    initDataType: string,
    initData: BufferSource,
  ): Promise<void> {
    if (this.privacyMode && !this.#individualizationSent) {
      this.dispatchEvent(
        new MessageEvent(
          'individualization-request',
          convert.text(`\x08\x04`).toBuffer(),
        ),
      );
      this.#individualizationSent = true;
      this.#initData = initData;
      this.#initDataType = initDataType;
      return;
    }
    const pssh = createPssh(initData as Uint8Array);
    const licenseRequest = await this.#createLicenseRequest(pssh);
    const message = await this.#signMessage(
      licenseRequest.bytes,
      SignedMessage.MessageType.LICENSE_REQUEST,
    );
    this.#contexts.set(
      convert.bytes(licenseRequest.requestId).toText(),
      deriveContext(licenseRequest.bytes),
    );
    this.dispatchEvent(new MessageEvent('license-request', message.bytes));
  }

  async #createLicenseRequest(pssh: PSSH) {
    const requestId = ArrayBuffer.isView(this.sessionId)
      ? (this.sessionId as unknown as Uint8Array)
      : convert.text(this.sessionId).toBuffer();
    const entity = LicenseRequest.create({
      clientId: this.#serviceCertificate
        ? undefined
        : this.#client.identification,
      encryptedClientId: this.#serviceCertificate
        ? await this.#client.encryptId(this.#serviceCertificate)
        : undefined,
      contentId: {
        widevinePsshData: {
          psshData: [pssh.toBuffer()],
          licenseType:
            this.sessionType === 'persistent-license'
              ? LicenseType.OFFLINE
              : LicenseType.STREAMING,
          requestId: requestId,
        },
      },
      type: LicenseRequest.RequestType.NEW,
      requestTime: Math.round(Date.now() / 1000),
      protocolVersion: ProtocolVersion.VERSION_2_1,
    });
    const bytes = LicenseRequest.encode(entity).finish();
    return { requestId, entity, bytes };
  }

  async #signMessage(message: Uint8Array, type: SignedMessage.MessageType) {
    const entity = SignedMessage.create({
      type: type,
      msg: message,
      signature: await this.#client.signWithKey(message),
    });
    const bytes = SignedMessage.encode(entity).finish();
    return { entity, bytes };
  }

  load(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async update(response: Uint8Array): Promise<void> {
    const type = getMessageType(response);
    const typeText = type ? SignedMessage.MessageType[type] : '?';
    if (type === SignedMessage.MessageType.SERVICE_CERTIFICATE) {
      await this.#setServiceCertificate(response);
      if (!this.#initData || !this.#initDataType) return;
      this.generateRequest(this.#initDataType, this.#initData);
      return;
    }

    let signedLicense = null;
    try {
      signedLicense = SignedMessage.decode(response);
    } catch (e) {
      this.#log.error('Unable to parse license - check protobufs');
      this.#log.debug(convert.bytes(response).toText());
      return;
    }

    const license = License.decode(signedLicense.msg);
    const requestId = convert.bytes(license.id!.requestId!).toText();
    const context = this.#contexts.get(requestId);
    if (!context)
      throw new Error(
        `Failed to find context to decrypt keys, requestId: ${requestId}`,
      );

    const sessionKey = await this.#client.decryptWithKey(
      signedLicense.sessionKey,
    );
    const derivedKeys = await deriveKeys(context.enc, context.auth, sessionKey);

    const { success, signature } = await this.#verifyMessage(
      signedLicense,
      derivedKeys.macKeyServer,
    );
    if (!success) {
      this.#log.debug(`Calculated signature: ${signature.calculated}`);
      this.#log.debug(`Actual signature: ${signature.actual}`);
      throw new Error(
        'Signature mismatch on license message, rejecting license',
      );
    }

    for (const keyContainer of license.key) {
      if (!keyContainer.key || !keyContainer.iv) continue;
      const key = await Key.fromContainer(keyContainer, derivedKeys.encKey);
      if (!key.id) continue;
      this.#addKey(key);
    }

    this.dispatchEvent(new Event('keyschange'));
    this.dispatchEvent(new Event('keystatuseschange'));

    this.#contexts.delete(requestId);

    if (this.keys.size) await this.close();
  }

  async #setServiceCertificate(certificate: Uint8Array) {
    const { signedDrmCertificate, drmCertificate } =
      await parseCertificate(certificate);
    const isValid = verifyCertificate(signedDrmCertificate);
    if (!isValid) throw new Error('Certificate invalid: signature mismatch');
    this.#serviceCertificate = signedDrmCertificate;
    return drmCertificate.providerId;
  }

  async #verifyMessage(message: SignedMessage, key: Uint8Array) {
    const actualSignatureHex = convert.bytes(message.signature).toHex();
    const data = [message.msg];
    if (message.oemcryptoCoreMessage?.length)
      data.unshift(message.oemcryptoCoreMessage);
    const calculatedSignature = await createHmacSha256(
      key,
      concatUint8Arrays(...data),
    );
    const calculatedSignatureHex = convert.bytes(calculatedSignature).toHex();
    const success = actualSignatureHex === calculatedSignatureHex;
    const signature = {
      actual: actualSignatureHex,
      calculated: calculatedSignatureHex,
    };
    return { success, signature };
  }

  #addKey(key: Key) {
    this.keys.set(key.id, key);
    (this.keyStatuses as unknown as Map<Uint8Array, MediaKeyStatus>).set(
      convert.text(`${key.id}:${key.value}`).toBuffer(),
      'usable',
    );
  }

  close(): Promise<void> {
    this.dispatchEvent(new Event('closed'));
    return Promise.resolve();
  }

  remove(): Promise<void> {
    return Promise.resolve();
  }
}