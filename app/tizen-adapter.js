"use strict";

(function () {
  if (typeof window === "undefined") return;

  window.__MOONFIN_TIZENBREW__ = true;

  const currentApplication = {
    appInfo: {
      version: "TIZENBREW"
    },
    exit: function () {
      console.log("[Moonfin TizenBrew] application.exit() called");
    },
    hide: function () {
      console.log("[Moonfin TizenBrew] application.hide() called");
    }
  };

  window.tizen = window.tizen || {};

  window.tizen.application = window.tizen.application || {
    getCurrentApplication: function () {
      return currentApplication;
    }
  };

  window.tizen.systeminfo = window.tizen.systeminfo || {
    getPropertyValue: function (property, successCallback, errorCallback) {
      try {
        const values = {
          DISPLAY: {
            resolutionWidth: window.screen.width || window.innerWidth || 1920,
            resolutionHeight: window.screen.height || window.innerHeight || 1080
          },
          BUILD: {
            model: "TizenBrew",
            manufacturer: "Samsung",
            buildVersion: "TizenBrew"
          },
          LOCALE: {
            language: navigator.language || "en-US",
            country: "US"
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
  };

  window.tizen.tvinputdevice = window.tizen.tvinputdevice || {
    registerKey: function () {},
    unregisterKey: function () {},
    getSupportedKeys: function () {
      return [
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
        { name: "Return", code: 10009 },
        { name: "Exit", code: 10182 }
      ];
    }
  };

  window.webapis = window.webapis || {};

  window.webapis.productinfo = window.webapis.productinfo || {
    getModel: function () {
      return "TizenBrew";
    },
    getVersion: function () {
      return "TizenBrew";
    },
    isUdPanelSupported: function () {
      return true;
    },
    is8KPanelSupported: function () {
      return false;
    }
  };

  console.log("[Moonfin TizenBrew] adapter loaded");
})();
