import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Client, fetchDecryptionKeys } from '../lib';

export const WORKDIR = join(process.cwd(), '');

// https://bitmovin.com/demos/drm
export const PSSH =
  'AAAAW3Bzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAADsIARIQ62dqu8s0Xpa7z2FmMPGj2hoNd2lkZXZpbmVfdGVzdCIQZmtqM2xqYVNkZmFsa3IzaioCSEQyAA==';
export const LICENSE_URL = 'https://cwip-shaka-proxy.appspot.com/no_auth';

export const read = async (filename: string) =>
  readFile(join(WORKDIR, filename));

export const createClient = async () => {
  const id = await read('device_client_id_blob');
  const key = await read('device_private_key');
  return Client.fromPair(id, key);
};

export const fetchDecryptionKeysWithDefaults = async (client?: Client) => {
  return fetchDecryptionKeys({
    server: LICENSE_URL,
    pssh: PSSH,
    client: client || (await createClient()),
  });
};
