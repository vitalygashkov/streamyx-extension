import { A } from '@solidjs/router';
import { appStorage, KeyInfo } from '@/utils/storage';
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
import { SectionFooter } from '../components/section';

export const Dashboard = () => {
  const [clients] = useClients();
  const [, setInterceptionEnabled] = useInterceptionEnabled();
  const [spoofingEnabled, setSpoofingEnabled] = useSpoofingEnabled();
  const [keys, setKeys] = createSignal<KeyInfo[]>([]);
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
        <div>
          <Show when={activeClient()}>
            <Cell class="capitalize" component="label" subtitle="Active">
              {`${activeClient()?.info.get('company_name')} ${activeClient()?.info.get('model_name')}`}
            </Cell>
          </Show>
          <Show when={!spoofingEnabled()}>
            <SectionFooter>
              Interception and Spoofing must be enabled in{' '}
              <A
                href="/settings"
                class="w-fit truncate text-blue-600 hover:underline hover:text-blue-500"
              >
                Settings
              </A>{' '}
              to obtain keys
            </SectionFooter>
          </Show>
        </div>

        <KeysList
          keys={keys}
          header="Recent Keys"
          footer="Only keys from the last intercept are shown here. Click on the key to copy it to the clipboard"
        />

        <Show when={keys().length === 0}>
          <footer class="w-full flex flex-col items-center justify-center text-center gap-1 mt-auto py-2">
            <NoKeys />
          </footer>
        </Show>
      </div>
    </Layout>
  );
};
