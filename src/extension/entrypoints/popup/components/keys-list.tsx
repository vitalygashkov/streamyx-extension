import { TbCopy } from 'solid-icons/tb';
import { Accessor, Component } from 'solid-js';
import { Cell } from './cell';
import { KeyInfo } from '@/utils/storage';
import { copyKey } from '../utils/key';

type KeysListProps = {
  keys: Accessor<KeyInfo[]>;
};

export const KeysList: Component<KeysListProps> = (props) => {
  return (
    <ul class="flex flex-col gap-2">
      {props.keys().map(({ id, value, url }) => (
        <Cell
          class="group relative"
          after={
            <div class="absolute top-3.5 right-1.5 z-10">
              <TbCopy class="text-blue-500 w-5 h-5 transition-all opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
          }
          onClick={() => copyKey({ id, value })}
        >
          <code class="text-[13px] truncate">{id}</code>
          <a
            target="_blank"
            href={url}
            class="text-[10px] text-gray-500 w-fit truncate hover:underline hover:text-blue-500"
          >
            {url?.replace('https://', '')}
          </a>
        </Cell>
      ))}
    </ul>
  );
};
