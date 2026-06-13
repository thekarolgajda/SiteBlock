document.getElementById("manageBtn").addEventListener("click", () => {
  browser.browserAction.openPopup();
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
