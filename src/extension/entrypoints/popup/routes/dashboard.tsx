import { TbCopy, TbShieldCheck, TbTrash } from 'solid-icons/tb';
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

export const Dashboard = () => {
  const [clients] = useClients();
  const [, setInterceptionEnabled] = useInterceptionEnabled();
  const [, setSpoofingEnabled] = useSpoofingEnabled();
  const [keys, setKeys] = createSignal<[id: string, value: string][]>([]);
  const [activeClient, setActiveClient] = useActiveClient();

  onMount(async () => {
    const keys = await appStorage.keys.getValue();
    if (keys) setKeys(keys);

    const activeClient = await appStorage.clients.active.getValue();
    if (activeClient) setActiveClient(activeClient);

    const interceptionEnabled = await appStorage.interceptionEnabled.getValue();
    setInterceptionEnabled(!!interceptionEnabled);

    const spoofingEnabled = await appStorage.spoofingEnabled.getValue();
    setSpoofingEnabled(!!spoofingEnabled);
  });

  const copyKey = ([id, value]: [id: string, value: string]) => {
    navigator.clipboard.writeText(`${id}:${value}`);
  };

  const clearKeys = () => {
    appStorage.keys.setValue([]);
    setKeys([]);
  };

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

        <Cell before={<TbTrash />} variant="danger" onClick={clearKeys}>
          Clear keys
        </Cell>

        {keys().length > 0 && (
          <ul class="flex flex-col gap-2">
            {keys().map(([id, value]) => (
              <Cell
                class="group relative"
                after={
                  <div class="absolute top-3.5 right-1.5 z-10">
                    <TbCopy class="text-blue-500 w-5 h-5 transition-all opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                }
                onClick={() => copyKey([id, value])}
              >
                <code class="text-[13px] truncate">{id}</code>
                <code class="text-[10px] text-gray-500 truncate">{value}</code>
              </Cell>
            ))}
          </ul>
        )}
        <footer class="w-full flex flex-col items-center justify-center text-center gap-1 mt-auto py-2">
          {keys().length === 0 && (
            <>
              <h1 class="text-[16px] font-semibold">Keys will appear here</h1>
              <h2 class="text-[13px] px-8">
                Go to streaming service and play media to get keys
              </h2>
            </>
          )}
        </footer>
      </div>
    </Layout>
  );
};
