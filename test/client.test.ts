import { expect, test } from 'vitest';
import { Client, convert } from '../lib';
import { fetchDecryptionKeysWithDefaults, read } from './utils';

test('export client', async () => {
  const originalId = await read('device_client_id_blob');
  const originalKey = await read('device_private_key');
  const client = await Client.fromPair(originalId, originalKey);
  const [exportedId, exportedKey] = await client.toPair();

  const originalIdText = convert.bytes(originalId).toBase64();
  const exportedIdText = convert.bytes(exportedId).toBase64();
  expect(originalIdText).toBe(exportedIdText);

  const originalKeyText = convert
    .bytes(originalKey)
    .toText()
    .split('\n')
    .map((s) => s.trim());
  const exportedKeyText = convert
    .bytes(exportedKey)
    .toText()
    .split('\n')
    .map((s) => s.trim());
  expect(originalKeyText).toEqual(exportedKeyText);
});

test('import wvd', async () => {
  const wvd = await read('client.wvd');
  const client = await Client.fromWvd(wvd);
  expect(client.identification).toBeDefined();
  expect(client.key).toBeDefined();
  const keys = await fetchDecryptionKeysWithDefaults();
  expect(keys.length).toBe(5);
});

test('export wvd', async () => {
  const id = await read('device_client_id_blob');
  const key = await read('device_private_key');
  const client = await Client.fromPair(id, key);
  const wvd = await client.toWvd();
  const wvdClient = await Client.fromWvd(wvd);
  const keys = await fetchDecryptionKeysWithDefaults(wvdClient);
  expect(keys.length).toBe(5);
});
