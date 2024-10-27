import { dirname, resolve } from 'node:path';
import { defineConfig } from 'wxt';
import arraybuffer from 'vite-plugin-arraybuffer';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: './extension',
  manifest: {
    name: 'Azot',
    permissions: ['storage', 'tabs', 'activeTab', 'clipboardWrite'],
    host_permissions: ['https://*/*'],
    web_accessible_resources: [
      { resources: ['injected.js'], matches: ['<all_urls>'] },
    ],
  },
  runner: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
    disabled: true,
  },
  modules: ['@wxt-dev/module-solid'],
  vite: () => ({
    plugins: [arraybuffer()],
    resolve: {
      alias: {
        '@azot/lib': resolve(dirname('.'), './lib'),
      },
    },
  }),
});
