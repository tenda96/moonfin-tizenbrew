# Moonfin TizenBrew

TizenBrew application module for Moonfin Smart TV.

This repository repackages the official Moonfin Tizen `.wgt` release as a TizenBrew-compatible GitHub module.

## Install in TizenBrew

1. Install and open TizenBrew.
2. Add a GitHub module.
3. Enter:

```text
tenda96/moonfin-tizenbrew@main
```

TizenBrew stores GitHub modules internally as `gh/tenda96/moonfin-tizenbrew@main`. Do not enter `gh:tenda96/moonfin-tizenbrew`; that is not the jsDelivr path TizenBrew resolves.

Using `@main` is intentional. TizenBrew downloads GitHub modules through jsDelivr, and the unpinned path can keep stale files for longer than expected. If a test needs a completely fixed build, use a full commit SHA instead of `main`.

If TizenBrew still shows an old version, remove the module, restart TizenBrew, and add `tenda96/moonfin-tizenbrew@main` again.

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

This repository includes a TizenBrew playback diagnostic overlay for debug builds. Normal builds do not load it by default because it can interfere with Samsung remote color-key menus.

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

This module injects a small compatibility adapter and forces Moonfin's HTML5 playback path when `window.__MOONFIN_TIZENBREW__` is present. The TizenBrew profile prefers TV-side decoding through DirectPlay/DirectStream for MP4/M4V H.264 or HEVC/H.265, common AAC/MP3/AC3/EAC3 audio, and compatible WebM/VP9 media. If the browser cannot play a source directly, Jellyfin can still fall back to HLS server transcoding.

Native Samsung AVPlay remains intentionally unavailable; use the official Moonfin `.wgt` if you need the native AVPlay player.

More context is documented in:

- [Architecture](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

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
