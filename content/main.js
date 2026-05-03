if (window.top === window.self) {
  const ENABLED_KEY = 'pasteProEnabled';
  let isExtensionEnabled = true;

  const initFromStorage = () => {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([ENABLED_KEY], (result) => {
        isExtensionEnabled = result && typeof result[ENABLED_KEY] === 'boolean'
          ? result[ENABLED_KEY]
          : true;
      });
    }
  };

  if (chrome && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[ENABLED_KEY]) {
        isExtensionEnabled = changes[ENABLED_KEY].newValue !== false;
      }
    });
  }

  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (!message || message.type !== 'PASTEPRO_SET_ENABLED') return;
      isExtensionEnabled = message.enabled !== false;
    });
  }

  initFromStorage();

  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('content/inject.js');
  (document.head || document.documentElement).appendChild(s);
  s.onload = () => s.remove();

  window.addEventListener('keydown', (e) => {
    if (!isExtensionEnabled) return;
    if ((e.ctrlKey || e.metaKey) && ['c', 'x'].includes(e.key.toLowerCase())) {
      e.stopImmediatePropagation();
    }
  }, true);

  ['copy', 'cut', 'contextmenu'].forEach(evtType => {
    window.addEventListener(evtType, (e) => {
      if (!isExtensionEnabled) return;
      e.stopImmediatePropagation();
    }, true);
  });
}
