// SiteBlock — Chrome MV3 background service worker.
//
// Chrome MV3 removed blocking webRequest, so blocking is done with
// declarativeNetRequest (DNR) redirect rules instead of intercepting each
// request in JS (that is what the Firefox MV2 background.js does). Rules are
// recomputed and pushed to the dynamic rule set whenever the blocklist changes,
// on startup, and — only while at least one scheduled site exists — once a
// minute so time-based schedules switch on and off.
//
// Always-block sites become permanent rules; a scheduled site contributes a
// rule only while its window is active (see isActiveNow). Logic mirrors the
// Firefox build, just expressed declaratively.

const ALARM_NAME = "siteblock-schedule-tick";

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

// Old string-array format ("reddit.com") → object format.
function normalizeSite(site) {
  return typeof site === "string" ? { host: site, schedule: null } : site;
}

// RE2-escape a host for use inside a regexFilter (hosts are validated to
// [a-z0-9.-] in the popup, so only "." and "-" really matter, but escape the
// full metacharacter set to be safe).
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

// Build the DNR rule set from the current blocklist. Each blocked host that is
// active right now gets a main_frame redirect rule.
//
// The regexFilter both matches the host (and any subdomain, mirroring Firefox's
// `host === h || host.endsWith("." + h)`) and captures the full requested host
// in group 1 so the blocked page can show it. requestDomains is intentionally
// not used: it does not reliably match subdomains. The whole URL is matched so
// regexSubstitution replaces it entirely — DNR appends any unmatched remainder,
// which would otherwise tack the original path onto the ?blocked= value. Host
// characters are URL-safe, so no extra encoding is needed.
function buildRules(sites) {
  const blockedPage = chrome.runtime.getURL("blocked/blocked.html");
  const rules = [];
  let id = 1;
  for (const raw of sites) {
    const site = normalizeSite(raw);
    if (!site.host || !isActiveNow(site.schedule)) continue;
    const h = escapeRegex(site.host);
    rules.push({
      id: id++,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { regexSubstitution: `${blockedPage}?blocked=\\1` },
      },
      condition: {
        regexFilter: `^https?://((?:[^/]*\\.)?${h})(?::\\d+)?(?:[/?#].*)?$`,
        resourceTypes: ["main_frame"],
      },
    });
  }
  return rules;
}

async function recomputeRules() {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  const newRules = buildRules(blockedSites);

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules: newRules,
  });

  // Keep the per-minute tick running only while a scheduled site exists —
  // always-block users get zero background wakeups.
  const hasSchedule = blockedSites.map(normalizeSite).some(s => s.schedule);
  if (hasSchedule) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  } else {
    chrome.alarms.clear(ALARM_NAME);
  }
}

chrome.runtime.onInstalled.addListener(recomputeRules);
chrome.runtime.onStartup.addListener(recomputeRules);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blockedSites) recomputeRules();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) recomputeRules();
});

// The worker can be spun up without onStartup firing (e.g. after idle
// shutdown), so recompute on first load too.
recomputeRules();
