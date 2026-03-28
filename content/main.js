
// Skip iframes/sandboxed frames and run only in the top page.
if (window.top === window.self) {
  const ENABLED_KEY = 'pasteProEnabled';
  let isExtensionEnabled = true;

  // Track the last focused editable element
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

  // Handle keyboard shortcut (Ctrl+V / Cmd+V)
  window.addEventListener('keydown', async (e) => {
    if (!isExtensionEnabled) return;
    
    // Intercept Ctrl+V or Cmd+V
    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.key.toLowerCase() === 'v')) {
      // Very aggressively stop the website from seeing the Ctrl+V keydown (bypasses anti-cheat)
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();

      try {
        const textToPaste = await navigator.clipboard.readText();
        if (!textToPaste) return;

        let active = document.activeElement;
        
        // If current active is not editable but we saved one, fallback to the last saved one
        if (!isEditable(active) && lastActiveEditable && document.body.contains(lastActiveEditable)) {
          active = lastActiveEditable;
        }

        if (isEditable(active)) {
          active.focus();
          
          // Try execCommand first, as it mimics native typing which plays nicely with code editors (CodeMirror, Monaco, React, etc.)
          const success = document.execCommand('insertText', false, textToPaste);
          
          // Fallback for strict basic inputs if execCommand fails
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
      } catch (err) {
        console.error('CTFucker: Failed to read clipboard or paste', err);
      }
    }
  }, true); // use capture phase to trigger before website scripts do
}
