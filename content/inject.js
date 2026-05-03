(function () {
  const _origAEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'paste' && typeof listener === 'function') {
      const wrapped = function (e) {
        try {
          Object.defineProperty(e, 'preventDefault', {
            configurable: true,
            value: function () {},
          });
        } catch (_) {}
        return listener.call(this, e);
      };
      return _origAEL.call(this, type, wrapped, options);
    }
    return _origAEL.call(this, type, listener, options);
  };
})();
