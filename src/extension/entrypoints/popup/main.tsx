import { render } from 'solid-js/web';
import { Route, Router } from '@solidjs/router';

import './styles.css';
import { Dashboard } from './routes/dashboard';
import { Clients } from './routes/clients';
import { Keys } from './routes/keys';
import { Settings } from './routes/settings';

render(
  () => (
    <Router base="/popup.html">
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/keys" component={Keys} />
      <Route path="/settings" component={Settings} />
    </Router>
  ),
  document.getElementById('root')!,
);
