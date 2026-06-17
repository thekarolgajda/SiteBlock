// Chrome compat: alias the promise-based `browser.*` namespace to `chrome.*`.
// Firefox provides `browser` natively (no-op there); Chrome MV3's `chrome.*`
// APIs already return promises, so this is all the shared code needs.
if (typeof browser === "undefined") globalThis.browser = chrome;

document.getElementById("manageBtn").addEventListener("click", async () => {
  // browserAction.openPopup() is desktop-only — Firefox for Android doesn't
  // support it. Try the native popup, and fall back to opening the management
  // UI as a regular tab (works on both desktop and Android).
  try {
    if (browser.browserAction && browser.browserAction.openPopup) {
      await browser.browserAction.openPopup();
      return;
    }
  } catch {
    // openPopup can reject (e.g. no user gesture on some platforms) — fall through.
  }
  browser.tabs.create({ url: browser.runtime.getURL("popup/popup.html") });
});

const params = new URLSearchParams(window.location.search);
const blocked = params.get("blocked");

if (blocked) {
  try {
    const host = new URL(decodeURIComponent(blocked)).hostname;
    document.getElementById("siteName").textContent = host;
  } catch {
    document.getElementById("siteName").textContent = blocked;
  }
}
