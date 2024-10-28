import { test, expect } from 'vitest';
import { fetchDecryptionKeys } from '../src/lib';
import { PSSH, LICENSE_URL, createClient } from './utils';

test('fetch decryption keys', async () => {
  const client = await createClient();
  const keys = await fetchDecryptionKeys({
    server: LICENSE_URL,
    pssh: PSSH,
    client,
  });
  expect(keys.length).toBe(5);
  const contentKey = keys.at(0);
  expect(contentKey).toBeDefined();
  expect(contentKey!.id).toBe('ccbf5fb4c2965be7aa130ffb3ba9fd73');
  expect(contentKey!.value).toBe('9cc0c92044cb1d69433f5f5839a159df');
});

test('fetch decryption keys with privacy mode', async () => {
  const client = await createClient();
  const keys = await fetchDecryptionKeys({
    server: LICENSE_URL,
    individualizationServer: LICENSE_URL,
    pssh: PSSH,
    client,
  });
  expect(keys.length).toBe(5);
  const contentKey = keys.at(0);
  expect(contentKey).toBeDefined();
  expect(contentKey!.id).toBe('ccbf5fb4c2965be7aa130ffb3ba9fd73');
  expect(contentKey!.value).toBe('9cc0c92044cb1d69433f5f5839a159df');
});
