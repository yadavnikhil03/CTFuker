if (window.top === window.self) {
  const ENABLED_KEY = 'pasteProEnabled';
  let isExtensionEnabled = true;

  let lastActiveEditable = null;

  const isEditable = (el) => {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return !['button', 'checkbox', 'file', 'hidden', 'image', 'radio', 'reset', 'submit'].includes(type);
    }
    return false;
  };

  document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (target instanceof Element && isEditable(target)) {
      lastActiveEditable = target;
    }
  }, true);

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

  window.addEventListener('keydown', async (e) => {
    if (!isExtensionEnabled) return;
    
    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.key.toLowerCase() === 'v')) {
      e.stopImmediatePropagation();
      e.stopPropagation();

      try {
        const clipboardItems = await navigator.clipboard.read();
        const hasText = clipboardItems.some(item => item.types.includes('text/plain'));
        
        if (hasText) {
          e.preventDefault(); 
          const textToPaste = await navigator.clipboard.readText();
          if (!textToPaste) return;

          let active = document.activeElement;
          
          if (!isEditable(active) && lastActiveEditable && document.body.contains(lastActiveEditable)) {
            active = lastActiveEditable;
          }

          if (isEditable(active)) {
            active.focus();
            
            const success = document.execCommand('insertText', false, textToPaste);
            
            if (!success && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
              const start = active.selectionStart || 0;
              const end = active.selectionEnd || 0;

              active.value = active.value.substring(0, start) + textToPaste + active.value.substring(end);
              
              const caret = start + textToPaste.length;
              if (typeof active.setSelectionRange === 'function') {
                active.setSelectionRange(caret, caret);
              }

              active.dispatchEvent(new Event('input', { bubbles: true }));
              active.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
      } catch (err) {
        console.error('CTFucker: Failed to read clipboard or paste', err);
      }
    }
  }, true); 

  ['copy', 'cut', 'paste'].forEach(evtType => {
    window.addEventListener(evtType, (e) => {
      if (!isExtensionEnabled) return;
      e.stopImmediatePropagation();
      e.stopPropagation();
    }, true);
  });
}
