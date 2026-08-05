import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const readText = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findLocalAssetRefs(html) {
  const refs = [];
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["']/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["']/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) {
      const ref = match[1];
      if (/^(?:https?:|data:|#)/i.test(ref)) continue;
      refs.push(ref);
    }
  }

  return refs;
}

function evaluateAdapter(source) {
  const storage = new Map();
  const navigatorRef = {
    language: "en-US",
    userAgent: "Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0)"
  };
  const windowRef = {
    innerWidth: 1920,
    innerHeight: 1080,
    navigator: navigatorRef,
    screen: {
      width: 1920,
      height: 1080
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    }
  };

  windowRef.window = windowRef;

  const context = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    navigator: navigatorRef,
    window: windowRef
  };

  vm.createContext(context);
  vm.runInContext(source, context, {
    filename: "app/tizen-adapter.js"
  });

  return context.window;
}

const pkg = JSON.parse(readText("package.json"));
const appPathFile = pkg.appPath.split(/[?#]/, 1)[0];
assert(pkg.packageType === "app", "package.json must declare packageType=app");
assert(pkg.appName === "Moonfin", "package.json appName must be Moonfin");
assert(appPathFile === "app/index.html", "package.json appPath must point to app/index.html");
assert(pkg.appPath === "app/index.html", "package.json appPath must stay query-free for TizenBrew launch");
assert(exists(appPathFile), `package.json appPath does not exist: ${pkg.appPath}`);

for (const key of [
  "MediaPlay",
  "MediaPause",
  "MediaPlayPause",
  "MediaStop",
  "MediaFastForward",
  "MediaRewind",
  "MediaTrackPrevious",
  "MediaTrackNext"
]) {
  assert(pkg.keys.includes(key), `package.json keys is missing ${key}`);
}

for (const key of [
  "Back",
  "Return",
  "Exit",
  "ColorF0Red",
  "ColorF1Green",
  "ColorF2Yellow",
  "ColorF3Blue",
  "Info",
  "Search",
  "ChannelUp",
  "ChannelDown"
]) {
  assert(!pkg.keys.includes(key), `package.json keys should not register ${key} in TizenBrew`);
}

const indexHtml = readText(appPathFile);
const adapterPosition = indexHtml.indexOf("tizen-adapter.js");
const diagnosticsPosition = indexHtml.indexOf("tizenbrew-diagnostics.js");
const mainPosition = indexHtml.indexOf("main.js");
assert(adapterPosition >= 0, "app/index.html must load tizen-adapter.js");
assert(diagnosticsPosition === -1, "app/index.html must not load the diagnostics overlay in normal builds");
assert(mainPosition >= 0, "app/index.html must load main.js");
assert(adapterPosition < mainPosition, "tizen-adapter.js must load before main.js");

for (const ref of findLocalAssetRefs(indexHtml)) {
  const cleanRef = ref.split(/[?#]/, 1)[0];
  const normalized = path.normalize(path.join(path.dirname(pkg.appPath), cleanRef));
  assert(exists(normalized), `app/index.html references missing asset: ${ref}`);
}

assert(/^\d+\.\d+\.\d+$/.test(pkg.version), "package.json version must be numeric semver for TizenBrew updates");
assert(indexHtml.includes("tizen-adapter.js?v=tizenbrew-"), "app/index.html must cache-bust tizen-adapter.js");
assert(!indexHtml.includes("tizenbrew-diagnostics.js?v=tizenbrew-"), "app/index.html must not load diagnostics by default");

const rootAdapter = readText("tizen-adapter.js");
const appAdapter = readText("app/tizen-adapter.js");
assert(rootAdapter === appAdapter, "root and app tizen-adapter.js files must stay identical");

const rootDiagnostics = readText("tizenbrew-diagnostics.js");
assert(rootDiagnostics.includes("__MOONFIN_TIZENBREW_DIAG__"), "diagnostics must expose __MOONFIN_TIZENBREW_DIAG__");
assert(rootDiagnostics.includes("playback.info"), "diagnostics must summarize PlaybackInfo responses");
assert(rootDiagnostics.includes("debug-panel-v6"), "diagnostics must expose the right-side debug panel build label");
assert(rootDiagnostics.includes("== PLAYBACK / MEDIA =="), "diagnostics must prioritize playback/media lines");
assert(rootDiagnostics.includes("red blocked to avoid overlapping debug panels"), "diagnostics must block red key propagation");

const windowRef = evaluateAdapter(appAdapter);
assert(windowRef.__MOONFIN_TIZENBREW__ === true, "adapter must set __MOONFIN_TIZENBREW__");
assert(typeof windowRef.tizen.application.getCurrentApplication === "function", "adapter must expose tizen.application");
assert(windowRef.tizen.application.getCurrentApplication().appInfo.name === "Moonfin", "adapter appInfo name mismatch");
assert(typeof windowRef.tizen.ApplicationControl === "function", "adapter must expose ApplicationControl constructor");
assert(typeof windowRef.tizen.ApplicationControlData === "function", "adapter must expose ApplicationControlData constructor");
assert(typeof windowRef.tizen.application.launchAppControl === "function", "adapter must expose launchAppControl");
assert(
  windowRef.tizen.systeminfo.getCapability("http://tizen.org/feature/platform.version") === "5.5",
  "adapter must expose a supported Tizen platform version"
);

let displayInfo = null;
windowRef.tizen.systeminfo.getPropertyValue("DISPLAY", (value) => {
  displayInfo = value;
});
assert(displayInfo?.resolutionWidth === 1920, "adapter DISPLAY systeminfo must include resolutionWidth");

const supportedKeys = windowRef.tizen.tvinputdevice.getSupportedKeys().map((key) => key.name);
assert(supportedKeys.includes("Return"), "adapter supported keys must include Return");
assert(typeof windowRef.tizen.power.request === "function", "adapter must expose tizen.power.request");
assert(typeof windowRef.tizen.tvaudiocontrol.getOutputMode === "function", "adapter must expose tvaudiocontrol");
assert(windowRef.webapis.productinfo.getDuid().startsWith("MOONFIN_TIZENBREW"), "adapter must expose productinfo DUID");
assert(windowRef.webapis.systeminfo.isSupportedAudioCodec("AC3") === true, "adapter must expose AC3 codec support");
assert(windowRef.webapis.systeminfo.isSupportedAudioCodec("TrueHD") === false, "adapter must not advertise TrueHD support");
assert(!("avplay" in windowRef.webapis), "adapter must not fake native AVPlay");

const playerChunk = readText("app/chunk.917.js");
assert(playerChunk.includes("window.__MOONFIN_TIZENBREW__?t.e(448)"), "player chunk must force HTML5 player in TizenBrew");

const smartHubChunk = readText("app/chunk.460.js");
assert(
  smartHubChunk.includes('window.__MOONFIN_TIZENBREW__)return void u.log("[SmartHub] Disabled in TizenBrew")'),
  "SmartHub updater must be disabled in TizenBrew"
);

const html5PlayerChunk = readText("app/chunk.448.js");
assert(
  /window\.__MOONFIN_TIZENBREW__\?Promise\.resolve\(\):\(0,(?:ru|su)\.waitForDecoderRelease\)\(\)/.test(html5PlayerChunk),
  "HTML5 player must skip shared decoder wait in TizenBrew"
);
assert(
  html5PlayerChunk.includes('enableDirectPlay:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!0:!R.preferTranscode'),
  "HTML5 player must prefer TV DirectPlay in TizenBrew playback requests"
);
assert(
  html5PlayerChunk.includes('enableDirectStream:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!0:!R.preferTranscode'),
  "HTML5 player must prefer TV DirectStream in TizenBrew playback requests"
);
assert(
  html5PlayerChunk.includes('enableTranscoding:!0'),
  "HTML5 player must explicitly allow transcoding in playback requests"
);
assert(
  html5PlayerChunk.includes('10009===e.keyCode'),
  "HTML5 player must recognize Samsung/Tizen Back key code"
);
assert(
  html5PlayerChunk.includes('"Back"===t||"BrowserBack"===t'),
  "HTML5 player must recognize Samsung/Tizen Back key names"
);
assert(
  html5PlayerChunk.includes('10252===e.keyCode'),
  "HTML5 player must handle Samsung/Tizen MediaPlayPause"
);
const resetsControlsOnRemoteNavigation =
  html5PlayerChunk.includes('("ArrowUp"===t||"ArrowDown"===t||"ArrowLeft"===t||"ArrowRight"===t') ||
  (html5PlayerChunk.includes('if("ArrowLeft"===t||37===e.keyCode||"ArrowRight"===t||39===e.keyCode){if(e.preventDefault()') &&
    html5PlayerChunk.includes('if("ArrowUp"===t||38===e.keyCode)return e.preventDefault(),qn()') &&
    html5PlayerChunk.includes('if("ArrowDown"===t||40===e.keyCode)return e.preventDefault(),qn()'));
assert(resetsControlsOnRemoteNavigation, "HTML5 player must reset the controls timeout on remote navigation");

const mainBundle = readText("app/main.js");
assert(
  mainBundle.includes('window.__MOONFIN_TIZENBREW__||"tizen"!==(0,a.uo)()){e.n=3;break}return e.n=2,n.e(433)'),
  "main bundle must route device profile services away from Tizen in TizenBrew"
);
assert(
  mainBundle.includes('window.__MOONFIN_TIZENBREW__)return e.a(2,{Name:"Moonfin TizenBrew TV Decode"'),
  "main bundle must use a static TV decode playback profile in TizenBrew"
);
assert(
  mainBundle.includes('Name:"Moonfin TizenBrew TV Decode"'),
  "main bundle must label the TizenBrew playback profile"
);
assert(
  mainBundle.includes('DirectPlayProfiles:[{Container:"mp4,m4v",Type:"Video",VideoCodec:"h264,hevc,h265",AudioCodec:"aac,mp3,ac3,eac3"}'),
  "main bundle must advertise common Samsung TV MP4 codecs for DirectPlay"
);
assert(
  mainBundle.includes('{Container:"webm",Type:"Video",VideoCodec:"vp8,vp9",AudioCodec:"vorbis,opus"}'),
  "main bundle must advertise WebM/VP9 DirectPlay for compatible Samsung TVs"
);
assert(
  mainBundle.includes('TranscodingProfiles:[{Container:"ts",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"hls"'),
  "main bundle must prefer HLS TS transcoding in TizenBrew"
);
assert(
  mainBundle.includes('window.__MOONFIN_TIZENBREW__)return e.a(2,{modelName:"Samsung Smart TV"'),
  "main bundle must use static TizenBrew playback capabilities without webOS probing"
);
assert(
  !mainBundle.includes('w=w.replace(/\\/master\\.m3u8/i,"/stream.mp4")'),
  "main bundle must not rewrite TizenBrew HLS transcode URLs to progressive MP4"
);
assert(
  !mainBundle.includes('TranscodingProtocol=http'),
  "main bundle must not rewrite TizenBrew transcode protocol to HTTP"
);
assert(
  !mainBundle.includes("g.contains(b)||g.appendChild(b)"),
  "main bundle must not contain unguarded trailer preview DOM container access"
);
assert(
  mainBundle.includes('window.__MOONFIN_TIZENBREW__)return e.a(2,null);if(i=(0,a.Tt)())'),
  "main bundle must disable SyncPlay API calls in TizenBrew"
);
assert(
  mainBundle.includes('window.__MOONFIN_TIZENBREW__||"tizen"!==(0,a.uo)()){e.n=2;break}return e.n=1,n.e(325)'),
  "main bundle must route video services away from native Tizen in TizenBrew"
);

const mainCss = readText("app/main.css");
assert(
  !mainCss.includes("/node_modules/@enact/sandstone/fonts/"),
  "main.css must not reference absolute /node_modules font URLs"
);
const localFontRefs = [...mainCss.matchAll(/url\(["']?(resources\/fonts\/[^)'\"]+\.ttf)/g)].map((match) => match[1]);
assert(localFontRefs.length > 0, "main.css must reference bundled local fonts");
for (const fontRef of new Set(localFontRefs)) {
  assert(exists(`app/${fontRef}`), `main.css references missing local font: ${fontRef}`);
}

const workflow = readText(".github/workflows/update-moonfin.yml");
assert(workflow.includes("node scripts/patch-moonfin-bundle.mjs"), "update workflow must apply bundle patches");

console.log("Moonfin TizenBrew verification passed.");
