import fs from "node:fs";

function copyHelperScript(file) {
  const source = file;
  const destination = `app/${file}`;

  if (!fs.existsSync(source)) {
    throw new Error(`${file} not found`);
  }

  fs.copyFileSync(source, destination);
}

function injectHelperScript(html, file) {
  if (html.includes(file)) return html;

  const tag = `\t<script src="./${file}"></script>`;
  const adapterTag = '<script src="./tizen-adapter.js"></script>';

  if (file === "tizenbrew-diagnostics.js" && html.includes(adapterTag)) {
    return html.replace(adapterTag, `${adapterTag}\n${tag}`);
  }

  if (!html.includes("<head>")) {
    throw new Error("app/index.html does not contain a <head> tag");
  }

  return html.replace("<head>", `<head>\n${tag}`);
}

const patches = [
  {
    file: "app/chunk.917.js",
    name: "force HTML5 player in TizenBrew",
    original:
      'return"tizen"===(0,i.uo)()?t.e(7).then(t.bind(t,73007)):t.e(448).then(t.bind(t,22448))',
    patched:
      'return"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?t.e(448).then(t.bind(t,22448)):"tizen"===(0,i.uo)()?t.e(7).then(t.bind(t,73007)):t.e(448).then(t.bind(t,22448))'
  },
  {
    file: "app/main.js",
    name: "use HTML5 device profile services in TizenBrew",
    original:
      'if("tizen"!==(0,a.uo)()){e.n=3;break}return e.n=2,n.e(433).then(n.bind(n,13433));',
    patched:
      'if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__||"tizen"!==(0,a.uo)()){e.n=3;break}return e.n=2,n.e(433).then(n.bind(n,13433));'
  },
  {
    file: "app/main.js",
    name: "use conservative H.264 playback profile in TizenBrew",
    original:
      'case 1:return e.a(2,r.getJellyfinDeviceProfile(n))',
    patched:
      'case 1:return e.a(2,"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__&&r.getH264FallbackProfile?r.getH264FallbackProfile(n).then(function(e){return e.Name="Moonfin TizenBrew H264",e.MaxStreamingBitrate=2e7,e.MaxStaticBitrate=2e7,e.DirectPlayProfiles=[{Container:"mp4,m4v",Type:"Video",VideoCodec:"h264",AudioCodec:"aac,mp3"},{Container:"mp3,aac,m4a",Type:"Audio"}],e.TranscodingProfiles=[{Container:"mp4",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"hls",MaxAudioChannels:"2",MinSegments:"1",SegmentLength:"3",BreakOnNonKeyFrames:!1},{Container:"mp3",Type:"Audio",AudioCodec:"mp3",Context:"Streaming",Protocol:"http"},{Container:"aac",Type:"Audio",AudioCodec:"aac",Context:"Streaming",Protocol:"http"}],e.ResponseProfiles=[{Type:"Video",Container:"m4v",MimeType:"video/mp4"}],e}):r.getJellyfinDeviceProfile(n))'
  },
  {
    file: "app/main.js",
    name: "guard trailer preview container in TizenBrew",
    original:
      'g.contains(b)||g.appendChild(b)',
    patched:
      'g&&"function"===typeof g.appendChild&&("function"!==typeof g.contains||!g.contains(b))&&g.appendChild(b)'
  },
  {
    file: "app/main.js",
    name: "use HTML5 video services in TizenBrew",
    original:
      'if("tizen"!==(0,a.uo)()){e.n=2;break}return e.n=1,n.e(325).then(n.bind(n,88325));',
    patched:
      'if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__||"tizen"!==(0,a.uo)()){e.n=2;break}return e.n=1,n.e(325).then(n.bind(n,88325));'
  }
];

let applied = 0;
let unchanged = 0;

const indexFile = "app/index.html";
if (!fs.existsSync(indexFile)) {
  throw new Error(`${indexFile} not found`);
}

for (const helper of ["tizen-adapter.js", "tizenbrew-diagnostics.js"]) {
  copyHelperScript(helper);
}

const indexSource = fs.readFileSync(indexFile, "utf8");
const indexPatched = ["tizen-adapter.js", "tizenbrew-diagnostics.js"].reduce(
  (html, helper) => injectHelperScript(html, helper),
  indexSource
);

if (indexSource === indexPatched) {
  unchanged += 1;
  console.log("already patched: TizenBrew helper scripts");
} else {
  fs.writeFileSync(indexFile, indexPatched);
  applied += 1;
  console.log("patched: TizenBrew helper scripts");
}

for (const patch of patches) {
  if (!fs.existsSync(patch.file)) {
    throw new Error(`${patch.name}: ${patch.file} not found`);
  }

  const source = fs.readFileSync(patch.file, "utf8");

  if (source.includes(patch.patched)) {
    unchanged += 1;
    console.log(`already patched: ${patch.name}`);
    continue;
  }

  if (!source.includes(patch.original)) {
    throw new Error(`${patch.name}: expected bundle pattern was not found`);
  }

  fs.writeFileSync(patch.file, source.replace(patch.original, patch.patched));
  applied += 1;
  console.log(`patched: ${patch.name}`);
}

const cssFile = "app/main.css";
if (!fs.existsSync(cssFile)) {
  throw new Error(`${cssFile} not found`);
}

const cssFontPattern = /url\((["']?)\/node_modules\/@enact\/sandstone\/fonts\/[^)]*?\.ttf\1\) format\("truetype"\)/g;
const cssFontReplacement = 'url(resources/fonts/ScienceGothic-Regular.ttf) format("truetype")';
const cssSource = fs.readFileSync(cssFile, "utf8");
const cssPatched = cssSource.replace(cssFontPattern, cssFontReplacement);

if (cssSource === cssPatched) {
  if (cssSource.includes("/node_modules/@enact/sandstone/fonts/")) {
    throw new Error("main.css still contains unresolved absolute Sandstone font URLs");
  }
  unchanged += 1;
  console.log("already patched: local font URLs");
} else {
  fs.writeFileSync(cssFile, cssPatched);
  applied += 1;
  console.log("patched: local font URLs");
}

console.log(`Moonfin bundle patches complete (${applied} applied, ${unchanged} unchanged).`);
