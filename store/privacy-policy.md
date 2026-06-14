# Privacy Policy

Last updated: June 14, 2026

Cookie LocalStorage Exporter reads cookies and `localStorage` from the active browser tab only after the user clicks the extension popup and starts a capture.

## What the extension accesses

- The active tab URL and title
- Cookies associated with the active tab
- `localStorage` entries available to the active tab page

## What the extension does with that data

- Builds a JSON payload locally in the browser
- Copies the JSON to the user's clipboard when the user clicks the copy button
- Shows counts and search results locally inside the popup

## What the extension does not do

- Does not send captured data to any remote server
- Does not upload, sync, sell, or share captured data
- Does not store export history
- Does not read background tabs
- Does not analyze page content beyond reading cookies and `localStorage`

## Permissions

The extension uses:

- `activeTab` to inspect the current tab the user clicked from
- `scripting` to read `localStorage` from the active page
- `cookies` to read cookies related to the active page
- host permissions for `http://*/*` and `https://*/*` so Chrome can return cookies, including parent-domain cookies

## Data retention

Captured data stays on the user's machine. The extension does not keep a server-side copy and does not create an internal history database.

## User responsibility

Exported JSON may include authentication tokens, session identifiers, and account data. Users should treat the copied output as sensitive.

## Contact

Publisher contact information should be provided in the Chrome Web Store listing.
