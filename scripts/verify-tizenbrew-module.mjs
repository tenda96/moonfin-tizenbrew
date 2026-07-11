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
assert(pkg.packageType === "app", "package.json must declare packageType=app");
assert(pkg.appName === "Moonfin", "package.json appName must be Moonfin");
assert(pkg.appPath === "app/index.html", "package.json appPath must point to app/index.html");
assert(exists(pkg.appPath), `package.json appPath does not exist: ${pkg.appPath}`);

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

const indexHtml = readText(pkg.appPath);
const adapterPosition = indexHtml.indexOf("tizen-adapter.js");
const mainPosition = indexHtml.indexOf("main.js");
assert(adapterPosition >= 0, "app/index.html must load tizen-adapter.js");
assert(mainPosition >= 0, "app/index.html must load main.js");
assert(adapterPosition < mainPosition, "tizen-adapter.js must load before main.js");

for (const ref of findLocalAssetRefs(indexHtml)) {
  const normalized = path.normalize(path.join(path.dirname(pkg.appPath), ref));
  assert(exists(normalized), `app/index.html references missing asset: ${ref}`);
}

const rootAdapter = readText("tizen-adapter.js");
const appAdapter = readText("app/tizen-adapter.js");
assert(rootAdapter === appAdapter, "root and app tizen-adapter.js files must stay identical");

const windowRef = evaluateAdapter(appAdapter);
assert(windowRef.__MOONFIN_TIZENBREW__ === true, "adapter must set __MOONFIN_TIZENBREW__");
assert(typeof windowRef.tizen.application.getCurrentApplication === "function", "adapter must expose tizen.application");
assert(windowRef.tizen.application.getCurrentApplication().appInfo.name === "Moonfin", "adapter appInfo name mismatch");
assert(
  windowRef.tizen.systeminfo.getCapability("http://tizen.org/feature/platform.version") === "3.0",
  "adapter must expose a conservative Tizen platform version"
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

const mainBundle = readText("app/main.js");
assert(
  mainBundle.includes('window.__MOONFIN_TIZENBREW__||"tizen"!==(0,a.uo)()){e.n=3;break}return e.n=2,n.e(433)'),
  "main bundle must route device profile services away from Tizen in TizenBrew"
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
assert(
  mainCss.includes("resources/fonts/ScienceGothic-Regular.ttf"),
  "main.css must reference the bundled local font fallback"
);

const workflow = readText(".github/workflows/update-moonfin.yml");
assert(workflow.includes("node scripts/patch-moonfin-bundle.mjs"), "update workflow must apply bundle patches");

console.log("Moonfin TizenBrew verification passed.");
