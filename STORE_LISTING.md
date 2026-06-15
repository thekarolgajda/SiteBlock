# SiteBlock AMO Store Listing

Copy/paste source for the addons.mozilla.org submission. Keep in sync with each release.
Each section below the `---` is the literal text to paste. No Markdown blockquotes to strip.

---

## Name

SiteBlock

---

## Summary

Block the websites that pull you away from what matters. Add a site, optionally set a schedule, and SiteBlock gently redirects you to a calm pause page instead of the rabbit hole. Your blocklist stays on your device. Nothing is ever collected or sent anywhere.

_(244 / 250 character limit)_

---

## Description

> AMO's description field is plain text: it shows HTML tags literally and does not
> render Markdown, but it DOES preserve the newlines and blank lines you paste.
> So paste the plain text below exactly as-is. Copy it from this raw file (or the
> code block), NOT from a rendered Markdown preview, since rendering collapses the
> blank-line spacing, which was the original problem.

### Paste this (plain text)

```
A quiet anchor for your attention.

SiteBlock blocks the sites you've decided to step away from, not as a punishment but as a promise you make to yourself. When you try to visit a blocked site, you land on a calm, warm pause page instead of the endless scroll.

How it works

• Click the toolbar icon and add any site you want to block (e.g. reddit.com).
• Optionally set a schedule: block a site only during work hours, or only on weekdays. Leave the schedule off to block it always.
• Edit or remove blocked sites anytime from the same popup.
• Overnight ranges work too (e.g. block from 10pm to 6am).

The pause is the point

The blocked page isn't a dead end. It's a breath between impulse and action, a moment to remember what you actually sat down to do, and return to it.

Your privacy is absolute

SiteBlock collects nothing. Your blocklist is stored only in your browser's local storage and never leaves your device. There are no accounts, no analytics, no tracking, and no network requests of any kind.

Built to be simple, warm, and out of your way.
```

---

## Categories

- Primary: Productivity
- Secondary: Privacy & Security

---

## Tags

focus, productivity, website blocker, distraction, screen time, self-control

---

## Data collection (AMO consent step)

Select: Does not collect data

Matches the manifest declaration `data_collection_permissions: { required: ["none"] }`.

---

## Notes to reviewer

SiteBlock is a website blocker. The user adds hostnames they want blocked; the extension redirects matching main_frame requests to a local blocked page.

Why each permission is needed:
- webRequest + webRequestBlocking: to intercept top-level navigations in onBeforeRequest and synchronously redirect blocked sites to the extension's own blocked page. This is the core function.
- <all_urls>: the user can block any domain they choose, so the request listener must be able to match requests to any host. No host data is ever read, stored, or transmitted; only the hostname is compared against the user's local blocklist.
- storage: to persist the user's blocklist (browser.storage.local).
- tabs: used for browser.tabs calls in the popup UI.

Data collection: None. No network requests are made by the extension. The blocklist lives only in browser.storage.local. This matches the data_collection_permissions: { required: ["none"] } declaration in the manifest.

Source: Plain HTML/CSS/JS, Manifest V2, no build step and no third-party libraries. The uploaded package is the complete, unminified source.

---

## Release notes (1.0.3)

Declared the add-on ID in the manifest. No user-facing changes.

---

## Submission checklist

- [ ] Upload latest siteblock-1.0.3.zip
- [ ] Mark compatible with Firefox for Android if shipping mobile
- [ ] Data collection: Does not collect data
- [ ] Source upload: No (no build step / not minified)
- [ ] Paste reviewer notes above
