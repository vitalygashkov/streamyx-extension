import { appStorage } from '@/utils/storage';

const inject = async (script: string) => {
  return new Promise((resolve) => {
    const element = document.createElement('script');
    element.type = 'text/javascript';
    element.src = chrome.runtime.getURL(script);
    element.onload = function () {
      element.remove();
      resolve(true);
    };
    (document.head || document.documentElement).appendChild(element);
  });
};

export default defineContentScript({
  matches: ['https://*/*'],
  runAt: 'document_start',
  allFrames: true,
  async main() {
    // Checking if interception enabled
    const enabled = await appStorage.interceptionEnabled.getValue();
    if (enabled) console.log(`[azot] Injecting...`);
    else return console.log(`[azot] Interception disabled`);

    // Injecting script into current page
    inject('injected.js');

    // Listen for event from injected script
    window.addEventListener(
      'message',
      (event) => {
        if (event.source != window) return;
        if (event.data.type !== 'drm-message') return;
        if (!event.data.log) return;
        chrome.runtime.sendMessage(event.data.log).then((response) => {
          window.dispatchEvent(
            new CustomEvent('drm-message-response', { detail: response }),
          );
        });
      },
      false,
    );
  },
});
