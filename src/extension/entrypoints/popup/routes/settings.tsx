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

  const switchInterception = (checked: boolean) => {
    setInterceptionEnabled(checked);
    appStorage.interceptionEnabled.setValue(checked);
  };

  const switchSpoofing = (checked: boolean) => {
    setSpoofingEnabled(checked);
    appStorage.spoofingEnabled.setValue(checked);
  };

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
                  const checked = e.target.checked;
                  if (!checked) switchSpoofing(false);
                  switchInterception(checked);
                }}
              />
            }
          >
            Interception
          </Cell>
          <Cell
            subtitle="Send our own license request"
            component="label"
            disabled={!interceptionEnabled()}
            after={
              <Switch
                checked={spoofingEnabled()}
                onChange={(e) => switchSpoofing(e.target.checked)}
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
