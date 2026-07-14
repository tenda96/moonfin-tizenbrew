# Troubleshooting

## TizenBrew shows an old version

Use this module string:

```text
tenda96/moonfin-tizenbrew@main
```

The unpinned `tenda96/moonfin-tizenbrew` path can stay stale on jsDelivr. If TizenBrew keeps showing an old version, remove the module from TizenBrew, restart TizenBrew, then add the `@main` module again.

For deterministic testing, use a full commit SHA:

```text
tenda96/moonfin-tizenbrew@<commit-sha>
```

## The card is visible but clicking it does nothing

Check `package.json` first. `appPath` should be exactly:

```json
"appPath": "app/index.html"
```

Do not add a query string to `appPath`. TizenBrew builds a local launch URL from this value, and query-based cache-busting can break or confuse the launch path on some setups. Cache-bust helper scripts in `app/index.html` instead.

## The app opens but videos stay on Loading

Historical debug builds loaded an on-TV diagnostic overlay. Normal builds do not load it because it can interfere with Samsung remote color-key menus.

If a debug build is enabled, open the diagnostic overlay with the yellow key and look for:

- `playback.request`
- `playback.info`
- `playback.source`
- `hls.manifest`
- `media.src`
- `media.error`
- `media.watchdog`
- `fetch.error` or `xhr.error`

`fetch.error` lines for Piped or Invidious usually belong to trailer lookup and are not enough to explain Jellyfin playback failures. The key lines for actual playback are `playback.request`, `playback.info`, `playback.source`, `Player`, `media.src`, and `hls.manifest`.

The most useful screenshot is usually the right-side debug panel after pressing blue once during the loading spinner. Avoid sharing server URLs or account details; the overlay redacts common tokens, but screenshots should still be checked before posting publicly.

## Two debug panels overlap

Normal builds do not load the module debug panel. If a debug build is used, do not block Samsung color keys globally because some remotes need the `123/colors` menu to choose those keys.

## Local checks before pushing

Run:

```sh
npm run verify
node --check tizenbrew-diagnostics.js
node --check scripts/patch-moonfin-bundle.mjs
```

The verifier confirms the manifest, helper injection, bundle patches, debug overlay marker, and local asset references.
