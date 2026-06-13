const BLOCKED_PAGE = browser.runtime.getURL("blocked/blocked.html");

let blockedSites = [];

// schedule = null → always block
// schedule = { days: [1..5], startTime: "09:00", endTime: "18:00" }
function isActiveNow(schedule) {
  if (!schedule) return true;
  const now = new Date();
  const day = now.getDay();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (!schedule.days.includes(day)) return false;
  const { startTime: s, endTime: e } = schedule;
  return s <= e ? hhmm >= s && hhmm < e : hhmm >= s || hhmm < e;
}

function isBlocked(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return blockedSites.some(site => {
      const siteHost = typeof site === "string" ? site : site.host;
      const schedule = typeof site === "object" ? site.schedule : null;
      const match = host === siteHost || host.endsWith("." + siteHost);
      return match && isActiveNow(schedule);
    });
  } catch {
    return false;
  }
}

function loadBlockedSites() {
  browser.storage.local.get("blockedSites").then(r => {
    blockedSites = r.blockedSites || [];
  });
}

browser.storage.onChanged.addListener(changes => {
  if (changes.blockedSites) blockedSites = changes.blockedSites.newValue || [];
});

browser.webRequest.onBeforeRequest.addListener(
  details => {
    if (details.url.startsWith(BLOCKED_PAGE)) return {};
    if (isBlocked(details.url)) {
      return { redirectUrl: `${BLOCKED_PAGE}?blocked=${encodeURIComponent(details.url)}` };
    }
    return {};
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["blocking"]
);

loadBlockedSites();
