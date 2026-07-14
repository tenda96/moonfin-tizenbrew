"use strict";

(function () {
  if (typeof window === "undefined") return;
  if (window.__MOONFIN_TIZENBREW_DIAG__) return;

  var originalConsole = {
    log: window.console && window.console.log ? window.console.log.bind(window.console) : function () {},
    warn: window.console && window.console.warn ? window.console.warn.bind(window.console) : function () {},
    error: window.console && window.console.error ? window.console.error.bind(window.console) : function () {}
  };

  var MAX_LINES = 260;
  var STORAGE_KEY = "moonfin_tizenbrew_diagnostics";
  var mediaId = 0;
  var networkCount = 0;
  var mediaUrlPattern = /\/videos\/|\/audio\/|\/playbackinfo|\/hls|\/stream|\/transcode|\.m3u8(?:[?#]|$)|\.m4s(?:[?#]|$)|\.ts(?:[?#]|$)|\.mp4(?:[?#]|$)|mediasourceid=/i;
  var capabilitySeen = {};
  var state = {
    lines: [],
    visible: false,
    overlay: null,
    body: null
  };

  function now() {
    var date = new Date();
    return [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(":");
  }

  function pad(value) {
    return String(value).length === 1 ? "0" + value : String(value);
  }

  function safeText(value) {
    if (value === null) return "null";
    if (typeof value === "undefined") return "undefined";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value && value.message) return value.name ? value.name + ": " + value.message : value.message;

    try {
      return JSON.stringify(value);
    } catch (e) {
      try {
        return Object.prototype.toString.call(value);
      } catch (ignored) {
        return "[unprintable]";
      }
    }
  }

  function redactUrl(input) {
    var value = safeText(input);
    value = value.replace(/([?&](?:api_key|apikey|access_token|token|x-emby-token|x-mediabrowser-token|deviceid)=)[^&#]+/ig, "$1[redacted]");
    value = value.replace(/(\/Sessions\/)[^/?#]+/ig, "$1[id]");
    value = value.replace(/(\/Users\/)[^/?#]+/ig, "$1[id]");
    value = value.replace(/(Authorization%3D)[^&#]+/ig, "$1[redacted]");

    if (value.length > 260) {
      value = value.slice(0, 180) + "..." + value.slice(value.length - 55);
    }

    return value;
  }

  function isInterestingUrl(url) {
    return mediaUrlPattern.test(safeText(url));
  }

  function isPlaybackInfoUrl(url) {
    return safeText(url).toLowerCase().indexOf("/playbackinfo") !== -1;
  }

  function shouldLogNetwork(url, status, force) {
    if (force) return true;
    if (!isInterestingUrl(url)) return false;
    if (networkCount <= 80) return true;
    if (status === 0 || status >= 400) return true;
    return /\.m3u8(?:[?#]|$)|\/playbackinfo/i.test(safeText(url));
  }

  function persist() {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, state.lines.join("\n"));
      }
    } catch (e) {}
  }

  function log(kind, message, options) {
    var line = now() + " [" + kind + "] " + message;
    state.lines.push(line);
    while (state.lines.length > MAX_LINES) state.lines.shift();
    persist();

    if (options && options.show) showOverlay();
    renderOverlay();

    try {
      originalConsole.log("[MoonfinDiag]", line);
    } catch (e) {}
  }

  function ensureOverlay() {
    if (state.overlay || !window.document || !document.body) return;

    var overlay = document.createElement("div");
    overlay.id = "moonfin-tizenbrew-diagnostics";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = [
      "position:fixed",
      "left:18px",
      "right:18px",
      "bottom:18px",
      "z-index:2147483647",
      "max-height:46vh",
      "padding:14px 16px",
      "box-sizing:border-box",
      "background:rgba(0,0,0,.86)",
      "color:#e9f2ff",
      "border:1px solid rgba(255,255,255,.22)",
      "font:18px/1.35 monospace",
      "white-space:pre-wrap",
      "overflow:hidden",
      "pointer-events:none",
      "display:none",
      "text-shadow:0 1px 2px #000"
    ].join(";");

    var body = document.createElement("div");
    body.style.cssText = "max-height:calc(46vh - 28px);overflow:hidden;";
    overlay.appendChild(body);
    document.body.appendChild(overlay);

    state.overlay = overlay;
    state.body = body;
    renderOverlay();
  }

  function renderOverlay() {
    ensureOverlay();
    if (!state.overlay || !state.body) return;
    state.overlay.style.display = state.visible ? "block" : "none";
    if (!state.visible) return;

    var visibleLines = state.lines.slice(Math.max(0, state.lines.length - 28));
    state.body.textContent = "Moonfin TizenBrew diagnostics - yellow toggles\n" + visibleLines.join("\n");
  }

  function showOverlay() {
    state.visible = true;
    ensureOverlay();
    renderOverlay();
  }

  function toggleOverlay() {
    state.visible = !state.visible;
    renderOverlay();
  }

  function formatError(error) {
    if (!error) return "none";
    var codes = {
      1: "aborted",
      2: "network",
      3: "decode",
      4: "src_not_supported"
    };
    return "code=" + error.code + "(" + (codes[error.code] || "unknown") + ")" + (error.message ? " " + error.message : "");
  }

  function formatRanges(ranges) {
    var parts = [];
    if (!ranges) return "";
    try {
      for (var i = 0; i < ranges.length && i < 4; i += 1) {
        parts.push(ranges.start(i).toFixed(1) + "-" + ranges.end(i).toFixed(1));
      }
    } catch (e) {}
    return parts.join(",");
  }

  function safeNumber(value) {
    return typeof value === "number" && isFinite(value) ? value.toFixed(2) : String(value);
  }

  function mediaState(element) {
    var parts = [
      "ready=" + element.readyState,
      "network=" + element.networkState,
      "time=" + safeNumber(element.currentTime),
      "duration=" + safeNumber(element.duration)
    ];
    var buffered = formatRanges(element.buffered);

    if (element.videoWidth || element.videoHeight) {
      parts.push("size=" + element.videoWidth + "x" + element.videoHeight);
    }
    if (buffered) parts.push("buffered=" + buffered);
    if (element.error) parts.push(formatError(element.error));

    return parts.join(" ");
  }

  function mediaLabel(element) {
    if (!element.__moonfinDiagMediaId) {
      mediaId += 1;
      try {
        element.__moonfinDiagMediaId = mediaId;
      } catch (e) {
        return "media";
      }
    }

    return (element.tagName || "media").toLowerCase() + "#" + element.__moonfinDiagMediaId;
  }

  function attachMedia(element) {
    if (!element || element.__moonfinDiagAttached) return;
    var tagName = (element.tagName || "").toLowerCase();
    if (tagName !== "video" && tagName !== "audio") return;

    try {
      element.__moonfinDiagAttached = true;
    } catch (e) {
      return;
    }

    log("media.attach", mediaLabel(element) + " " + mediaState(element), { show: true });

    [
      "loadstart",
      "loadedmetadata",
      "loadeddata",
      "canplay",
      "canplaythrough",
      "play",
      "playing",
      "pause",
      "waiting",
      "stalled",
      "suspend",
      "progress",
      "error",
      "abort",
      "emptied",
      "ended",
      "seeking",
      "seeked",
      "durationchange"
    ].forEach(function (name) {
      element.addEventListener(name, function (event) {
        var current = event.currentTarget || element;
        var currentSrc = current.currentSrc || current.src || "";
        var suffix = currentSrc ? " src=" + redactUrl(currentSrc) : "";
        log("media." + event.type, mediaLabel(current) + " " + mediaState(current) + suffix, { show: true });
      }, false);
    });
  }

  function attachExistingMedia() {
    if (!document || !document.querySelectorAll) return;
    var elements = document.querySelectorAll("video,audio");
    for (var i = 0; i < elements.length; i += 1) {
      attachMedia(elements[i]);
    }
  }

  function patchCreateElement() {
    if (!document || !document.createElement) return;
    var originalCreateElement = document.createElement;
    document.createElement = function (name) {
      var element = originalCreateElement.apply(document, arguments);
      if (String(name).toLowerCase() === "video" || String(name).toLowerCase() === "audio") {
        setTimeout(function () {
          if (element.parentNode || element.src || element.currentSrc) {
            attachMedia(element);
          }
        }, 0);
      }
      return element;
    };
  }

  function patchMutationObserver() {
    if (!window.MutationObserver || !document) return;
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i += 1) {
        var nodes = mutations[i].addedNodes || [];
        for (var n = 0; n < nodes.length; n += 1) {
          var node = nodes[n];
          if (node && node.nodeType === 1) {
            attachMedia(node);
            if (node.querySelectorAll) {
              var media = node.querySelectorAll("video,audio");
              for (var m = 0; m < media.length; m += 1) attachMedia(media[m]);
            }
          }
        }
      }
    });

    function start() {
      try {
        observer.observe(document.documentElement || document.body, {
          childList: true,
          subtree: true
        });
      } catch (e) {}
    }

    if (document.documentElement || document.body) start();
    else document.addEventListener("DOMContentLoaded", start, false);
  }

  function patchMediaElement() {
    if (!window.HTMLMediaElement || !HTMLMediaElement.prototype) return;
    var proto = HTMLMediaElement.prototype;

    if (proto.canPlayType && !proto.__moonfinDiagCanPlayType) {
      proto.__moonfinDiagCanPlayType = true;
      var originalCanPlayType = proto.canPlayType;
      proto.canPlayType = function (type) {
        var result = originalCanPlayType.apply(this, arguments);
        var key = safeText(type) + "=>" + safeText(result);
        if (!capabilitySeen[key]) {
          capabilitySeen[key] = true;
          log("cap.canPlayType", safeText(type) + " => " + safeText(result));
        }
        return result;
      };
    }

    if (proto.load && !proto.__moonfinDiagLoad) {
      proto.__moonfinDiagLoad = true;
      var originalLoad = proto.load;
      proto.load = function () {
        attachMedia(this);
        log("media.load", mediaLabel(this) + " " + mediaState(this) + " src=" + redactUrl(this.currentSrc || this.src || ""), { show: true });
        return originalLoad.apply(this, arguments);
      };
    }

    if (proto.play && !proto.__moonfinDiagPlay) {
      proto.__moonfinDiagPlay = true;
      var originalPlay = proto.play;
      proto.play = function () {
        var element = this;
        var result;
        attachMedia(element);
        log("media.play.call", mediaLabel(element) + " " + mediaState(element) + " src=" + redactUrl(element.currentSrc || element.src || ""), { show: true });
        result = originalPlay.apply(element, arguments);
        if (result && typeof result.then === "function") {
          result.then(function () {
            log("media.play.ok", mediaLabel(element) + " " + mediaState(element), { show: true });
          }, function (error) {
            log("media.play.fail", mediaLabel(element) + " " + safeText(error) + " " + mediaState(element), { show: true });
          });
        }
        return result;
      };
    }

    try {
      var descriptor = Object.getOwnPropertyDescriptor(proto, "src");
      if (descriptor && descriptor.set && descriptor.configurable && !proto.__moonfinDiagSrc) {
        proto.__moonfinDiagSrc = true;
        Object.defineProperty(proto, "src", {
          configurable: true,
          enumerable: descriptor.enumerable,
          get: descriptor.get,
          set: function (value) {
            attachMedia(this);
            log("media.src", mediaLabel(this) + " <= " + redactUrl(value), { show: true });
            return descriptor.set.call(this, value);
          }
        });
      }
    } catch (e) {
      log("diag.warn", "could not patch media src setter: " + safeText(e));
    }
  }

  function patchSetAttribute() {
    if (!window.Element || !Element.prototype || !Element.prototype.setAttribute) return;
    var originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      var tagName = (this.tagName || "").toLowerCase();
      if ((tagName === "video" || tagName === "audio" || tagName === "source") && String(name).toLowerCase() === "src") {
        if (tagName === "video" || tagName === "audio") attachMedia(this);
        log("media.attr.src", tagName + " <= " + redactUrl(value), { show: true });
      }
      return originalSetAttribute.apply(this, arguments);
    };
  }

  function patchMediaSource() {
    if (!window.MediaSource || !MediaSource.isTypeSupported || MediaSource.__moonfinDiagPatched) return;
    var originalIsTypeSupported = MediaSource.isTypeSupported;
    MediaSource.__moonfinDiagPatched = true;
    MediaSource.isTypeSupported = function (type) {
      var result = originalIsTypeSupported.apply(MediaSource, arguments);
      var key = safeText(type) + "=>" + safeText(result);
      if (!capabilitySeen["mse:" + key]) {
        capabilitySeen["mse:" + key] = true;
        log("cap.mse", safeText(type) + " => " + safeText(result));
      }
      return result;
    };
  }

  function patchFetch() {
    if (!window.fetch || window.fetch.__moonfinDiagPatched) return;
    var originalFetch = window.fetch;
    var patchedFetch = function (input, init) {
      var url = input && input.url ? input.url : input;
      var method = init && init.method ? init.method : input && input.method ? input.method : "GET";
      var interesting = isInterestingUrl(url);
      var count = 0;

      if (interesting) {
        networkCount += 1;
        count = networkCount;
        if (shouldLogNetwork(url, null, false)) {
          log("fetch.start", "#" + count + " " + method + " " + redactUrl(url), { show: true });
        }
      }

      return originalFetch.apply(window, arguments).then(function (response) {
        if (interesting && shouldLogNetwork(url, response.status, false)) {
          log("fetch.done", "#" + count + " " + response.status + " " + method + " " + redactUrl(url), { show: true });
        }

        if (isPlaybackInfoUrl(url) && response && response.clone) {
          try {
            response.clone().text().then(function (body) {
              summarizePlaybackInfo(body, "fetch");
            }, function () {});
          } catch (e) {}
        }

        return response;
      }, function (error) {
        if (interesting) {
          log("fetch.error", method + " " + redactUrl(url) + " " + safeText(error), { show: true });
        }
        throw error;
      });
    };
    patchedFetch.__moonfinDiagPatched = true;
    window.fetch = patchedFetch;
  }

  function patchXhr() {
    if (!window.XMLHttpRequest || XMLHttpRequest.prototype.__moonfinDiagPatched) return;
    var proto = XMLHttpRequest.prototype;
    var originalOpen = proto.open;
    var originalSend = proto.send;
    proto.__moonfinDiagPatched = true;

    proto.open = function (method, url) {
      this.__moonfinDiagRequest = {
        method: method || "GET",
        url: url,
        interesting: isInterestingUrl(url)
      };
      return originalOpen.apply(this, arguments);
    };

    proto.send = function () {
      var request = this.__moonfinDiagRequest;
      if (request && request.interesting) {
        networkCount += 1;
        request.count = networkCount;
        if (shouldLogNetwork(request.url, null, false)) {
          log("xhr.start", "#" + request.count + " " + request.method + " " + redactUrl(request.url), { show: true });
        }

        this.addEventListener("loadend", function () {
          var status = 0;
          try {
            status = this.status;
          } catch (e) {}
          if (shouldLogNetwork(request.url, status, false)) {
            log("xhr.done", "#" + request.count + " " + status + " " + request.method + " " + redactUrl(request.url), { show: true });
          }

          if (isPlaybackInfoUrl(request.url)) {
            try {
              summarizePlaybackInfo(this.responseText, "xhr");
            } catch (e) {}
          }
        }, false);

        this.addEventListener("error", function () {
          log("xhr.error", "#" + request.count + " " + request.method + " " + redactUrl(request.url), { show: true });
        }, false);

        this.addEventListener("timeout", function () {
          log("xhr.timeout", "#" + request.count + " " + request.method + " " + redactUrl(request.url), { show: true });
        }, false);

        this.addEventListener("abort", function () {
          log("xhr.abort", "#" + request.count + " " + request.method + " " + redactUrl(request.url), { show: true });
        }, false);
      }

      return originalSend.apply(this, arguments);
    };
  }

  function summarizePlaybackInfo(body, source) {
    var json;
    var sources;
    if (!body || typeof body !== "string") return;

    try {
      json = JSON.parse(body);
    } catch (e) {
      return;
    }

    sources = json.MediaSources || [];
    log("playback.info", source + " MediaSources=" + sources.length, { show: true });

    for (var i = 0; i < sources.length && i < 3; i += 1) {
      var mediaSource = sources[i] || {};
      var streams = mediaSource.MediaStreams || [];
      var video = null;
      var audio = null;

      for (var s = 0; s < streams.length; s += 1) {
        if (streams[s] && streams[s].Type === "Video" && !video) video = streams[s];
        if (streams[s] && streams[s].Type === "Audio" && !audio) audio = streams[s];
      }

      var details = [
        "src" + (i + 1),
        "container=" + safeText(mediaSource.Container || "?"),
        "directPlay=" + safeText(mediaSource.SupportsDirectPlay),
        "directStream=" + safeText(mediaSource.SupportsDirectStream),
        "transcode=" + safeText(mediaSource.SupportsTranscoding),
        "transcodingUrl=" + safeText(!!mediaSource.TranscodingUrl),
        "directStreamUrl=" + safeText(!!mediaSource.DirectStreamUrl)
      ];

      if (video) {
        details.push("video=" + safeText(video.Codec || "?") + "/" + safeText(video.Width || "?") + "x" + safeText(video.Height || "?"));
        if (video.VideoRangeType) details.push("range=" + safeText(video.VideoRangeType));
      }

      if (audio) {
        details.push("audio=" + safeText(audio.Codec || "?") + "/" + safeText(audio.Channels || "?") + "ch");
      }

      log("playback.source", details.join(" "), { show: true });
    }
  }

  function patchConsole() {
    if (!window.console || window.console.__moonfinDiagPatched) return;
    window.console.__moonfinDiagPatched = true;
    ["log", "warn", "error"].forEach(function (name) {
      var original = window.console[name] ? window.console[name].bind(window.console) : function () {};
      window.console[name] = function () {
        try {
          var text = "";
          for (var i = 0; i < arguments.length && i < 4; i += 1) {
            if (i > 0) text += " ";
            text += safeText(arguments[i]);
          }

          if (/deviceProfile|webosVideo|html5|hls|video|playback|avplay|media/i.test(text) && text.indexOf("[MoonfinDiag]") === -1) {
            log("console." + name, text);
          }
        } catch (e) {}

        return original.apply(window.console, arguments);
      };
    });
  }

  function patchErrors() {
    window.addEventListener("error", function (event) {
      log("window.error", safeText(event.message || event.error) + " @" + safeText(event.filename) + ":" + safeText(event.lineno), { show: true });
    }, true);

    window.addEventListener("unhandledrejection", function (event) {
      log("promise.reject", safeText(event.reason), { show: true });
    }, true);
  }

  function patchKeyboard() {
    if (!document || document.__moonfinDiagKeyboard) return;
    document.__moonfinDiagKeyboard = true;
    document.addEventListener("keydown", function (event) {
      var key = event.key || "";
      var code = event.keyCode || event.which;
      if (key === "ColorF2Yellow" || code === 405) {
        toggleOverlay();
        log("diag.toggle", "overlay " + (state.visible ? "shown" : "hidden"));
      }
    }, true);
  }

  function runCapabilityProbe() {
    try {
      var video = document.createElement("video");
      var canPlayTypes = [
        "application/x-mpegURL",
        "application/vnd.apple.mpegURL",
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        'video/mp4; codecs="avc1.640028, mp4a.40.2"',
        'video/mp4; codecs="hvc1.1.6.L120.90, mp4a.40.2"',
        'video/webm; codecs="vp9, opus"',
        'video/mp2t; codecs="avc1.42E01E, mp4a.40.2"'
      ];

      for (var i = 0; i < canPlayTypes.length; i += 1) {
        try {
          log("probe.canPlayType", canPlayTypes[i] + " => " + safeText(video.canPlayType(canPlayTypes[i])));
        } catch (e) {
          log("probe.canPlayType", canPlayTypes[i] + " => error " + safeText(e));
        }
      }

      if (window.MediaSource && MediaSource.isTypeSupported) {
        [
          'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
          'video/mp4; codecs="avc1.640028, mp4a.40.2"',
          'video/mp4; codecs="hvc1.1.6.L120.90, mp4a.40.2"',
          'video/mp2t; codecs="avc1.42E01E, mp4a.40.2"'
        ].forEach(function (type) {
          try {
            log("probe.mse", type + " => " + safeText(MediaSource.isTypeSupported(type)));
          } catch (ignored) {}
        });
      } else {
        log("probe.mse", "MediaSource unavailable");
      }

      log("probe.webapis", "webapis=" + safeText(!!window.webapis) + " avplay=" + safeText(!!(window.webapis && window.webapis.avplay)) + " ua=" + safeText(window.navigator && navigator.userAgent));
    } catch (e) {
      log("probe.error", safeText(e));
    }
  }

  window.__MOONFIN_TIZENBREW_DIAG__ = {
    log: log,
    show: showOverlay,
    hide: function () {
      state.visible = false;
      renderOverlay();
    },
    toggle: toggleOverlay,
    clear: function () {
      state.lines = [];
      persist();
      renderOverlay();
    },
    dump: function () {
      return state.lines.join("\n");
    },
    storageKey: STORAGE_KEY
  };

  patchConsole();
  patchErrors();
  patchCreateElement();
  patchMutationObserver();
  patchMediaElement();
  patchSetAttribute();
  patchMediaSource();
  patchFetch();
  patchXhr();
  patchKeyboard();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ensureOverlay();
      attachExistingMedia();
      setTimeout(runCapabilityProbe, 0);
    }, false);
  } else {
    ensureOverlay();
    attachExistingMedia();
    setTimeout(runCapabilityProbe, 0);
  }

  log("boot", "Moonfin TizenBrew diagnostics loaded flag=" + safeText(window.__MOONFIN_TIZENBREW__) + " protocol=" + safeText(window.location && location.protocol));
})();
