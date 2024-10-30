declare global {
  interface Window {
    MPD_LIST: Map<string, string>;
  }
}

export default defineUnlistedScript(() => {
  window.MPD_LIST = new Map();

  const parsePssh = async (response: Response) => {
    const clone = response.clone();
    const text = await clone.text();
    const isXml = text.startsWith('<?xml') || text.startsWith('<MPD');
    if (!isXml) return;
    const parser = new DOMParser();
    const mpd = parser.parseFromString(text, 'application/xml');
    const contentProtectionList = mpd.querySelectorAll(
      'ContentProtection[schemeIdUri="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"]',
    );
    for (const contentProtection of contentProtectionList) {
      const children = Array.from(contentProtection.children);
      for (const child of children) {
        if (child.nodeName === 'cenc:pssh') {
          const pssh = child.textContent;
          if (!pssh) continue;
          window.MPD_LIST.set(pssh, response.url);
        }
      }
    }
  };

  const patchFetch = () => {
    if (typeof fetch === 'function') {
      const originalFetch = fetch;
      const cachedFetch = async function fetch(
        resource: URL | RequestInfo,
        options?: RequestInit,
      ) {
        let url: URL;
        if (typeof resource === 'string' && !options) {
          url = new URL(resource);
        } else {
          const request = new Request(resource, options);
          url = new URL(request.url);
        }
        const response = await originalFetch(resource, options);
        console.log(`[azot] Fetched ${response.url}`);

        // Detect manifest URL and parse PSSH from response
        const isManifest = url.pathname.endsWith('.mpd');
        if (isManifest) parsePssh(response);

        return response;
      };
      Object.assign(cachedFetch, originalFetch);
      try {
        // eslint-disable-next-line no-global-assign
        fetch = cachedFetch;
      } catch (error1) {
        try {
          globalThis.fetch = cachedFetch;
        } catch (error2) {
          console.warn(
            'Azot was unable to patch the fetch() function in this environment. ',
          );
        }
      }
    }
  };

  patchFetch();

  console.log('[azot] Fetch interception added');
});
