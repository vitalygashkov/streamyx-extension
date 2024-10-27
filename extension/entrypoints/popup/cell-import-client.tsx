import { Component } from 'solid-js';
import { TbShieldCheck, TbShieldDown } from 'solid-icons/tb';
import { Client } from '@azot/lib';
import { appStorage } from '@/utils/storage';
import { Cell } from './cell';

export const CellImportClient: Component<{
  onChange?: (client: Client) => void;
}> = (props) => {
  const [client, setClient] = createSignal<Client | null>(null);

  const createClient = async (
    id?: Uint8Array | null,
    key?: Uint8Array | null,
    wvd?: Uint8Array | null,
  ) => {
    if (id && key) {
      const client = new Client(id);
      await client.importKey(key);
      return client;
    } else if (wvd) {
      return Client.fromWvd(wvd);
    }
  };

  const applyClient = (client?: Client) => {
    if (!client) return;
    setClient(client);
    props.onChange?.(client);
  };

  const initializeClient = async () => {
    const wvd = await appStorage.client.wvd.getValue();
    const id = await appStorage.client.id.getValue();
    const key = await appStorage.client.key.getValue();
    createClient(id, key, wvd).then(applyClient);
  };

  createEffect(() => {
    initializeClient();
  });

  const handleFileChange = async (event: Event) => {
    const files = Array.from((event.target as HTMLInputElement).files || []);

    const wvd = await files
      .find((file) => file.name.includes('wvd'))
      ?.arrayBuffer()
      .then((buffer) => new Uint8Array(buffer));
    const id = await files
      .find((file) => file.name.includes('client'))
      ?.arrayBuffer()
      .then((buffer) => new Uint8Array(buffer));
    const key = await files
      .find((file) => file.name.includes('key'))
      ?.arrayBuffer()
      .then((buffer) => new Uint8Array(buffer));

    if (id) appStorage.client.id.setValue(id);
    if (key) appStorage.client.key.setValue(key);
    if (wvd) appStorage.client.wvd.setValue(wvd);

    createClient(id, key, wvd).then(applyClient);
  };

  return (
    <Cell
      title="Supported formats: *.wvd, device_client_id_blob/device_private_key, client_id.bin/private_key.pem"
      before={client() ? <TbShieldCheck /> : <TbShieldDown />}
      variant="primary"
      component="label"
    >
      {client() ? client()?.toString() : 'Import Widevine client'}
      <input
        class="hidden"
        id="file"
        name="client"
        multiple
        type="file"
        disabled={!!client()}
        onChange={handleFileChange}
      />
    </Cell>
  );
};
