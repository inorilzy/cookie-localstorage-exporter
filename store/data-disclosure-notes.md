# Chrome Web Store Data Disclosure Notes

Use these answers only if the published extension behavior matches the current codebase.

## Single purpose

Suggested summary:

Read cookies and localStorage from the active tab after a user click, then copy the result as JSON for debugging.

## Data handling

Current code behavior:

- Reads cookies from the active tab context
- Reads `localStorage` from the active tab context
- Builds JSON locally
- Copies JSON to the clipboard locally
- Does not send data to a remote server
- Does not keep export history
- Does not run analytics

## Likely disclosure answers

- Is data collected? `No`, because the extension does not transmit captured data off device.
- Is data sold? `No`
- Is data used for creditworthiness or lending? `No`
- Is data used for personalized advertising? `No`
- Is data shared with third parties? `No`

## Permissions explanation

- `cookies`: required to read cookies for the active page
- `scripting`: required to read `localStorage` in the active page
- `activeTab`: required to operate only on the tab the user clicked from
- host permissions for `http://*/*` and `https://*/*`: required so Chrome returns cookies, including parent-domain cookies

## Reviewer notes

Suggested reviewer note:

This extension is a local debugging utility. It reads cookies and localStorage from the active tab only after the user opens the popup and clicks the capture button. No captured data is uploaded, synced, sold, or stored remotely.
