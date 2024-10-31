declare global {
  interface Window {
    MPD_LIST: Map<string, string>;
  }
}

export default defineUnlistedScript(() => {
  window.MPD_LIST = new Map();

  const parsePssh = (text: string, url: string) => {
    const isXml = text.startsWith('<?xml') || text.startsWith('<MPD');
    if (!isXml) return;
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

        // Detect manifest URL and parse PSSH from response
        const isManifest = url.pathname.endsWith('.mpd');
        if (isManifest) {
          response
            .clone()
            .text()
            .then((text) => parsePssh(text, response.url));
        }

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

  const patchXmlHttpRequest = () => {
    class PatchedXHR extends XMLHttpRequest {
      constructor() {
        super();
        this.addEventListener('load', this.#handleResponse.bind(this));
      }

      #handleResponse() {
        const url = new URL(this.responseURL);
        const isManifest = url.pathname.endsWith('.mpd');
        if (isManifest) {
          parsePssh(this.responseText, this.responseURL);
        }
      }
    }
    window.XMLHttpRequest = PatchedXHR;
  };

  const patchBlobFetch = () => {
    window.addEventListener('message', (event) => {
      if (
        event.data &&
        event.data.jsonrpc === '2.0' &&
        event.data.method === 'intercepted_response'
      ) {
        const { url, text, headers } = event.data.params;
        parsePssh(text, url);
      }
    });

    // Monitor for worker creation
    const originalWorker = window.Worker;
    window.Worker = function (scriptUrl, options) {
      const worker = new originalWorker(scriptUrl, options);

      worker.addEventListener('message', (event) => {
        if (
          event.data &&
          event.data.jsonrpc === '2.0' &&
          event.data.method === 'intercepted_response'
        ) {
          const { url, text, headers } = event.data.params;
          parsePssh(text, url);
        }
      });

      return worker;
    };

    // Store original blob URL creation
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
      if (
        blob instanceof Blob &&
        (blob.type.includes('javascript') ||
          blob.type.includes('application/x-javascript') ||
          blob.type === 'text/javascript' ||
          blob.type === '')
      ) {
        // Convert blob to text synchronously
        const xhr = new XMLHttpRequest();
        const url = originalCreateObjectURL(blob);
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
        xhr.open('GET', url, false);
        xhr.send();
        const blobDataBuffer = Uint8Array.from(xhr.response, (c) =>
          c.charCodeAt(0),
        );
        const sourceCode = new TextDecoder().decode(blobDataBuffer);
        const injectionCode = `
          const originalFetch = fetch;
          fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);

            const size = response.headers.get('content-length');
            const MAX_SIZE = 1024 * 1024 * 1; // 1 MB
            const isSizeOk = Number(size) < MAX_SIZE;
            if (size && !isSizeOk) return response;

            const type = response.headers.get('content-type');
            const isTypeOk = type?.includes('xml') || type?.includes('dash');
            if (!isTypeOk) return response;

            const clone = response.clone();
            clone.text().then(text => {
              const message = {
                jsonrpc: '2.0',
                method: 'intercepted_response',
                params: {
                  url: response.url,
                  text,
                  headers: Object.fromEntries(response.headers.entries())
                },
                id: Date.now()
              };
              if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
                self.postMessage(message);
              } else {
                window.postMessage(message, '*');
              }
            });
            return response;
          };
        `;
        const modifiedCode = injectionCode + '\n' + sourceCode;
        const modifiedBlob = new Blob([modifiedCode], { type: blob.type });
        return originalCreateObjectURL.call(URL, modifiedBlob);
      }
      return originalCreateObjectURL.call(URL, blob);
    };
  };

  patchFetch();
  patchXmlHttpRequest();
  patchBlobFetch();

  console.log('[azot] Request interception added');
});
