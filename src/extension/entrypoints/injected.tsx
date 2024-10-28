declare global {
  interface MediaKeySession {
    initData?: string;
    initDataType?: string;
    messages?: Map<MediaKeyMessageType, string>;
  }
}

export default defineUnlistedScript(() => {
  const base64 = {
    parse: (s: any) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
    stringify: (b: any) => btoa(String.fromCharCode(...new Uint8Array(b))),
  };

  const send = async (data: any) => {
    window.postMessage({ type: 'drm-message', log: data }, '*');
    return new Promise<any>((resolve) => {
      window.addEventListener(
        'drm-message-response',
        (event) => resolve((event as any).detail),
        false,
      );
    });
  };

  const patchEncryptedMediaExtensions = async () => {
    const onGenerateRequest = async (
      initDataType: string,
      initData: BufferSource,
      session: MediaKeySession,
    ) => {
      session.initDataType = initDataType;
      session.initData = base64.stringify(initData);
      session.messages = new Map();
      send({
        action: 'generateRequest',
        sessionId: session.sessionId,
        initDataType,
        initData: session.initData,
      });

      console.groupCollapsed(`[azot] [${session.sessionId}] Generated request`);
      console.log(`Initialization Data Type: ${session.initDataType}`);
      console.log(`Initialization Data (PSSH): ${session.initData}`);
      console.groupEnd();
    };

    const onKeyStatusesChange = async (session: MediaKeySession) => {
      console.groupCollapsed(
        `[azot] [${session.sessionId}] Key statuses changed`,
      );
      console.log(`Initialization data type: ${session.initDataType}`);
      console.log(`Initialization data (PSSH): ${session.initData}`);
      console.log(`Keys count: ${session.keyStatuses.size}`);
      console.groupEnd();
      return;
    };

    const onMessage = async (event: Event) => {
      const { type, message, messageType } = event as MediaKeyMessageEvent;
      const session = event.target as MediaKeySession;
      if (type === 'keystatuseschange') return onKeyStatusesChange(session);
      session.messages?.set(messageType, base64.stringify(message));

      console.groupCollapsed(
        `[azot] [${session.sessionId}] New message from browser CDM: ${messageType}`,
      );
      console.log(`Initialization data type: ${session.initDataType}`);
      console.log(`Initialization data (PSSH): ${session.initData}`);
      console.log(`Message type: ${messageType}`);
      console.log(`Message: ${session.messages?.get(messageType)}`);
      console.groupEnd();

      if (['license-release', 'license-renewal'].includes(messageType)) return;
      const response = await send({
        action: messageType,
        initData: session.initData,
        initDataType: session.initDataType,
        message: session.messages?.get(messageType),
      });
      if (!response) return null;

      const challenge = base64.parse(response);

      console.groupCollapsed(
        `[azot] [${session.sessionId}] Swapping a message from CDM with ours`,
      );
      console.log(`Initialization data type: ${session.initDataType}`);
      console.log(`Initialization data (PSSH): ${session.initData}`);
      console.log(`Message type: ${messageType}`);
      console.log(
        `Message from browser CDM: ${session.messages?.get(messageType)}`,
      );
      console.log(`Message from our CDM: ${response}`);
      console.groupEnd();

      const createMessageEvent = (
        session: MediaKeySession,
        data: ArrayBuffer | Uint8Array,
        dataType: MediaKeyMessageType,
      ) => {
        class FakeMediaKeyMessageEvent {
          constructor(
            public type = 'message',
            public isTrusted = true,
            public currentTarget = session,
            public srcElement = session,
            public target = session,
            public message = ArrayBuffer.isView(data) ? data.buffer : data,
            public messageType = dataType,
          ) {}
        }
        return new FakeMediaKeyMessageEvent() as unknown as MediaKeyMessageEvent;
      };
      return createMessageEvent(session, challenge, messageType);
    };

    const onUpdate = async (
      response: BufferSource,
      session: MediaKeySession,
    ): Promise<BufferSource | undefined> => {
      const sessionId = session.sessionId;
      const message = new Uint8Array(
        ArrayBuffer.isView(response) ? response.buffer : response,
      );
      const messageBase64 = base64.stringify(message);

      console.groupCollapsed(
        `[azot] [${session.sessionId}] Update session with response`,
      );
      console.log(`Initialization data type: ${session.initDataType}`);
      console.log(`Initialization data (PSSH): ${session.initData}`);
      console.log(`Response: ${messageBase64}`);
      console.groupEnd();

      const result = await send({
        sessionId,
        action: 'update',
        initData: session.initData,
        initDataType: session.initDataType,
        message,
        messageBase64,
      });

      if (result) {
        const { keys } = result;
        console.groupCollapsed(
          `[azot] [${session.sessionId}] Received keys from our CDM`,
        );
        for (const [id, value] of keys) console.log(`${id}:${value}`);
        console.groupEnd();
      }
      return;
    };

    function interceptProperty<
      T extends Record<string, any>,
      K extends keyof T,
    >(
      object: T,
      key: K,
      handlers: {
        get?: (target: T, value: T[K]) => T[K];
        set?: (target: T, value: T[K]) => void;
        call?: (
          target: T[K],
          thisArg: T,
          argArray: Parameters<T[K]>,
        ) => ReturnType<T[K]>;
      },
    ) {
      // Get the original descriptor if it exists
      const originalDescriptor = Object.getOwnPropertyDescriptor(object, key);
      let storedValue: T[K];

      return Object.defineProperty(object, key, {
        configurable: true,
        enumerable: true,
        get: function (this: T) {
          // If there's an original getter, use it
          if (originalDescriptor?.get)
            storedValue = originalDescriptor.get.call(this);
          const result = handlers.get
            ? handlers.get(this, storedValue)
            : storedValue;
          return result;
        },
        set: function (this: T, newValue: T[K]) {
          // If the property is expected to be a function (like onmessage),
          // we can wrap it in a proxy to intercept calls
          if (typeof newValue === 'function') {
            storedValue = new Proxy(newValue, { apply: handlers.call }) as T[K];
          } else {
            storedValue = newValue;
          }
          // If there's an original setter, call it
          originalDescriptor?.set?.call(this, storedValue);
          handlers.set?.(this, storedValue);
        },
      });
    }

    function interceptMethod<T extends Record<string, any>, K extends keyof T>(
      object: T,
      method: K,
      call: (
        target: T[K],
        thisArg: T,
        argArray: Parameters<T[K]>,
      ) => ReturnType<T[K]>,
    ) {
      return Object.defineProperty(object, method, {
        value: new Proxy(object[method], { apply: call }),
      });
    }

    interceptMethod(
      MediaKeys.prototype,
      'setServerCertificate',
      (_target, _this, _args) => {
        console.log(`[azot] Setting server certificate`, _this, _args);
        return _target.apply(_this, _args);
      },
    );

    interceptMethod(
      MediaKeySession.prototype,
      'generateRequest',
      async (generateRequest, session, [initDataType, initData]) => {
        await generateRequest.apply(session, [initDataType, initData]);
        onGenerateRequest(initDataType, initData, session);
      },
    );

    interceptMethod(
      MediaKeySession.prototype,
      'addEventListener',
      (_target, _this, _args) => {
        const [type, listener, useCapture] = _args;
        const listenerWrapper: EventListenerOrEventListenerObject = async (
          event,
        ) => {
          const modifiedEvent = await onMessage(event);
          const isFn = (fn: unknown) => typeof fn === 'function';
          const handler = isFn(listener) ? listener : listener.handleEvent;
          return handler(modifiedEvent || event);
        };
        return _target.apply(_this, [type, listenerWrapper, useCapture]);
      },
    );

    interceptProperty(MediaKeySession.prototype, 'onmessage', {
      set: (target, value) => {
        console.log('[azot] MediaKeySession.onmessage set:', value);
      },
      get: (target, value) => {
        console.log('[azot] MediaKeySession.onmessage get');
        return value;
      },
      call: async (_target, _this, [event]) => {
        const modifiedEvent = await onMessage(event);
        return _target?.apply(_this, [modifiedEvent || event]);
      },
    });

    interceptMethod(
      MediaKeySession.prototype,
      'update',
      async (_target, _this, [response]) => {
        const modifiedResponse = await onUpdate(response, _this);
        return _target.apply(_this, [modifiedResponse || response]);
      },
    );
  };

  patchEncryptedMediaExtensions();

  console.log('[azot] Injection finished');
});

const patchFetch = () => {
  if (typeof fetch === 'function') {
    const originalFetch = fetch;
    const cachedFetch = async function fetch(
      resource: URL | RequestInfo,
      options?: RequestInit,
    ) {
      const isPOST = options?.method === 'POST';
      if (!isPOST) return originalFetch(resource, options);
      let url: string;
      if (typeof resource === 'string' && !options) {
        url = resource;
      } else {
        const request = new Request(resource, options);
        url = request.url;
      }
      const response = await originalFetch(resource, options);
      console.log(`[azot] Fetched ${response.url}`);
      if (url.includes('license')) {
        // const clone = response.clone();
        // const text = await clone.text();
        // console.log(text);
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

const cloneCurrentPageIntoFrame = () => {
  const FRAME_ID = 'azot';
  console.log('[azot] Cloning page into iframe...');
  const added = document.body.querySelector(`#${FRAME_ID}`);
  if (added) return;
  // if (added) added.remove();
  const originalHtmlContent = document.documentElement.innerHTML;
  const frame = document.createElement('iframe');
  if (frame.contentWindow) Object.assign(window, frame.contentWindow);
  frame.setAttribute('id', FRAME_ID);
  frame.setAttribute('style', 'display: none;');
  document.body.appendChild(frame);
  let frameDocument = ('document' in frame
    ? frame.document
    : frame) as unknown as Document;
  if (frame.contentDocument) frameDocument = frame.contentDocument;
  else if (frame.contentWindow) frameDocument = frame.contentWindow.document;
  frameDocument.open();
  frameDocument.writeln(originalHtmlContent);
  frameDocument.close();
  return frame;
};
