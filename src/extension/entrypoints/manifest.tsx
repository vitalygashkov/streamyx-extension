declare global {
  interface Window {
    MPD_LIST: Map<string, string>;
  }
}

export default defineUnlistedScript(() => {
  window.MPD_LIST = new Map();

  const parsePssh = (text: string, url: string) => {
    const parser = new DOMParser();
    const mpd = parser.parseFromString(text, 'text/xml');
    const contentProtectionList = mpd.querySelectorAll(
      'ContentProtection[schemeIdUri="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"]',
    );
    for (const contentProtection of contentProtectionList) {
      const children = Array.from(contentProtection.children);
      for (const child of children) {
        if (child.nodeName === 'cenc:pssh') {
          const pssh = child.textContent;
          if (!pssh) continue;
          window.MPD_LIST.set(pssh, url);
        }
      }
    }
  };

  window.addEventListener('message', (event) => {
    const isResponse = event.data.method === 'response';
    if (!isResponse) return;
    const { url, headers, text } = event.data.params;
    parsePssh(text, url);
  });
});
