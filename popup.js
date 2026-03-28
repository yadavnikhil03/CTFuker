const ENABLED_KEY = "pasteProEnabled";

function setToggleText(toggleTextEl, enabled) {
  toggleTextEl.textContent = enabled ? "ON" : "OFF";
}

function setChip(chipEl, enabled) {
  chipEl.textContent = enabled ? "Enabled" : "Disabled";
  chipEl.classList.remove("on", "off");
  chipEl.classList.add(enabled ? "on" : "off");
}

async function applyToActiveTab(enabled) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || typeof tab.id !== "number") {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "PASTEPRO_SET_ENABLED",
      enabled
    });
  } catch (err) {
    // If the tab doesn't have the content script running yet
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("enable-toggle");
  const toggleText = document.getElementById("toggle-text");
  const statusChip = document.getElementById("status-chip");

  if (!toggle || !toggleText || !statusChip) {
    return;
  }

  chrome.storage.local.get([ENABLED_KEY], (result) => {
    const enabled = result && typeof result[ENABLED_KEY] === "boolean"
      ? result[ENABLED_KEY]
      : true;

    toggle.checked = enabled;
    setToggleText(toggleText, enabled);
    setChip(statusChip, enabled);
  });

  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ [ENABLED_KEY]: enabled }, () => {
      setToggleText(toggleText, enabled);
      setChip(statusChip, enabled);
      applyToActiveTab(enabled).catch(() => {
      });
    });
  });
});
