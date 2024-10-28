import { TbTrash } from 'solid-icons/tb';
import { appStorage } from '@@/src/extension/utils/storage';
import { Cell } from './cell';
import { Switch } from './components/switch';
import { CellImportClient } from './cell-import-client';
import { useEnabled } from './state';

export const App = () => {
  const [enabled, setEnabled] = useEnabled();
  const [keys, setKeys] = createSignal<[id: string, value: string][]>([]);

  onMount(async () => {
    const enabled = await appStorage.enabled.getValue();
    setEnabled(!!enabled);
    const keys = await appStorage.keys.getValue();
    if (keys) setKeys(keys);
  });

  const copyKey = ([id, value]: [id: string, value: string]) => {
    navigator.clipboard.writeText(`${id}:${value}`);
  };

  const clearKeys = () => {
    appStorage.keys.setValue([]);
    setKeys([]);
  };

  return (
    <main class="px-4 py-4 min-w-[290px] bg-[#EFEFF4] flex flex-col gap-3">
      <CellImportClient />

      <Cell
        title="When enabled, it will not be possible to play protected videos"
        component="label"
        after={
          <Switch
            checked={enabled()}
            onChange={(e) => {
              setEnabled(e.target.checked);
              appStorage.enabled.setValue(e.target.checked);
            }}
          />
        }
      >
        Enabled
      </Cell>

      <Cell before={<TbTrash />} variant="danger" onClick={clearKeys}>
        Clear keys
      </Cell>

      {keys().length > 0 && (
        <ul class="flex flex-col gap-2">
          {keys().map(([id, value]) => (
            <Cell onClick={() => copyKey([id, value])}>
              <code class="text-[13px] truncate">{id}</code>
              <code class="text-[10px] text-gray-500 truncate">{value}</code>
            </Cell>
          ))}
        </ul>
      )}

      <footer class="w-full flex flex-col items-center justify-center text-center gap-1 mt-auto">
        {keys().length === 0 && (
          <>
            <h1 class="text-[16px] font-semibold">Keys will apear here</h1>
            <h2 class="text-[13px] px-8">
              Go to streaming service and play media to get keys
            </h2>
          </>
        )}
      </footer>
    </main>
  );
};
