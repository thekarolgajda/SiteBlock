# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SiteBlock is a Firefox browser extension (Manifest V2) that blocks user-configured websites. No build step, no dependencies — plain HTML/CSS/JS loaded directly by Firefox.

## Loading / reloading the extension

There is no build. To test changes:

1. Open `about:debugging#/runtime/this-firefox` in Firefox
2. Click **Load Temporary Add-on** and select `manifest.json` (first load only)
3. After any file change, click **Reload** on the SiteBlock entry

The toolbar icon is hidden by default — find it under the puzzle-piece (🧩) Extensions menu and pin it.

To inspect errors in the background script: **Inspect** button on `about:debugging`.
To inspect the popup: right-click the toolbar icon → **Inspect Popup**.

## Architecture

```
manifest.json          Extension manifest (MV2, persistent background)
background.js          Service worker equivalent — intercepts all main_frame requests
popup/                 Toolbar popup (add/edit/remove blocked sites)
blocked/               Full-page redirect target shown when a site is blocked
icons/                 PNG icons (regenerate with Pillow — see below)
PRODUCT.md             Design strategy: users, personality, principles
```

### Data flow

1. **Storage** — `browser.storage.local` holds one key: `blockedSites`, an array of site objects `{ host: string, schedule: null | { days: number[], startTime: string, endTime: string } }`. `schedule: null` means always block.
2. **background.js** loads the list on startup and keeps it in memory. `browser.storage.onChanged` keeps it in sync when the popup writes. On every `main_frame` request, `isBlocked()` checks hostname + active schedule, and redirects to the blocked page if matched.
3. **popup/popup.js** reads/writes storage directly via `getSites()` / `saveSites()`. The list is fully re-rendered on every change (`renderList()`). Inline edit panels are injected into `<li>` elements by `openEditPanel()`.
4. **blocked/blocked.js** reads the original URL from `?blocked=` query param and displays the hostname.

### Schedule logic

`isActiveNow(schedule)` in `background.js` handles overnight ranges (e.g. 22:00–06:00) by checking `start > end`. Days use JS `Date.getDay()` values (0 = Sunday).

### Migration

Old string-array format (`["reddit.com"]`) is silently migrated to object format by `migrateSite()` in `popup.js` on every read. `background.js` also handles both formats in `isBlocked()`.

## Permissions

- `webRequest` + `webRequestBlocking` — required for synchronous redirect in `onBeforeRequest`
- `storage` — blocklist persistence
- `tabs` — required for any `browser.tabs.*` calls
- `<all_urls>` — needed to intercept requests to any domain

Adding new permissions requires updating `manifest.json` and reloading the extension.

## Design system

Both surfaces (popup and blocked page) share a single visual language:

- **Font:** Plus Jakarta Sans (Google Fonts) for UI; `ui-monospace` for hostnames
- **Palette (OKLCH):**
  - Background: `oklch(96% 0.01 72)` — warm cream
  - Accent: `oklch(62% 0.07 48)` — terracotta; used for buttons, rings, active states, focus borders
  - Text primary: `oklch(20% 0.015 52)` — dark warm brown
  - Text secondary: `oklch(48% 0.015 55)` — muted warm
- **Mark:** concentric rings SVG in terracotta — used in popup header, blocked page, and toolbar icon
- **Blocked page background:** `oklch(91% 0.055 68)` with animated organic blob shapes

### Regenerating icons

No source script exists. Recreate with Python + Pillow:

```python
from PIL import Image, ImageDraw

def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    r = size / 2 - 1
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(245, 234, 220, 255))
    cr = size * 0.14
    draw.ellipse([cx-cr, cy-cr, cx+cr, cy+cr], fill=(172, 113, 85, 255))
    r2 = size * 0.30
    draw.ellipse([cx-r2, cy-r2, cx+r2, cy+r2], outline=(172, 113, 85, 110), width=max(1, round(size*0.04)))
    r3 = size * 0.43
    draw.ellipse([cx-r3, cy-r3, cx+r3, cy+r3], outline=(172, 113, 85, 50), width=max(1, round(size*0.025)))
    return img

draw_icon(48).save("icons/icon-48.png")
draw_icon(96).save("icons/icon-96.png")
```

## CSP gotcha

Firefox enforces Content Security Policy on extension pages — inline `onclick` attributes are blocked. All event handlers must be wired in `.js` files via `addEventListener`. To open the popup programmatically, call `browser.browserAction.openPopup()` from a JS event listener (not inline). Note: `openPopup()` is **desktop-only** — it throws on Firefox for Android. `blocked/blocked.js` feature-detects it and falls back to opening `popup/popup.html` as a tab (works on both). Popup CSS uses `width: min(360px, 100vw)` so it renders on phones and as a full tab.

## Packaging for AMO (addons.mozilla.org)

Build the upload zip from the repo root (manifest.json must be at the zip root, dev files excluded):

```
zip -r siteblock-<version>.zip manifest.json background.js blocked popup icons -x "*.DS_Store"
```

- **Bump `manifest.json` `version` on every upload** — AMO rejects a re-used version number.
- **`data_collection_permissions` is required** (in `browser_specific_settings.gecko`). SiteBlock collects nothing, so it declares `{ "required": ["none"] }`. AMO's UI consent step must match: "Does not collect data".
- No source upload needed — plain HTML/CSS/JS, no build/minification.
- `STORE_LISTING.md` holds paste-ready listing copy + reviewer permission justifications; keep it in sync with releases.
- To ship on Firefox for Android, tick "compatible with Firefox for Android" during submission.
