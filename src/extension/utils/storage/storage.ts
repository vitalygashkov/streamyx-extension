import { storage } from 'wxt/storage';
import { Client, fromBase64, fromBuffer } from '../../../lib';
import { asJson } from './utils';

export const appStorage = {
  interceptionEnabled: storage.defineItem<boolean>(
    'local:interception-enabled',
  ),
  spoofingEnabled: storage.defineItem<boolean>('local:spoofing-enabled'),

  keys: asJson(storage.defineItem<[id: string, value: string][]>('local:keys')),

  clients: {
    raw: asJson(storage.defineItem<string[]>('local:clients')),
    active: {
      raw: storage.defineItem<string>('local:active-client'),
      setValue: async (client: Client | null) => {
        if (!client) return appStorage.clients.active.raw.setValue(null);
        const clientBase64 = fromBuffer(await client.pack()).toBase64();
        return appStorage.clients.active.raw.setValue(clientBase64);
      },
      getValue: async () => {
        const clientBase64 = await appStorage.clients.active.raw.getValue();
        if (!clientBase64) return null;
        const client = await Client.fromPacked(
          fromBase64(clientBase64).toBuffer(),
        );
        return client;
      },
    },
    setValue: async (clients: Client[]) => {
      const values = [];
      for (const client of clients) {
        const clientBuffer = await client.pack();
        const clientBase64 = fromBuffer(clientBuffer).toBase64();
        values.push(clientBase64);
      }
      return appStorage.clients.raw.setValue(values);
    },
    getValue: async () => {
      const values = await appStorage.clients.raw.getValue();
      if (!values) return [];
      const clients = [];
      for (const value of values) {
        const client = await Client.fromPacked(fromBase64(value).toBuffer());
        clients.push(client);
      }
      return clients;
    },
    add: async (client: Client) => {
      const clients = await appStorage.clients.getValue();
      clients.push(client);
      await appStorage.clients.setValue(clients);
    },
    remove: async (client: Client) => {
      const clients = await appStorage.clients.getValue();
      const index = clients.findIndex(
        (c) => c.info.get('model_name') === client.info.get('model_name'),
      );
      if (index === -1) return;
      clients.splice(index, 1);
      await appStorage.clients.setValue(clients);
    },
  },
};
