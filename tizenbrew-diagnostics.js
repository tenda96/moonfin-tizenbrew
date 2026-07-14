"use strict";

(function () {
  if (typeof window === "undefined") return;
  if (window.__MOONFIN_TIZENBREW_DIAG__) return;

  var STORAGE_KEY = "moonfin_tizenbrew_diagnostics";
  var BUILD_LABEL = "debug-panel-v3";
  var MAX_LINES = 600;
  var mediaId = 0;
  var sourceBufferId = 0;
  var networkCount = 0;
  var capabilitySeen = {};
  var watchedMedia = [];
  var lastWatchdogLine = {};
  var mediaUrlPattern = /\/videos\/|\/audio\/|\/items\/[^?#/]+\/playbackinfo|\/playbackinfo|\/sessions\/playing|\/hls|\/stream|\/transcode|\.m3u8(?:[?#]|$)|\.m4s(?:[?#]|$)|\.mp4(?:[?#]|$)|\.ts(?:[?#]|$)|mediasourceid=/i;

  var originalConsole = {
    log: window.console && window.console.log ? window.console.log.bind(window.console) : function () {},
    warn: window.console && window.console.warn ? window.console.warn.bind(window.console) : function () {},
    error: window.console && window.console.error ? window.console.error.bind(window.console) : function () {}
  };

  var state = {
    lines: [],
    visible: false,
    expanded: false,
    overlay: null,
    body: null
  };

  function pad(value) {
    return String(value).length === 1 ? "0" + value : String(value);
  }

  function now() {
    var date = new Date();
    return [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(":");
  }

  function safeText(value) {
    if (value === null) return "null";
    if (typeof value === "undefined") return "undefined";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value && value.name && value.message) return value.name + ": " + value.message;
    if (value && value.message) return value.message;
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
    value = value.replace(/(Authorization%3D)[^&#]+/ig, "$1[redacted]");
    value = value.replace(/(\/Sessions\/)[^/?#]+/ig, "$1[id]");
    value = value.replace(/(\/Users\/)[^/?#]+/ig, "$1[id]");
    if (value.length > 320) value = value.slice(0, 220) + "..." + value.slice(value.length - 70);
    return value;
  }

  function persist() {
    try {
      if (window.localStorage) window.localStorage.setItem(STORAGE_KEY, state.lines.join("\n"));
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

  function isPriorityLine(line) {
    return /\[(playback|media|mse|hls|window\.error|promise\.reject|snapshot|diag\.build)/i.test(line) ||
      /playbackinfo|\/videos\/|\/audio\/|\.m3u8|\.m4s|\.mp4|sessions\/playing/i.test(line);
  }

  function recentMatching(lines, matcher, limit) {
    var result = [];
    for (var i = lines.length - 1; i >= 0 && result.length < limit; i -= 1) {
      if (matcher(lines[i])) result.unshift(lines[i]);
    }
    return result;
  }

  function ensureOverlay() {
    if (state.overlay || !window.document || !document.body) return;

    var overlay = document.createElement("div");
    overlay.id = "moonfin-tizenbrew-diagnostics";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText = [
      "position:fixed",
      "top:0",
      "right:0",
      "bottom:0",
      "width:50vw",
      "min-width:600px",
      "z-index:2147483647",
      "padding:12px 14px",
      "box-sizing:border-box",
      "background:rgba(0,0,0,.94)",
      "color:#eaf4ff",
      "border-left:2px solid rgba(94,210,255,.70)",
      "font:12px/1.32 monospace",
      "white-space:pre-wrap",
      "overflow:hidden",
      "pointer-events:none",
      "display:none",
      "text-shadow:0 1px 2px #000"
    ].join(";");

    var body = document.createElement("div");
    body.style.cssText = "height:calc(100vh - 24px);overflow:hidden;";
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

    var priorityCount = state.expanded ? 90 : 42;
    var allCount = state.expanded ? 120 : 48;
    var priorityLines = recentMatching(state.lines, isPriorityLine, priorityCount);
    var visibleLines = state.lines.slice(Math.max(0, state.lines.length - allCount));
    state.body.textContent = [
      "Moonfin TizenBrew diagnostics " + BUILD_LABEL + " | right panel | yellow toggle | green size | blue snapshot | red clear",
      "== PLAYBACK / MEDIA ==",
      priorityLines.length ? priorityLines.join("\n") : "(no playback/media lines yet)",
      "== RECENT ALL ==",
      visibleLines.join("\n")
    ].join("\n");
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

  function toggleExpanded() {
    state.expanded = !state.expanded;
    log("diag.mode", state.expanded ? "expanded" : "compact", { show: true });
  }

  function isInterestingUrl(url) {
    return mediaUrlPattern.test(safeText(url));
  }

  function isPlaybackInfoUrl(url) {
    return safeText(url).toLowerCase().indexOf("/playbackinfo") !== -1;
  }

  function isManifestUrl(url) {
    return /\.m3u8(?:[?#]|$)/i.test(safeText(url));
  }

  function shouldLogNetwork(url, status, force) {
    if (force) return true;
    if (!isInterestingUrl(url)) return false;
    if (networkCount <= 160) return true;
    if (status === 0 || status >= 400) return true;
    return isPlaybackInfoUrl(url) || isManifestUrl(url);
  }

  function formatError(error) {
    var codes = {
      1: "aborted",
      2: "network",
      3: "decode",
      4: "src_not_supported"
    };
    if (!error) return "error=none";
    return "error=code=" + error.code + "(" + (codes[error.code] || "unknown") + ")" + (error.message ? " " + error.message : "");
  }

  function formatRanges(ranges) {
    var parts = [];
    if (!ranges) return "";
    try {
      for (var i = 0; i < ranges.length && i < 5; i += 1) {
        parts.push(ranges.start(i).toFixed(1) + "-" + ranges.end(i).toFixed(1));
      }
    } catch (e) {}
    return parts.join(",");
  }

  function safeNumber(value) {
    return typeof value === "number" && isFinite(value) ? value.toFixed(2) : String(value);
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

  function mediaState(element) {
    var parts = [
      "ready=" + element.readyState,
      "network=" + element.networkState,
      "paused=" + safeText(element.paused),
      "time=" + safeNumber(element.currentTime),
      "duration=" + safeNumber(element.duration)
    ];
    var buffered = formatRanges(element.buffered);
    if (element.videoWidth || element.videoHeight) parts.push("size=" + element.videoWidth + "x" + element.videoHeight);
    if (buffered) parts.push("buffered=" + buffered);
    if (element.error) parts.push(formatError(element.error));
    return parts.join(" ");
  }

  function rememberMedia(element) {
    for (var i = 0; i < watchedMedia.length; i += 1) {
      if (watchedMedia[i] === element) return;
    }
    watchedMedia.push(element);
  }

  function attachMedia(element) {
    var tagName;
    if (!element || element.__moonfinDiagAttached) return;
    tagName = (element.tagName || "").toLowerCase();
    if (tagName !== "video" && tagName !== "audio") return;

    try {
      element.__moonfinDiagAttached = true;
      element.__moonfinDiagLastBusyAt = 0;
    } catch (e) {
      return;
    }

    rememberMedia(element);
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
      "durationchange",
      "timeupdate"
    ].forEach(function (name) {
      element.addEventListener(name, function (event) {
        var current = event.currentTarget || element;
        var currentSrc = current.currentSrc || current.src || "";
        var suffix = currentSrc ? " src=" + redactUrl(currentSrc) : "";
        if (event.type === "waiting" || event.type === "stalled" || event.type === "loadstart") {
          try {
            current.__moonfinDiagLastBusyAt = Date.now();
          } catch (e) {}
        }
        if (event.type !== "timeupdate" || Math.floor(current.currentTime) % 10 === 0) {
          log("media." + event.type, mediaLabel(current) + " " + mediaState(current) + suffix, { show: true });
        }
      }, false);
    });
  }

  function snapshotMedia() {
    var count = 0;
    attachExistingMedia();
    for (var i = 0; i < watchedMedia.length; i += 1) {
      if (!watchedMedia[i]) continue;
      count += 1;
      log("snapshot.media", mediaLabel(watchedMedia[i]) + " " + mediaState(watchedMedia[i]) + " src=" + redactUrl(watchedMedia[i].currentSrc || watchedMedia[i].src || ""), { show: true });
    }
    if (!count) log("snapshot.media", "no media elements seen", { show: true });
  }

  function watchdog() {
    var nowMs = Date.now();
    for (var i = 0; i < watchedMedia.length; i += 1) {
      var element = watchedMedia[i];
      if (!element || element.paused || element.ended) continue;
      if (element.readyState >= 3 && !element.error) continue;
      var busyAt = element.__moonfinDiagLastBusyAt || 0;
      if (!busyAt || nowMs - busyAt < 7000) continue;
      var label = mediaLabel(element);
      if (lastWatchdogLine[label] && nowMs - lastWatchdogLine[label] < 6000) continue;
      lastWatchdogLine[label] = nowMs;
      log("media.watchdog", label + " stuck>7s " + mediaState(element) + " src=" + redactUrl(element.currentSrc || element.src || ""), { show: true });
    }
  }

  function attachExistingMedia() {
    if (!document || !document.querySelectorAll) return;
    var elements = document.querySelectorAll("video,audio");
    for (var i = 0; i < elements.length; i += 1) attachMedia(elements[i]);
  }

  function summarizeProfile(profile) {
    var parts = [];
    var direct = profile && profile.DirectPlayProfiles ? profile.DirectPlayProfiles : [];
    var trans = profile && profile.TranscodingProfiles ? profile.TranscodingProfiles : [];
    var i;
    parts.push("name=" + safeText(profile && profile.Name));
    parts.push("maxStream=" + safeText(profile && profile.MaxStreamingBitrate));
    for (i = 0; i < direct.length && i < 4; i += 1) {
      parts.push("direct" + (i + 1) + "=" + safeText(direct[i].Type) + ":" + safeText(direct[i].Container) + ":" + safeText(direct[i].VideoCodec || direct[i].AudioCodec || "?"));
    }
    for (i = 0; i < trans.length && i < 5; i += 1) {
      parts.push("trans" + (i + 1) + "=" + safeText(trans[i].Type) + ":" + safeText(trans[i].Protocol) + ":" + safeText(trans[i].Container) + ":" + safeText(trans[i].VideoCodec || trans[i].AudioCodec || "?"));
    }
    log("playback.profile", parts.join(" "), { show: true });
  }

  function summarizePlaybackRequest(body, source) {
    var json;
    if (!body || typeof body !== "string") return;
    try {
      json = JSON.parse(body);
    } catch (e) {
      return;
    }
    log(
      "playback.request",
      source + " startTicks=" + safeText(json.StartTimeTicks) + " maxBitrate=" + safeText(json.MaxStreamingBitrate) + " directPlay=" + safeText(json.EnableDirectPlay) + " directStream=" + safeText(json.EnableDirectStream) + " transcode=" + safeText(json.EnableTranscoding),
      { show: true }
    );
    if (json.DeviceProfile) summarizeProfile(json.DeviceProfile);
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
    log("playback.info", source + " MediaSources=" + sources.length + " error=" + safeText(json.ErrorCode || ""), { show: true });

    for (var i = 0; i < sources.length && i < 4; i += 1) {
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
        "transcodingUrl=" + redactUrl(mediaSource.TranscodingUrl || ""),
        "directUrl=" + redactUrl(mediaSource.DirectStreamUrl || "")
      ];

      if (video) {
        details.push("video=" + safeText(video.Codec || "?") + "/" + safeText(video.Width || "?") + "x" + safeText(video.Height || "?"));
        if (video.Profile) details.push("profile=" + safeText(video.Profile));
        if (video.VideoRangeType) details.push("range=" + safeText(video.VideoRangeType));
      }

      if (audio) details.push("audio=" + safeText(audio.Codec || "?") + "/" + safeText(audio.Channels || "?") + "ch");
      log("playback.source", details.join(" "), { show: true });
    }
  }

  function summarizeManifest(url, body, source) {
    var text = safeText(body);
    var lines;
    var tsCount = 0;
    var m4sCount = 0;
    var mp4Count = 0;
    var map = false;
    var streamInf = false;
    var codecs = [];
    if (!text || text.indexOf("#EXTM3U") !== 0) return;
    lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length && i < 120; i += 1) {
      var line = lines[i];
      if (line.indexOf("#EXT-X-MAP") === 0) map = true;
      if (line.indexOf("#EXT-X-STREAM-INF") === 0) streamInf = true;
      if (/\.ts(?:[?#]|$)/i.test(line)) tsCount += 1;
      if (/\.m4s(?:[?#]|$)/i.test(line)) m4sCount += 1;
      if (/\.mp4(?:[?#]|$)/i.test(line)) mp4Count += 1;
      if (line.indexOf("CODECS=") !== -1 && codecs.length < 3) codecs.push(line.replace(/^#EXT-X-STREAM-INF:/, ""));
    }
    log("hls.manifest", source + " " + redactUrl(url) + " lines=" + lines.length + " master=" + streamInf + " fmp4map=" + map + " ts=" + tsCount + " m4s=" + m4sCount + " mp4=" + mp4Count, { show: true });
    for (var c = 0; c < codecs.length; c += 1) log("hls.codec", codecs[c], { show: true });
  }

  function responseText(response, callback) {
    try {
      if (!response || !response.clone) return;
      response.clone().text().then(callback, function () {});
    } catch (e) {}
  }

  function patchFetch() {
    if (!window.fetch || window.fetch.__moonfinDiagPatched) return;
    var originalFetch = window.fetch;
    var patchedFetch = function (input, init) {
      var url = input && input.url ? input.url : input;
      var method = init && init.method ? init.method : input && input.method ? input.method : "GET";
      var interesting = isInterestingUrl(url);
      var count = 0;

      if (isPlaybackInfoUrl(url) && init && typeof init.body === "string") summarizePlaybackRequest(init.body, "fetch");
      if (interesting) {
        networkCount += 1;
        count = networkCount;
        if (shouldLogNetwork(url, null, false)) log("fetch.start", "#" + count + " " + method + " " + redactUrl(url), { show: true });
      }

      return originalFetch.apply(window, arguments).then(function (response) {
        if (interesting && shouldLogNetwork(url, response.status, false)) {
          log("fetch.done", "#" + count + " " + response.status + " " + method + " " + redactUrl(url) + " type=" + safeText(response.type), { show: true });
        }
        if (isPlaybackInfoUrl(url)) responseText(response, function (body) { summarizePlaybackInfo(body, "fetch"); });
        if (isManifestUrl(url)) responseText(response, function (body) { summarizeManifest(url, body, "fetch"); });
        return response;
      }, function (error) {
        if (interesting) log("fetch.error", method + " " + redactUrl(url) + " " + safeText(error), { show: true });
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

    proto.send = function (body) {
      var request = this.__moonfinDiagRequest;
      if (request && isPlaybackInfoUrl(request.url) && typeof body === "string") summarizePlaybackRequest(body, "xhr");
      if (request && request.interesting) {
        networkCount += 1;
        request.count = networkCount;
        if (shouldLogNetwork(request.url, null, false)) log("xhr.start", "#" + request.count + " " + request.method + " " + redactUrl(request.url), { show: true });
        this.addEventListener("loadend", function () {
          var status = 0;
          try { status = this.status; } catch (e) {}
          if (shouldLogNetwork(request.url, status, false)) log("xhr.done", "#" + request.count + " " + status + " " + request.method + " " + redactUrl(request.url), { show: true });
          if (isPlaybackInfoUrl(request.url)) {
            try { summarizePlaybackInfo(this.responseText, "xhr"); } catch (e) {}
          }
          if (isManifestUrl(request.url)) {
            try { summarizeManifest(request.url, this.responseText, "xhr"); } catch (e) {}
          }
        }, false);
        this.addEventListener("error", function () { log("xhr.error", "#" + request.count + " " + request.method + " " + redactUrl(request.url), { show: true }); }, false);
        this.addEventListener("timeout", function () { log("xhr.timeout", "#" + request.count + " " + request.method + " " + redactUrl(request.url), { show: true }); }, false);
        this.addEventListener("abort", function () { log("xhr.abort", "#" + request.count + " " + request.method + " " + redactUrl(request.url), { show: true }); }, false);
      }
      return originalSend.apply(this, arguments);
    };
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

  function patchCreateElement() {
    if (!document || !document.createElement) return;
    var originalCreateElement = document.createElement;
    document.createElement = function (name) {
      var element = originalCreateElement.apply(document, arguments);
      if (String(name).toLowerCase() === "video" || String(name).toLowerCase() === "audio") {
        setTimeout(function () { attachMedia(element); }, 0);
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
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
      } catch (e) {}
    }

    if (document.documentElement || document.body) start();
    else document.addEventListener("DOMContentLoaded", start, false);
  }

  function patchMediaSource() {
    if (!window.MediaSource || !MediaSource.prototype || MediaSource.__moonfinDiagPatched) return;
    MediaSource.__moonfinDiagPatched = true;

    if (MediaSource.isTypeSupported) {
      var originalIsTypeSupported = MediaSource.isTypeSupported;
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

    if (MediaSource.prototype.addSourceBuffer) {
      var originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
      MediaSource.prototype.addSourceBuffer = function (mimeType) {
        var sourceBuffer;
        log("mse.addSourceBuffer", safeText(mimeType), { show: true });
        try {
          sourceBuffer = originalAddSourceBuffer.apply(this, arguments);
        } catch (error) {
          log("mse.addSourceBuffer.fail", safeText(mimeType) + " " + safeText(error), { show: true });
          throw error;
        }
        attachSourceBuffer(sourceBuffer, mimeType);
        return sourceBuffer;
      };
    }

    ["sourceopen", "sourceended", "sourceclose", "error"].forEach(function (name) {
      try {
        MediaSource.prototype.addEventListener.call(MediaSource.prototype, name, function () {});
      } catch (e) {}
    });

    if (window.URL && URL.createObjectURL && !URL.__moonfinDiagCreateObjectURL) {
      URL.__moonfinDiagCreateObjectURL = true;
      var originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = function (object) {
        var result = originalCreateObjectURL.apply(URL, arguments);
        if (window.MediaSource && object instanceof MediaSource) log("mse.objectURL", redactUrl(result), { show: true });
        return result;
      };
    }
  }

  function attachSourceBuffer(sourceBuffer, mimeType) {
    if (!sourceBuffer || sourceBuffer.__moonfinDiagAttached) return;
    sourceBufferId += 1;
    try {
      sourceBuffer.__moonfinDiagAttached = true;
      sourceBuffer.__moonfinDiagId = sourceBufferId;
    } catch (e) {
      return;
    }

    ["updateend", "error", "abort"].forEach(function (name) {
      sourceBuffer.addEventListener(name, function () {
        log("mse.sb." + name, "sb#" + sourceBuffer.__moonfinDiagId + " " + safeText(mimeType) + " buffered=" + formatRanges(sourceBuffer.buffered), { show: true });
      }, false);
    });

    if (sourceBuffer.appendBuffer && !sourceBuffer.__moonfinDiagAppend) {
      var originalAppendBuffer = sourceBuffer.appendBuffer;
      sourceBuffer.__moonfinDiagAppend = true;
      sourceBuffer.appendBuffer = function (buffer) {
        var length = buffer && (buffer.byteLength || buffer.length) || 0;
        try {
          return originalAppendBuffer.apply(this, arguments);
        } catch (error) {
          log("mse.append.fail", "sb#" + sourceBuffer.__moonfinDiagId + " bytes=" + length + " " + safeText(error), { show: true });
          throw error;
        }
      };
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
          for (var i = 0; i < arguments.length && i < 5; i += 1) {
            if (i > 0) text += " ";
            text += safeText(arguments[i]);
          }
          if (/deviceProfile|webosVideo|html5|hls|video|playback|avplay|media|mse|sourcebuffer/i.test(text) && text.indexOf("[MoonfinDiag]") === -1) {
            log("console." + name, text, { show: /error|failed|fail|exception/i.test(text) });
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
      } else if (key === "ColorF1Green" || code === 404) {
        toggleExpanded();
      } else if (key === "ColorF3Blue" || code === 406) {
        snapshotMedia();
      } else if (key === "ColorF0Red" || code === 403) {
        state.lines = [];
        persist();
        log("diag.clear", "cleared", { show: true });
      }
    }, true);
  }

  function runCapabilityProbe() {
    try {
      var video = document.createElement("video");
      var canPlayTypes = [
        "application/x-mpegURL",
        "application/vnd.apple.mpegURL",
        "video/mp4",
        "video/mp2t",
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
          try { log("probe.mse", type + " => " + safeText(MediaSource.isTypeSupported(type))); } catch (ignored) {}
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
    snapshot: snapshotMedia,
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

  log("diag.build", BUILD_LABEL, { show: false });

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
  setInterval(watchdog, 2500);

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
