"use strict";

(function () {
  if (typeof window === "undefined") return;

  const noop = function () {};
  const screenRef = window.screen || {};
  const navigatorRef = window.navigator || (typeof navigator !== "undefined" ? navigator : {});
  const localStorageRef = window.localStorage || null;

  window.__MOONFIN_TIZENBREW__ = true;
  window.__MOONFIN_TIZENBREW_PROFILE__ = {
    Name: "Moonfin TizenBrew TV Decode",
    MaxStreamingBitrate: 50000000,
    MaxStaticBitrate: 50000000,
    MaxStaticMusicBitrate: 40000000,
    MusicStreamingTranscodingBitrate: 384000,
    DirectPlayProfiles: [
      {
        Container: "mp4,m4v",
        Type: "Video",
        VideoCodec: "h264,hevc,h265",
        AudioCodec: "aac,mp3,ac3,eac3"
      },
      {
        Container: "webm",
        Type: "Video",
        VideoCodec: "vp8,vp9",
        AudioCodec: "vorbis,opus"
      },
      { Container: "mp3,aac,m4a,flac", Type: "Audio" }
    ],
    TranscodingProfiles: [
      {
        Container: "ts",
        Type: "Video",
        AudioCodec: "aac",
        VideoCodec: "h264",
        Context: "Streaming",
        Protocol: "hls",
        MaxAudioChannels: "2",
        MinSegments: "2",
        SegmentLength: "5",
        BreakOnNonKeyFrames: false
      },
      {
        Container: "mp4",
        Type: "Video",
        AudioCodec: "aac",
        VideoCodec: "h264",
        Context: "Static"
      },
      { Container: "mp3", Type: "Audio", AudioCodec: "mp3", Context: "Streaming", Protocol: "http" },
      { Container: "aac", Type: "Audio", AudioCodec: "aac", Context: "Streaming", Protocol: "http" }
    ],
    CodecProfiles: [],
    SubtitleProfiles: [
      { Format: "vtt", Method: "External" },
      { Format: "srt", Method: "External" },
      { Format: "ass", Method: "External" },
      { Format: "ssa", Method: "External" },
      { Format: "sub", Method: "Encode" },
      { Format: "smi", Method: "Encode" },
      { Format: "ttml", Method: "External" },
      { Format: "pgssub", Method: "External" },
      { Format: "dvdsub", Method: "External" },
      { Format: "dvbsub", Method: "External" }
    ],
    ResponseProfiles: [{ Type: "Video", Container: "m4v", MimeType: "video/mp4" }]
  };
  window.__MOONFIN_TIZENBREW_CAPABILITIES__ = {
    modelName: "Samsung Smart TV",
    modelNameAscii: "Samsung Smart TV",
    serialNumber: "",
    sdkVersion: "TizenBrew",
    firmwareVersion: "",
    webosVersion: 5,
    webosVersionDisplay: "TizenBrew",
    screenWidth: screenRef.width || window.innerWidth || 1920,
    screenHeight: screenRef.height || window.innerHeight || 1080,
    uhd: true,
    uhd8K: false,
    oled: false,
    hdr10: true,
    hdr10Plus: false,
    hlg: true,
    dolbyVision: false,
    dolbyAtmos: true,
    dts: { mkv: false, mp4: false, ts: false, avi: false },
    dtsBase: { mkv: false, mp4: false, ts: false, avi: false },
    ac3: true,
    eac3: true,
    truehd: false,
    dtshd: false,
    opus: true,
    hevc: true,
    av1: false,
    vp9: true,
    mp4: true,
    m4v: true,
    ts: true,
    mov: true,
    avi: false,
    webm: true,
    mkv: false,
    hls: true,
    nativeHls: true,
    hasNativeHls: true,
    nativeHlsFmp4: false,
    hlsAc3: true,
    hlsByteRange: true,
    lunaConfig: {},
    ddrSize: 0
  };

  function defineMissing(target, values) {
    Object.keys(values).forEach(function (key) {
      if (typeof target[key] === "undefined") {
        target[key] = values[key];
      }
    });
  }

  function stableDeviceId() {
    const key = "moonfin_tizenbrew_device_id";
    try {
      if (localStorageRef) {
        const existing = localStorageRef.getItem(key);
        if (existing) return existing;
        const created = "MOONFIN_TIZENBREW_" + Date.now().toString(36);
        localStorageRef.setItem(key, created);
        return created;
      }
    } catch (e) {}
    return "MOONFIN_TIZENBREW";
  }

  const appInfo = {
    id: "MoonfinTizenBrew.Moonfin",
    name: "Moonfin",
    packageId: "MoonfinTizenBrew",
    version: "TIZENBREW",
    show: true
  };

  const currentApplication = {
    appInfo: appInfo,
    getRequestedAppControl: function () {
      return null;
    },
    exit: function () {
      console.log("[Moonfin TizenBrew] application.exit() called");
    },
    hide: function () {
      console.log("[Moonfin TizenBrew] application.hide() called");
    }
  };

  window.tizen = window.tizen || {};

  defineMissing(window.tizen, {
    ApplicationControl: function (operation, uri, mime, category, data) {
      this.operation = operation || "";
      this.uri = uri || null;
      this.mime = mime || null;
      this.category = category || null;
      this.data = Array.isArray(data) ? data : [];
    },
    ApplicationControlData: function (key, value) {
      this.key = key || "";
      this.value = Array.isArray(value) ? value : typeof value === "undefined" ? [] : [String(value)];
    }
  });

  window.tizen.application = window.tizen.application || {};
  defineMissing(window.tizen.application, {
    getCurrentApplication: function () {
      return currentApplication;
    },
    getAppInfo: function () {
      const successCallback = Array.prototype.find.call(arguments, function (argument) {
        return typeof argument === "function";
      });
      if (typeof successCallback === "function") {
        successCallback(appInfo);
      }
      return appInfo;
    },
    launchAppControl: function () {
      const successCallback = Array.prototype.find.call(arguments, function (argument) {
        return typeof argument === "function";
      });
      if (typeof successCallback === "function") {
        setTimeout(successCallback, 0);
      }
    }
  });

  window.tizen.systeminfo = window.tizen.systeminfo || {};
  defineMissing(window.tizen.systeminfo, {
    getCapability: function (capability) {
      const values = {
        "http://tizen.org/feature/platform.version": "5.5",
        "http://tizen.org/feature/platform.name": "TizenBrew",
        "http://tizen.org/feature/screen.size.normal.1080.1920": true,
        "http://tizen.org/feature/network.internet": true,
        "http://tizen.org/feature/network.wifi": true
      };

      if (Object.prototype.hasOwnProperty.call(values, capability)) {
        return values[capability];
      }

      return false;
    },
    getPropertyValue: function (property, successCallback, errorCallback) {
      try {
        const values = {
          DISPLAY: {
            resolutionWidth: screenRef.width || window.innerWidth || 1920,
            resolutionHeight: screenRef.height || window.innerHeight || 1080,
            dotsPerInchWidth: 96,
            dotsPerInchHeight: 96
          },
          BUILD: {
            model: "TizenBrew",
            manufacturer: "Samsung",
            buildVersion: "TizenBrew",
            buildDate: "TizenBrew"
          },
          LOCALE: {
            language: navigatorRef.language || "en-US",
            country: "US"
          },
          NETWORK: {
            networkType: "WIFI"
          }
        };

        if (typeof successCallback === "function") {
          successCallback(values[property] || {});
        }
      } catch (e) {
        if (typeof errorCallback === "function") {
          errorCallback(e);
        }
      }
    }
  });

  window.tizen.tvinputdevice = window.tizen.tvinputdevice || {};
  defineMissing(window.tizen.tvinputdevice, {
    registerKey: function () {},
    unregisterKey: function () {},
    getSupportedKeys: function () {
      return [
        { name: "Back", code: 10009 },
        { name: "Return", code: 10009 },
        { name: "Exit", code: 10182 },
        { name: "MediaPlayPause", code: 10252 },
        { name: "MediaPlay", code: 415 },
        { name: "MediaPause", code: 19 },
        { name: "MediaStop", code: 413 },
        { name: "MediaTrackPrevious", code: 10232 },
        { name: "MediaTrackNext", code: 10233 },
        { name: "MediaRewind", code: 412 },
        { name: "MediaFastForward", code: 417 },
        { name: "ColorF0Red", code: 403 },
        { name: "ColorF1Green", code: 404 },
        { name: "ColorF2Yellow", code: 405 },
        { name: "ColorF3Blue", code: 406 },
        { name: "Info", code: 457 },
        { name: "Search", code: 10225 },
        { name: "ChannelUp", code: 427 },
        { name: "ChannelDown", code: 428 }
      ];
    }
  });

  window.tizen.power = window.tizen.power || {};
  defineMissing(window.tizen.power, {
    request: noop,
    release: noop
  });

  window.tizen.tvaudiocontrol = window.tizen.tvaudiocontrol || {};
  defineMissing(window.tizen.tvaudiocontrol, {
    getOutputMode: function () {
      return "PCM";
    }
  });

  window.tizen.messageport = window.tizen.messageport || {};
  defineMissing(window.tizen.messageport, {
    requestRemoteMessagePort: function () {
      return { sendMessage: noop };
    },
    requestLocalMessagePort: function () {
      return {
        addMessagePortListener: function () {
          return 0;
        },
        removeMessagePortListener: noop
      };
    }
  });

  window.webapis = window.webapis || {};

  window.webapis.productinfo = window.webapis.productinfo || {};
  defineMissing(window.webapis.productinfo, {
    getModel: function () {
      return "TizenBrew";
    },
    getRealModel: function () {
      return "TizenBrew";
    },
    getVersion: function () {
      return "TizenBrew";
    },
    getFirmware: function () {
      return "TizenBrew";
    },
    getDuid: function () {
      return stableDeviceId();
    },
    isUdPanelSupported: function () {
      return true;
    },
    is8KPanelSupported: function () {
      return false;
    }
  });

  window.webapis.systeminfo = window.webapis.systeminfo || {};
  defineMissing(window.webapis.systeminfo, {
    isSupportedAudioCodec: function (codec) {
      const supported = ["AAC", "MP3", "AC3", "E-AC3", "OPUS", "VORBIS", "FLAC", "PCM"];
      return supported.includes(String(codec || "").toUpperCase());
    }
  });

  window.webapis.avinfo = window.webapis.avinfo || {};
  defineMissing(window.webapis.avinfo, {
    isHdrTvSupport: function () {
      return false;
    },
    isDolbyVisionSupport: function () {
      return false;
    }
  });

  window.webapis.appcommon = window.webapis.appcommon || {};
  defineMissing(window.webapis.appcommon, {
    AppCommonScreenSaverState: {
      SCREEN_SAVER_OFF: 0,
      SCREEN_SAVER_ON: 1
    },
    setScreenSaver: noop
  });

  console.log("[Moonfin TizenBrew] adapter loaded");
})();
