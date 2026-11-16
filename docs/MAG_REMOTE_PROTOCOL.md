# How the app talks to MAG boxes

The app uses the same protocol as Infomir's official **MAGic Remote** app on
Linux-based MAG set-top boxes (MAG250/254/256/322/324/349/351/4xx/5xx with the
Infomir embedded portal). The protocol details come from
[rgerganov/magic-remote](https://github.com/rgerganov/magic-remote) (MIT), an
open-source re-implementation of the official app.

## On the box

`Settings → System settings → Remote control` → enable **Use remote control**.
"Device name" and "Password" on that screen are not used by this protocol.

## Discovery

With remote control enabled, the box listens on **TCP port 40611**. The app
reads the phone's Wi-Fi IP (via `@react-native-community/netinfo`) and tries
that port on every address in the same /24 network, 32 at a time
(`src/services/DeviceDiscoveryService.ts`). Anything that accepts the
connection is listed as a MAG box. You can also enter the box's IP manually.

On iPhone, the first scan triggers the iOS **Local Network** permission prompt.
Scans fail until you tap Allow, so scan again after allowing it.

## Pairing (once per box)

1. The app opens a TCP connection and sends `pairing-req` with a random device id
   that stays the same for this phone.
2. The TV shows a **6-digit code**.
3. The user types it in; the app sends `pairing-complete`, encrypted with that code.
4. The app checks the code by opening a session (below). The code is saved with
   the device and acts as the encryption key from then on.

## Session and keys

- Messages: `00 00 00 01 <len lo> <len hi>` + 32-character ASCII command + body.
- Bodies are short JSON strings encrypted with AES-128-CFB (128-bit segments).
  Key = first 16 bytes of `SHA1(pairingCode + fixed salt)`, fixed IV.
- Session: `connect-req` → the box replies (encrypted) → `ping-req`.
- Buttons: `rc-code-req` with an `rc_code` (`src/services/magKeyCodes.ts`).
- Text: `msg-rc-kb-key-req`, one message per character.
- The app pings every 15 s and reopens the socket automatically if the box
  drops it.

## Buttons

Only buttons with a verified rc code are sent: navigation, OK, Back,
Home/Menu, Info, play/pause, rewind, fast-forward, volume, mute, channel,
digits, F1–F4 (red/green/yellow/blue), Power and TV. The other buttons on the
remote screen (Exit, Stop, Prev/Next, Rec, Settings, Audio, Subtitles,
Favourites, Portal, USB) are shown dimmed because their codes are unknown.
Their codes can be added to `magKeyCodes.ts` once confirmed on a real box.

## Not covered

- Android-based MAG boxes (e.g. MAG 425A) are not known to use this protocol.

## Tests

`npm test` runs:
- `__tests__/magProtocol.test.ts`: every message type compared byte for byte
  with output from the reference Python implementation.
- `__tests__/MAGService.integration.test.ts`: the real `MAGService` against a
  fake MAG box on localhost (pairing, wrong code, keys, text, reconnect).
