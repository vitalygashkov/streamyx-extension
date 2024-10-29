import { TbCopy } from 'solid-icons/tb';
import { Accessor, Component } from 'solid-js';
import { Cell } from './cell';
import { KeyInfo } from '@/utils/storage';
import { copyKey } from '../utils/key';
import { List } from './list';
import { Section } from './section';

type KeysListProps = {
  keys: Accessor<KeyInfo[]>;
  header?: string;
  footer?: string;
};

export const KeysList: Component<KeysListProps> = (props) => {
  return (
    <List>
      <Section header={props.header} footer={props.footer}>
        {props.keys().map(({ id, value, url }) => (
          <Cell
            class="group relative"
            after={
              <div class="absolute top-[15px] right-3 z-10">
                <TbCopy class="text-blue-500 w-5 h-5 transition-all opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0" />
              </div>
            }
            onClick={() => copyKey({ id, value })}
          >
            <code class="text-[13px] truncate transition-all w-full group-hover:w-[90%]">
              {id}
            </code>
            <a
              target="_blank"
              href={url}
              class="text-[10px] text-gray-500 w-fit truncate hover:underline hover:text-blue-500"
            >
              {url?.replace('https://', '')}
            </a>
          </Cell>
        ))}
      </Section>
    </List>
  );
};
