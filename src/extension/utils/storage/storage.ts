import { storage } from 'wxt/storage';
import { Client } from '../../../lib';
import { asBytes, asJson } from './utils';

export const appStorage = {
  enabled: storage.defineItem<boolean>('local:enabled'),
  keys: asJson(storage.defineItem<[id: string, value: string][]>('local:keys')),
  client: {
    wvd: asBytes(storage.defineItem<Uint8Array>('local:client-wvd')),
    id: asBytes(storage.defineItem<Uint8Array>('local:client-id')),
    key: asBytes(storage.defineItem<Uint8Array>('local:client-key')),
    getValue: async () => {
      const wvd = await appStorage.client.wvd.getValue();
      const id = await appStorage.client.id.getValue();
      const key = await appStorage.client.key.getValue();
      if (id && key) return Client.fromUnpacked(id, key);
      else if (wvd) return Client.fromPacked(wvd);
      else return null;
    },
  },
};
