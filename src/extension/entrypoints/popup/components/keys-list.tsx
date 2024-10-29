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
    <Show when={props.keys().length > 0}>
      <List>
        <Section header={props.header} footer={props.footer}>
          {props.keys().map(({ id, value, url, createdAt }) => (
            <Cell class="group" onClick={() => copyKey({ id, value })}>
              <code class="text-[13px] truncate w-full">{id}</code>
              <div class="text-[10px] text-gray-500 flex justify-between">
                <a
                  target="_blank"
                  href={url}
                  class="w-fit truncate hover:underline hover:text-blue-500"
                >
                  {url?.replace('https://', '')}
                </a>
                {/* Date without seconds */}
                <div class="">
                  {new Date(createdAt)
                    .toLocaleString()
                    .replace(',', '')
                    .slice(0, -3)}
                </div>
              </div>
            </Cell>
          ))}
        </Section>
      </List>
    </Show>
  );
};
