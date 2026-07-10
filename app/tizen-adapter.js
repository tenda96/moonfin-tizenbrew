"use strict";

(function () {
  if (typeof window === "undefined") return;

  const noop = function () {};
  const screenRef = window.screen || {};
  const navigatorRef = window.navigator || (typeof navigator !== "undefined" ? navigator : {});
  const localStorageRef = window.localStorage || null;

  window.__MOONFIN_TIZENBREW__ = true;

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
    exit: function () {
      console.log("[Moonfin TizenBrew] application.exit() called");
    },
    hide: function () {
      console.log("[Moonfin TizenBrew] application.hide() called");
    }
  };

  window.tizen = window.tizen || {};

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
    }
  });

  window.tizen.systeminfo = window.tizen.systeminfo || {};
  defineMissing(window.tizen.systeminfo, {
    getCapability: function (capability) {
      const values = {
        "http://tizen.org/feature/platform.version": "3.0",
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
