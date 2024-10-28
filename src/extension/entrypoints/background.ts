import { appStorage } from '@/utils/storage';
import { Client, fromBuffer } from '@azot/lib';
import { getMessageType } from '@azot/lib/message';

export default defineBackground({
  type: 'module',
  main: () => {
    const state: {
      client: Client | null;
      sessions: Map<string, MediaKeySession>;
    } = {
      client: null,
      sessions: new Map(),
    };
    const events = new Map<string, MediaKeyMessageEvent[]>();

    const loadClient = async () => {
      if (state.client) return state.client;
      console.log('[azot] Loading Widevine client...');
      state.client = await appStorage.client.getValue();
      if (state.client) {
        console.log('[azot] Widevine client loaded');
        return state.client;
      } else {
        return console.log('[azot] Unable to load client');
      }
    };

    console.log('[azot] Background service worker started', {
      id: browser.runtime.id,
    });

    const parseBinary = (data: Record<string, number>) =>
      new Uint8Array(Object.values(data));

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      (async () => {
        console.log('[azot] Received message', message);

        const client = await loadClient();
        if (!client) return;

        const keySystem = client.requestMediaKeySystemAccess(
          'com.widevine.alpha',
          [],
        );
        const mediaKeys = await keySystem.createMediaKeys();

        if (message.action === 'generateRequest') {
          const { initDataType, initData } = message;
          const keySession = mediaKeys.createSession();
          state.sessions.set(initData, keySession);
          if (!events.has(keySession.sessionId))
            events.set(keySession.sessionId, []);
          keySession.addEventListener(
            'message',
            (event: MediaKeyMessageEvent) => {
              console.log(event);
              events.get(keySession.sessionId)?.push(event);
            },
            false,
          );
          await keySession.generateRequest(initDataType, initData);
          sendResponse();
        } else if (message.action === 'individualization-request') {
          // TODO: Handle individualization request
          sendResponse();
        } else if (message.action === 'license-request') {
          const { initData } = message;
          const session = state.sessions.get(initData);
          console.log('[azot] Received message license-request', session);
          if (!session) return;
          const event = events
            .get(session.sessionId)
            ?.find((e) => e.messageType === 'license-request');
          if (!event?.message) return console.log(`[azot] No message`);
          const messageBase64 = fromBuffer(
            new Uint8Array(event.message),
          ).toBase64();
          console.log(events.get(session.sessionId));
          console.log(`[azot] Sending challenge`, messageBase64, event);
          sendResponse(messageBase64);
        } else if (message.action === 'update') {
          const { initData } = message;
          const type = getMessageType(parseBinary(message.message));
          const serviceCertificateMessageType = 5;
          const isServiceCertificate = type === serviceCertificateMessageType;
          // if (type === serviceCertificateMessageType) {
          //   console.log('[azot] Service certificate. Skipping');
          //   sendResponse();
          // }
          const session = state.sessions.get(initData);
          if (!session) {
            console.log('[azot] Unable to find session');
            sendResponse();
          }
          if (isServiceCertificate) {
            session?.update(parseBinary(message.message));
            sendResponse();
          } else {
            session?.addEventListener(
              'keystatuseschange',
              (event) => {
                const keySession = event.target as MediaKeySession;
                const toPair = (key: Uint8Array) =>
                  fromBuffer(key).toText().split(':') as [
                    id: string,
                    value: string,
                  ];
                const keys = Array.from(
                  keySession.keyStatuses.keys(),
                ) as unknown as Uint8Array[];
                const results = keys.map((key) => toPair(key));
                console.log('[azot] Received keys', results);
                appStorage.keys.setValue(results);
                sendResponse({ keys: results });
              },
              false,
            );
            await session?.update(parseBinary(message.message));
          }
        }
      })();
      return true;
    });
  },
});
