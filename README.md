# SiteBlock

A Firefox extension that blocks websites you're trying to avoid. No accounts, no cloud sync, no tracking — your block list lives entirely on your device.

## Features

- Block any site permanently or on a schedule (specific days and time ranges)
- Overnight schedules work (e.g. 22:00–06:00)
- Edit or remove sites inline from the popup
- Calm, non-punishing blocked page — because you made this choice for a reason

## Installation

SiteBlock isn't on the Firefox Add-ons store yet. To install it manually:

1. Download or clone this repo
2. Open `about:debugging#/runtime/this-firefox` in Firefox
3. Click **Load Temporary Add-on** and select `manifest.json`
4. Find SiteBlock under the puzzle-piece Extensions menu and pin it to your toolbar

> Note: temporary add-ons are removed when Firefox restarts. Permanent installation requires AMO listing (coming soon).

## Usage

Click the SiteBlock icon in your toolbar to open the popup.

- **Add a site:** type a domain (e.g. `reddit.com`) and click Block
- **Schedule:** expand the Schedule toggle to block only on certain days and times
- **Edit or remove:** hover a site in the list to see the edit and remove buttons

## Privacy

Everything stays on your device. SiteBlock uses `browser.storage.local` — no data is sent anywhere, ever.

## License

GPL-3.0
