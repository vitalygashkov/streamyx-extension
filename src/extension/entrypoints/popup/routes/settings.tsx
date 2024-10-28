import { Layout } from '../components/layout';
import { Header } from '../components/header';
import { List } from '../components/list';
import { Section } from '../components/section';
import { Cell } from '../components/cell';
import { Switch } from '../components/switch';
import { useInterceptionEnabled, useSpoofingEnabled } from '../utils/state';
import { appStorage } from '@/utils/storage';

export const Settings = () => {
  const [interceptionEnabled, setInterceptionEnabled] =
    useInterceptionEnabled();
  const [spoofingEnabled, setSpoofingEnabled] = useSpoofingEnabled();

  return (
    <Layout>
      <Header backHref="/">Settings</Header>
      <List>
        <Section
          header="General"
          footer="When enabled, it will not be possible to play protected media."
        >
          <Cell
            title="You can view logs from an EME session in Developer Tools under the Console tab "
            subtitle="Script injection with EME logging"
            component="label"
            after={
              <Switch
                checked={interceptionEnabled()}
                onChange={(e) => {
                  setInterceptionEnabled(e.target.checked);
                  appStorage.interceptionEnabled.setValue(e.target.checked);
                }}
              />
            }
          >
            Interception
          </Cell>
          <Cell
            subtitle="Creating your own license request"
            component="label"
            after={
              <Switch
                checked={spoofingEnabled()}
                onChange={(e) => {
                  setSpoofingEnabled(e.target.checked);
                  appStorage.spoofingEnabled.setValue(e.target.checked);
                }}
              />
            }
          >
            Spoofing
          </Cell>
        </Section>
      </List>
    </Layout>
  );
};
