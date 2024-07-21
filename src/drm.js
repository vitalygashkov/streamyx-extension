(async () => {
  const b64 = {
    decode: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
    encode: (b) => btoa(String.fromCharCode(...new Uint8Array(b))),
  };

  function arrayBufferToHex(arrayBuffer) {
    if (typeof arrayBuffer !== 'object' || arrayBuffer === null || typeof arrayBuffer.byteLength !== 'number') {
      throw new TypeError('Expected input to be an ArrayBuffer');
    }
    var view = new Uint8Array(arrayBuffer);
    var result = '';
    var value;
    for (var i = 0; i < view.length; i++) {
      value = view[i].toString(16);
      result += value.length === 1 ? '0' + value : value;
    }
    return result;
  }

  const fnproxy = (object, func) => new Proxy(object, { apply: func });

  const proxy = (object, key, func) => Object.defineProperty(object, key, { value: fnproxy(object[key], func) });

  const POST_MESSAGE_TYPE = '38405bbb-36ef-454d-8b32-346f9564c978';

  proxy(MediaKeySession.prototype, 'generateRequest', async (_target, _this, _args) => {
    const [initDataType, initData] = _args;
    const pssh = b64.encode(initData);
    _this.initDataType = initDataType;
    _this.initData = pssh;
    if (pssh) window.postMessage({ type: POST_MESSAGE_TYPE, log: { pssh } }, '*');
    return _target.apply(_this, _args);
  });

  proxy(MediaKeySession.prototype, 'update', async (_target, _this, _args) => {
    setTimeout(async () => {
      const [message] = _args;
      _this.keyIds = [];
      const keyStatuses = Array.from(_this.keyStatuses);
      for (const [kid] of keyStatuses) _this.keyIds.push(arrayBufferToHex(kid));

      console.groupCollapsed(`[STREAMYX] Session ${_this.sessionId} update`);
      console.log(`Initialization Data Type: ${_this.initDataType}`);
      console.log(`Initialization Data (PSSH): ${_this.initData}`);
      console.log(`Key IDs: ${_this.keyIds}`);
      console.log(`Message: ${b64.encode(message)}`);
      console.groupEnd();

      for (const kid of _this.keyIds) {
        window.postMessage({ type: POST_MESSAGE_TYPE, log: { kid } }, '*');
      }
    }, 2000);
    return _target.apply(_this, _args);
  });
})();
