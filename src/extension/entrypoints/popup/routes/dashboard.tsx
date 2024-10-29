import { TbShieldCheck } from 'solid-icons/tb';
import { appStorage } from '@/utils/storage';
import { Cell } from '../components/cell';
import {
  useActiveClient,
  useClients,
  useInterceptionEnabled,
  useSpoofingEnabled,
} from '../utils/state';
import { Toolbar } from '../components/toolbar';
import { Layout } from '../components/layout';
import { Header } from '../components/header';
import { CellImportClient } from '../components/cell-import-client';
import { NoKeys } from '../components/no-keys';
import { KeysList } from '../components/keys-list';

export const Dashboard = () => {
  const [clients] = useClients();
  const [, setInterceptionEnabled] = useInterceptionEnabled();
  const [, setSpoofingEnabled] = useSpoofingEnabled();
  const [keys, setKeys] = createSignal<{ id: string; value: string }[]>([]);
  const [activeClient, setActiveClient] = useActiveClient();

  onMount(async () => {
    const keys = await appStorage.keys.getValue();
    if (keys) setKeys(keys);

    appStorage.keys.watch((newKeys) => setKeys(newKeys || []));

    const activeClient = await appStorage.clients.active.getValue();
    if (activeClient) setActiveClient(activeClient);

    const interceptionEnabled = await appStorage.interceptionEnabled.getValue();
    setInterceptionEnabled(!!interceptionEnabled);

    const spoofingEnabled = await appStorage.spoofingEnabled.getValue();
    setSpoofingEnabled(!!spoofingEnabled);
  });

  return (
    <Layout>
      <Header>Dashboard</Header>
      <div class="flex flex-col gap-3">
        <Toolbar />

        <Show when={!activeClient() && clients().length === 0}>
          <CellImportClient />
        </Show>
        <Show when={activeClient()}>
          <Cell
            class="capitalize"
            before={<TbShieldCheck />}
            variant="primary"
            component="label"
          >
            {`${activeClient()?.info.get('company_name')} ${activeClient()?.info.get('model_name')}`}
          </Cell>
        </Show>

        <Show when={keys().length > 0}>
          <KeysList keys={keys} />
        </Show>

        <Show when={keys().length === 0}>
          <footer class="w-full flex flex-col items-center justify-center text-center gap-1 mt-auto py-2">
            <NoKeys />
          </footer>
        </Show>
      </div>
    </Layout>
  );
};
