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

  if (!html.includes("<head>")) {
    throw new Error("app/index.html does not contain a <head> tag");
  }

  return html.replace("<head>", `<head>\n${tag}`);
}

const tizenbrewTvDecodeProfilePatch =
  'case 0:if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__)return e.a(2,{Name:"Moonfin TizenBrew TV Decode",MaxStreamingBitrate:5e7,MaxStaticBitrate:5e7,MaxStaticMusicBitrate:4e7,MusicStreamingTranscodingBitrate:384e3,DirectPlayProfiles:[{Container:"mp4,m4v",Type:"Video",VideoCodec:"h264,hevc,h265",AudioCodec:"aac,mp3,ac3,eac3"},{Container:"webm",Type:"Video",VideoCodec:"vp8,vp9",AudioCodec:"vorbis,opus"},{Container:"mp3,aac,m4a,flac",Type:"Audio"}],TranscodingProfiles:[{Container:"ts",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"hls",MaxAudioChannels:"2",MinSegments:"2",SegmentLength:"5",BreakOnNonKeyFrames:!1},{Container:"mp4",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Static"},{Container:"mp3",Type:"Audio",AudioCodec:"mp3",Context:"Streaming",Protocol:"http"},{Container:"aac",Type:"Audio",AudioCodec:"aac",Context:"Streaming",Protocol:"http"}],CodecProfiles:[],SubtitleProfiles:[{Format:"vtt",Method:"External"},{Format:"srt",Method:"External"},{Format:"ass",Method:"External"},{Format:"ssa",Method:"External"},{Format:"sub",Method:"Encode"},{Format:"smi",Method:"Encode"},{Format:"ttml",Method:"External"},{Format:"pgssub",Method:"External"},{Format:"dvdsub",Method:"External"},{Format:"dvbsub",Method:"External"}],ResponseProfiles:[{Type:"Video",Container:"m4v",MimeType:"video/mp4"}]});return e.n=1,s();case 1:return e.a(2,r.getJellyfinDeviceProfile(n))';

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
    name: "use TV decode playback profile in TizenBrew",
    optional: true,
    original:
      'case 0:return e.n=1,s();case 1:return e.a(2,r.getJellyfinDeviceProfile(n))',
    patched: tizenbrewTvDecodeProfilePatch
  },
  {
    file: "app/main.js",
    name: "migrate static TizenBrew playback profile from H.264 MP4 to TV Decode",
    optional: true,
    originalPattern:
      /case 0:if\("undefined"!==typeof window&&window\.__MOONFIN_TIZENBREW__\)return e\.a\(2,\{Name:"Moonfin TizenBrew H264 MP4".*?:r\.getJellyfinDeviceProfile\(n\)\)/,
    patched: tizenbrewTvDecodeProfilePatch
  },
  {
    file: "app/main.js",
    name: "remove legacy H.264 fallback after TizenBrew TV Decode profile",
    optional: true,
    originalPattern:
      /case 0:if\("undefined"!==typeof window&&window\.__MOONFIN_TIZENBREW__\)return e\.a\(2,\{Name:"Moonfin TizenBrew TV Decode".*?:r\.getJellyfinDeviceProfile\(n\)\)/,
    patched: tizenbrewTvDecodeProfilePatch
  },
  {
    file: "app/main.js",
    name: "avoid webOS profile probing during TizenBrew HLS playback",
    original:
      'case 0:return e.n=1,s();case 1:return e.a(2,"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__&&r.getH264FallbackProfile?r.getH264FallbackProfile(n).then(function(e){return e.Name="Moonfin TizenBrew H264 MP4",e.MaxStreamingBitrate=2e7,e.MaxStaticBitrate=2e7,e.DirectPlayProfiles=[{Container:"mp4,m4v",Type:"Video",VideoCodec:"h264",AudioCodec:"aac,mp3"},{Container:"mp3,aac,m4a",Type:"Audio"}],e.TranscodingProfiles=[{Container:"mp4",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"http",MaxAudioChannels:"2",MinSegments:"1",SegmentLength:"3",BreakOnNonKeyFrames:!1},{Container:"ts",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"hls",MaxAudioChannels:"2",MinSegments:"1",SegmentLength:"3",BreakOnNonKeyFrames:!1},{Container:"mp3",Type:"Audio",AudioCodec:"mp3",Context:"Streaming",Protocol:"http"},{Container:"aac",Type:"Audio",AudioCodec:"aac",Context:"Streaming",Protocol:"http"}],e.ResponseProfiles=[{Type:"Video",Container:"m4v",MimeType:"video/mp4"}],e}):r.getJellyfinDeviceProfile(n))',
    patched:
      'case 0:if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__)return e.a(2,{Name:"Moonfin TizenBrew TV Decode",MaxStreamingBitrate:5e7,MaxStaticBitrate:5e7,MaxStaticMusicBitrate:4e7,MusicStreamingTranscodingBitrate:384e3,DirectPlayProfiles:[{Container:"mp4,m4v",Type:"Video",VideoCodec:"h264,hevc,h265",AudioCodec:"aac,mp3,ac3,eac3"},{Container:"webm",Type:"Video",VideoCodec:"vp8,vp9",AudioCodec:"vorbis,opus"},{Container:"mp3,aac,m4a,flac",Type:"Audio"}],TranscodingProfiles:[{Container:"ts",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"hls",MaxAudioChannels:"2",MinSegments:"2",SegmentLength:"5",BreakOnNonKeyFrames:!1},{Container:"mp4",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Static"},{Container:"mp3",Type:"Audio",AudioCodec:"mp3",Context:"Streaming",Protocol:"http"},{Container:"aac",Type:"Audio",AudioCodec:"aac",Context:"Streaming",Protocol:"http"}],CodecProfiles:[],SubtitleProfiles:[{Format:"vtt",Method:"External"},{Format:"srt",Method:"External"},{Format:"ass",Method:"External"},{Format:"ssa",Method:"External"},{Format:"sub",Method:"Encode"},{Format:"smi",Method:"Encode"},{Format:"ttml",Method:"External"},{Format:"pgssub",Method:"External"},{Format:"dvdsub",Method:"External"},{Format:"dvbsub",Method:"External"}],ResponseProfiles:[{Type:"Video",Container:"m4v",MimeType:"video/mp4"}]});return e.n=1,s();case 1:return e.a(2,r.getJellyfinDeviceProfile(n))'
  },
  {
    file: "app/main.js",
    name: "migrate static TizenBrew playback profile from MP4 to HLS",
    original:
      'case 0:if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__)return e.a(2,{Name:"Moonfin TizenBrew H264 MP4",MaxStreamingBitrate:5e7,MaxStaticBitrate:5e7,MaxStaticMusicBitrate:4e7,MusicStreamingTranscodingBitrate:384e3,DirectPlayProfiles:[{Container:"mp4,m4v",Type:"Video",VideoCodec:"h264,hevc,h265",AudioCodec:"aac,mp3,ac3,eac3"},{Container:"webm",Type:"Video",VideoCodec:"vp8,vp9",AudioCodec:"vorbis,opus"},{Container:"mp3,aac,m4a,flac",Type:"Audio"}],TranscodingProfiles:[{Container:"mp4",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"http",MaxAudioChannels:"2",MinSegments:"1",SegmentLength:"3",BreakOnNonKeyFrames:!1},{Container:"ts",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"hls",MaxAudioChannels:"2",MinSegments:"1",SegmentLength:"3",BreakOnNonKeyFrames:!1},{Container:"mp3",Type:"Audio",AudioCodec:"mp3",Context:"Streaming",Protocol:"http"},{Container:"aac",Type:"Audio",AudioCodec:"aac",Context:"Streaming",Protocol:"http"}],CodecProfiles:[],SubtitleProfiles:[{Format:"vtt",Method:"External"},{Format:"srt",Method:"External"},{Format:"ass",Method:"External"},{Format:"ssa",Method:"External"},{Format:"sub",Method:"Encode"},{Format:"smi",Method:"Encode"},{Format:"ttml",Method:"External"},{Format:"pgssub",Method:"External"},{Format:"dvdsub",Method:"External"},{Format:"dvbsub",Method:"External"}],ResponseProfiles:[{Type:"Video",Container:"m4v",MimeType:"video/mp4"}]});return e.n=1,s();case 1:return e.a(2,r.getJellyfinDeviceProfile(n))',
    patched:
      'case 0:if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__)return e.a(2,{Name:"Moonfin TizenBrew TV Decode",MaxStreamingBitrate:5e7,MaxStaticBitrate:5e7,MaxStaticMusicBitrate:4e7,MusicStreamingTranscodingBitrate:384e3,DirectPlayProfiles:[{Container:"mp4,m4v",Type:"Video",VideoCodec:"h264,hevc,h265",AudioCodec:"aac,mp3,ac3,eac3"},{Container:"webm",Type:"Video",VideoCodec:"vp8,vp9",AudioCodec:"vorbis,opus"},{Container:"mp3,aac,m4a,flac",Type:"Audio"}],TranscodingProfiles:[{Container:"ts",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Streaming",Protocol:"hls",MaxAudioChannels:"2",MinSegments:"2",SegmentLength:"5",BreakOnNonKeyFrames:!1},{Container:"mp4",Type:"Video",AudioCodec:"aac",VideoCodec:"h264",Context:"Static"},{Container:"mp3",Type:"Audio",AudioCodec:"mp3",Context:"Streaming",Protocol:"http"},{Container:"aac",Type:"Audio",AudioCodec:"aac",Context:"Streaming",Protocol:"http"}],CodecProfiles:[],SubtitleProfiles:[{Format:"vtt",Method:"External"},{Format:"srt",Method:"External"},{Format:"ass",Method:"External"},{Format:"ssa",Method:"External"},{Format:"sub",Method:"Encode"},{Format:"smi",Method:"Encode"},{Format:"ttml",Method:"External"},{Format:"pgssub",Method:"External"},{Format:"dvdsub",Method:"External"},{Format:"dvbsub",Method:"External"}],ResponseProfiles:[{Type:"Video",Container:"m4v",MimeType:"video/mp4"}]});return e.n=1,s();case 1:return e.a(2,r.getJellyfinDeviceProfile(n))'
  },
  {
    file: "app/main.js",
    name: "avoid webOS capability probing during TizenBrew playback",
    original:
      'case 0:return e.n=1,s();case 1:return e.a(2,(t=r).getDeviceCapabilities.apply(t,n))',
    patched:
      'case 0:if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__)return e.a(2,{modelName:"Samsung Smart TV",modelNameAscii:"Samsung Smart TV",serialNumber:"",sdkVersion:"TizenBrew",firmwareVersion:"",webosVersion:5,webosVersionDisplay:"TizenBrew",screenWidth:1920,screenHeight:1080,uhd:!0,uhd8K:!1,oled:!1,hdr10:!0,hdr10Plus:!1,hlg:!0,dolbyVision:!1,dolbyAtmos:!1,dts:{mkv:!1,mp4:!1,ts:!1,avi:!1},dtsBase:{mkv:!1,mp4:!1,ts:!1,avi:!1},ac3:!0,eac3:!0,truehd:!1,dtshd:!1,opus:!0,hevc:!0,av1:!1,vp9:!0,mp4:!0,m4v:!0,ts:!0,mov:!0,avi:!1,webm:!0,mkv:!1,hls:!0,nativeHls:!0,hasNativeHls:!0,nativeHlsFmp4:!1,hlsAc3:!1,hlsByteRange:!0,lunaConfig:{},ddrSize:0});return e.n=1,s();case 1:return e.a(2,(t=r).getDeviceCapabilities.apply(t,n))'
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
    name: "disable SyncPlay API calls in TizenBrew",
    original:
      'case 0:if(i=(0,a.Tt)()){e.n=1;break}throw new Error("No server URL");case 1:return s="".concat(i,"/SyncPlay/").concat(n),',
    patched:
      'case 0:if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__)return e.a(2,null);if(i=(0,a.Tt)()){e.n=1;break}throw new Error("No server URL");case 1:return s="".concat(i,"/SyncPlay/").concat(n),'
  },
  {
    file: "app/main.js",
    name: "use HTML5 video services in TizenBrew",
    original:
      'if("tizen"!==(0,a.uo)()){e.n=2;break}return e.n=1,n.e(325).then(n.bind(n,88325));',
    patched:
      'if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__||"tizen"!==(0,a.uo)()){e.n=2;break}return e.n=1,n.e(325).then(n.bind(n,88325));'
  },
  {
    file: "app/chunk.460.js",
    name: "disable SmartHub updater in TizenBrew",
    original:
      'function k(){if("undefined"!==typeof tizen){',
    patched:
      'function k(){if("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__)return void u.log("[SmartHub] Disabled in TizenBrew");if("undefined"!==typeof tizen){'
  },
  {
    file: "app/chunk.448.js",
    name: "skip shared decoder wait in TizenBrew",
    original:
      "e.n=1,(0,ru.waitForDecoderRelease)();case 1:return e.p=1",
    patched:
      'e.n=1,("undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?Promise.resolve():(0,ru.waitForDecoderRelease)());case 1:return e.p=1'
  },
  {
    file: "app/chunk.448.js",
    name: "migrate forced TizenBrew transcode request to TV decode preference",
    original:
      'Xl.uF(v.Id,{startPositionTicks:l,maxBitrate:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?2e7:gt||R.maxBitrate,enableDirectPlay:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!1:!R.preferTranscode,enableDirectStream:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!1:!R.preferTranscode,enableTranscoding:!0,forceDirectPlay:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!1:!vi&&R.forceDirectPlay,mediaSourceId:m,audioStreamIndex:null!=p?p:void 0,subtitleStreamIndex:y,item:v,isLiveTV:vi,stereoUpmixEnabled:R.stereoUpmixEnabled})',
    patched:
      'Xl.uF(v.Id,{startPositionTicks:l,maxBitrate:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?5e7:gt||R.maxBitrate,enableDirectPlay:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!0:!R.preferTranscode,enableDirectStream:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!0:!R.preferTranscode,enableTranscoding:!0,forceDirectPlay:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!1:!vi&&R.forceDirectPlay,mediaSourceId:m,audioStreamIndex:null!=p?p:void 0,subtitleStreamIndex:y,item:v,isLiveTV:vi,stereoUpmixEnabled:R.stereoUpmixEnabled})'
  },
  {
    file: "app/chunk.448.js",
    name: "prefer TV decode with HLS fallback in TizenBrew",
    original:
      "Xl.uF(v.Id,{startPositionTicks:l,maxBitrate:gt||R.maxBitrate,enableDirectPlay:!R.preferTranscode,enableDirectStream:!R.preferTranscode,forceDirectPlay:!vi&&R.forceDirectPlay,mediaSourceId:m,audioStreamIndex:null!=p?p:void 0,subtitleStreamIndex:y,item:v,isLiveTV:vi,stereoUpmixEnabled:R.stereoUpmixEnabled})",
    patched:
      'Xl.uF(v.Id,{startPositionTicks:l,maxBitrate:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?5e7:gt||R.maxBitrate,enableDirectPlay:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!0:!R.preferTranscode,enableDirectStream:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!0:!R.preferTranscode,enableTranscoding:!0,forceDirectPlay:"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__?!1:!vi&&R.forceDirectPlay,mediaSourceId:m,audioStreamIndex:null!=p?p:void 0,subtitleStreamIndex:y,item:v,isLiveTV:vi,stereoUpmixEnabled:R.stereoUpmixEnabled})'
  },
  {
    file: "app/main.js",
    name: "keep TizenBrew transcoding URLs as HLS",
    original:
      'if(t.TranscodingUrl){var w=t.TranscodingUrl;w=w.replace(/\\?&/g,"?").replace(/&&/g,"&"),a.stereoUpmixEnabled&&(w+=(w.includes("?")?"&":"?")+"upmix=true"),"undefined"!==typeof window&&window.__MOONFIN_TIZENBREW__&&!i&&(w=w.replace(/\\/master\\.m3u8/i,"/stream.mp4").replace(/([?&])TranscodingProtocol=hls/ig,"$1TranscodingProtocol=http").replace(/([?&])SegmentContainer=[^&]*/ig,"$1Container=mp4").replace(/([?&])MinSegments=[^&]*/ig,"$1").replace(/&&/g,"&"));var S=(w=w.replace(/([?&])StartTimeTicks=[^&]*&?/i,"$1").replace(/[?&]$/,"")).startsWith("http")?w:"".concat(s).concat(w);return S.includes("api_key")?S:"".concat(S,"&api_key=").concat(l)}',
    patched:
      'if(t.TranscodingUrl){var w=t.TranscodingUrl;w=w.replace(/\\?&/g,"?").replace(/&&/g,"&"),a.stereoUpmixEnabled&&(w+=(w.includes("?")?"&":"?")+"upmix=true");var S=(w=w.replace(/([?&])StartTimeTicks=[^&]*&?/i,"$1").replace(/[?&]$/,"")).startsWith("http")?w:"".concat(s).concat(w);return S.includes("api_key")?S:"".concat(S,"&api_key=").concat(l)}'
  }
];

let applied = 0;
let unchanged = 0;

const indexFile = "app/index.html";
if (!fs.existsSync(indexFile)) {
  throw new Error(`${indexFile} not found`);
}

for (const helper of ["tizen-adapter.js"]) {
  copyHelperScript(helper);
}

const indexSource = fs.readFileSync(indexFile, "utf8");
const indexWithoutDiagnostics = indexSource.replace(
  /\s*<script src="\.\/tizenbrew-diagnostics\.js(?:\?[^"]*)?"><\/script>/g,
  ""
);
const indexPatched = ["tizen-adapter.js"].reduce(
  (html, helper) => injectHelperScript(html, helper),
  indexWithoutDiagnostics
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
  const hasOriginal = patch.originalPattern
    ? patch.originalPattern.test(source)
    : source.includes(patch.original);

  if (source.includes(patch.patched)) {
    if (!hasOriginal) {
      unchanged += 1;
      console.log(`already patched: ${patch.name}`);
      continue;
    }
  }

  if (!hasOriginal && patch.optional) {
    unchanged += 1;
    console.log(`not needed: ${patch.name}`);
    continue;
  }

  if (!hasOriginal) {
    throw new Error(`${patch.name}: expected bundle pattern was not found`);
  }

  const patchedSource = patch.originalPattern
    ? source.replace(patch.originalPattern, patch.patched)
    : source.replaceAll(patch.original, patch.patched);
  fs.writeFileSync(patch.file, patchedSource);
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
