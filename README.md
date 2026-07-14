# Moonfin TizenBrew

TizenBrew application module for Moonfin Smart TV.

This repository repackages the official Moonfin Tizen `.wgt` release as a TizenBrew-compatible GitHub module.

## Install in TizenBrew

1. Install and open TizenBrew.
2. Add a GitHub module.
3. Enter:

```text
tenda96/moonfin-tizenbrew
```

TizenBrew stores GitHub modules internally as `gh/tenda96/moonfin-tizenbrew`. Do not enter `gh:tenda96/moonfin-tizenbrew`; that is not the jsDelivr path TizenBrew resolves.

## Local Verification

```sh
npm run verify
```

If `node` is not on your PATH, run the same script with any local Node.js executable:

```sh
node scripts/verify-tizenbrew-module.mjs
```

The verification checks the TizenBrew manifest, local asset paths, adapter bootstrap, and the Moonfin bundle patches used to avoid native AVPlay inside TizenBrew.

## Playback Diagnostics

This module includes a temporary TizenBrew playback diagnostic overlay. It stays hidden during normal browsing and appears when playback starts or a media/network error is detected.

During a TV test, start any video and look for lines such as:

```text
playback.info
playback.source
media.src
xhr.start / xhr.done
media.error / media.waiting / media.stalled
probe.canPlayType
probe.mse
```

Press the yellow remote key to show or hide the overlay. The same log is also saved in browser storage under `moonfin_tizenbrew_diagnostics` and exposed as `window.__MOONFIN_TIZENBREW_DIAG__.dump()` when remote debugging is available.

## Compatibility

TizenBrew loads modules as web pages served from its local server. In that environment a packaged `.wgt` does not get the same Samsung native APIs as an installed Tizen app.

This module injects a small compatibility adapter and forces Moonfin's HTML5 playback path when `window.__MOONFIN_TIZENBREW__` is present. Native Samsung AVPlay remains intentionally unavailable; use the official Moonfin `.wgt` if you need the native AVPlay player.

## Update Flow

The GitHub Action downloads the latest Moonfin Tizen Regular `.wgt`, extracts it into `app/`, injects the TizenBrew helper scripts, and runs:

```sh
node scripts/patch-moonfin-bundle.mjs
```

Run the same command locally after manually replacing the contents of `app/`.

## Credits

Moonfin source project:

https://github.com/Moonfin-Client/Smart-TV

TizenBrew:

https://github.com/reisxd/TizenBrew
