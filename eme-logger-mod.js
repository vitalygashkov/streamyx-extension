(async () => {
  const b64 = {
    decode: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
    encode: (b) => btoa(String.fromCharCode(...new Uint8Array(b))),
  };

  const fnproxy = (object, func) => new Proxy(object, { apply: func });

  const proxy = (object, key, func) =>
    Object.defineProperty(object, key, {
      value: fnproxy(object[key], func),
    });

  proxy(MediaKeySession.prototype, 'generateRequest', async (_target, _this, _args) => {
    const [initDataType, initData] = _args;
    const pssh = b64.encode(initData);
    console.groupCollapsed(`PSSH: ${pssh}`);
    console.trace();
    console.groupEnd();
    if (pssh) window.postMessage({ type: '38405bbb-36ef-454d-8b32-346f9564c978', log: pssh }, '*');
    return _target.apply(_this, _args);
  });

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

  proxy(MediaKeySession.prototype, 'update', async (_target, _this, _args) => {
    setTimeout(() => {
      const statuses = Array.from(_this.keyStatuses);
      for (const [kidBuffer, state] of statuses) {
        const kid = arrayBufferToHex(kidBuffer);
        console.log(`KID:STATE -> ${kid}:${state}`);
      }
    }, 3000);
    return _target.apply(_this, _args);
  });
})();
