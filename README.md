# RIFT — TikTok LIVE

RIFT is an autonomous boss arena controlled by TikTok LIVE gifts.

## What was added

- `stream.html` — OBS-ready wrapper around `klawf.html`.
- `bridge-server.mjs` — Node.js bridge: TikTok LIVE -> WebSocket -> RIFT.
- `package.json` — dependencies.
- `start-rift.bat` — Windows launcher.

The manual gift-test panel and viewer simulator are hidden in the OBS version. The original `klawf.html` is left intact.

## Gift mapping

- Rose / Роза -> `rose` -> 45 damage
- Meteor / Meteor Shower / Метеор -> `meteor` -> 180 damage
- Galaxy / Галактика -> `galaxy` -> 500 damage

If TikTok reports a different localized gift name, add that name to `GIFT_NAME_MAP` in `bridge-server.mjs`.

## Run on Windows

1. Install Node.js 20+.
2. Download/clone this repository.
3. Run `start-rift.bat`.
4. Enter the TikTok username of the account that is LIVE, without `@`.
5. Keep the console window open.
6. Open `http://127.0.0.1:3000/stream.html` in a browser to test.
7. In OBS add a **Browser Source** with the same URL.
8. Use 1920x1080 (or the resolution you want for the vertical scene) and leave the source running.

The TikTok connector reads public LIVE Webcast events and does not require TikTok login credentials. It is an unofficial reverse-engineering project, so TikTok protocol changes can temporarily break the connector.

## Important

The bridge connects to the creator account that is currently LIVE. The username must be the exact TikTok `uniqueId`, not the display name.
