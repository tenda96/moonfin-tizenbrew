# Moonfin TizenBrew Architecture

This repository publishes Moonfin Smart TV as a TizenBrew GitHub module. It does not replace the official Moonfin project; it repackages the official Tizen `.wgt` build and adds the minimum compatibility code needed for TizenBrew.

## How TizenBrew loads the module

TizenBrew resolves GitHub modules through jsDelivr. When a user enters:

```text
tenda96/moonfin-tizenbrew@main
```

TizenBrew loads:

```text
https://cdn.jsdelivr.net/gh/tenda96/moonfin-tizenbrew@main/package.json
```

The module manifest points to:

```text
app/index.html
```

TizenBrew then serves the app through its local proxy at `http://127.0.0.1:8081/module/...`. The module should keep `appPath` simple and query-free because that path is used by TizenBrew's launch flow. Cache-busting belongs on helper scripts inside `app/index.html`, not on `package.json` `appPath`.

## What is inside `app/`

The `app/` directory is the extracted Moonfin Tizen Regular `.wgt` release. The update workflow replaces this directory when Moonfin publishes a new release.

After extracting the WGT, the workflow injects:

- `app/tizen-adapter.js`
- `app/tizenbrew-diagnostics.js`

These scripts load before Moonfin's `main.js`.

## Compatibility layer

`tizen-adapter.js` exposes a small subset of Tizen-like APIs so Moonfin can boot inside TizenBrew. It also marks the environment with:

```js
window.__MOONFIN_TIZENBREW__ = true;
```

TizenBrew modules do not get the same native Samsung APIs as an installed Tizen WGT. For that reason, the adapter intentionally does not fake native `webapis.avplay`. Instead, the bundle patch forces Moonfin onto the HTML5 player path.

## Bundle patching

`scripts/patch-moonfin-bundle.mjs` applies deterministic patches to the extracted Moonfin bundle. The important behaviors are:

- force the HTML5 player when `window.__MOONFIN_TIZENBREW__` is present;
- avoid native Tizen video services inside TizenBrew;
- use a conservative H.264/AAC playback profile for TizenBrew;
- guard known DOM operations that can fail on older Samsung WebKit builds;
- rewrite absolute bundled font paths to local paths.

The verifier checks these patches so an update does not silently drop them.

## Diagnostics

`tizenbrew-diagnostics.js` provides an on-TV debug overlay. It logs playback requests, PlaybackInfo responses, HLS manifests, media element state, MediaSource support, fetch/XHR failures, and window errors.

Remote keys:

- Yellow: show or hide the overlay.
- Green: switch compact/expanded view.
- Blue: snapshot current media elements.
- Red: clear the stored log.

The overlay redacts common token and user/session fields before displaying URLs.

## Update workflow

The GitHub Action:

1. downloads the latest Moonfin Tizen Regular WGT;
2. extracts it to `app/`;
3. injects TizenBrew helper scripts;
4. runs `scripts/patch-moonfin-bundle.mjs`;
5. updates `package.json` version and keeps `appPath` as `app/index.html`;
6. runs `scripts/verify-tizenbrew-module.mjs`;
7. commits generated app changes when needed;
8. purges jsDelivr cache for both the unpinned path and `@main`.

No private server URL, account credential, API key, or personal token belongs in this repository.
