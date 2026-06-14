# Chrome Web Store Listing Draft

## Store name

Cookie LocalStorage Exporter

## Summary

Copy cookies and localStorage from the active tab as JSON for debugging.

## Description

Cookie LocalStorage Exporter is a small developer tool for Chrome and Edge.

It reads cookies and `localStorage` from the active `http(s)` tab only after you open the popup and click the capture button. The result is formatted as JSON and copied to your clipboard.

What it does:

- Reads cookies for the active tab URL
- Falls back to parent-domain cookie lookup when direct URL lookup returns nothing
- Reads `localStorage` from the active page
- Copies the result as JSON
- Lets you fuzzy search captured keys in the popup
- Lets you copy an individual key or value from search results

What it does not do:

- Does not upload or sync data anywhere
- Does not save export history
- Does not read other tabs in the background
- Does not export `sessionStorage`

This extension is meant for developer debugging and session inspection. Exported JSON may contain login state or other sensitive values, so handle it carefully.

## Category suggestion

Developer Tools

## Privacy blurb

This extension reads cookies and localStorage from the active tab only after a user click. Data stays local and is copied to the clipboard on demand. No remote upload, sync, analytics, or history storage.
