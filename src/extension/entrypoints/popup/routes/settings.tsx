import { Layout } from '../components/layout';
import { Header } from '../components/header';
import { List } from '../components/list';
import { Section } from '../components/section';
import { Cell } from '../components/cell';
import { Switch } from '../components/switch';
import { useSettings } from '../utils/state';
import { appStorage } from '@/utils/storage';

export const Settings = () => {
  const [settings, setSettings] = useSettings();

  const switchEmeInterception = (checked: boolean) => {
    setSettings({ emeInterception: checked });
    appStorage.settings.setValue(settings);
  };

  const switchSpoofing = (checked: boolean) => {
    setSettings({ spoofing: checked });
    appStorage.settings.setValue(settings);
  };

  const switchRequestInterception = (checked: boolean) => {
    setSettings({ requestInterception: checked });
    appStorage.settings.setValue(settings);
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
            title="You can view logs from an Encrypted Media Extensions (EME) session in Developer Tools under the Console tab"
            subtitle="Logging EME events and calls"
            component="label"
            after={
              <Switch
                checked={settings.emeInterception}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked) switchSpoofing(false);
                  switchEmeInterception(checked);
                }}
              />
            }
          >
            EME interception
          </Cell>
          <Cell
            subtitle="Inject our own license request"
            component="label"
            disabled={!settings.emeInterception}
            after={
              <Switch
                checked={settings.spoofing}
                onChange={(e) => switchSpoofing(e.target.checked)}
              />
            }
          >
            Spoofing
          </Cell>
        </Section>
        <Section header="Network" footer="Experimental feature.">
          {[
            <Cell
              subtitle="Streaming manifest URL detection"
              component="label"
              after={
                <Switch
                  checked={settings.requestInterception}
                  onChange={(e) => switchRequestInterception(e.target.checked)}
                />
              }
            >
              Request interception
            </Cell>,
          ]}
        </Section>
      </List>
    </Layout>
  );
};
