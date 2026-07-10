import fs from "node:fs";

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
    name: "use HTML5 video services in TizenBrew",
    original:
      'if("tizen"!==(0,a.uo)()){e.n=2;break}return e.n=1,n.e(325).then(n.bind(n,88325));',
    patched:
      'if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__||"tizen"!==(0,a.uo)()){e.n=2;break}return e.n=1,n.e(325).then(n.bind(n,88325));'
  }
];

let applied = 0;
let unchanged = 0;

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
