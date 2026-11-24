/* Put Client Studio on your phone (24 Nov 2026).
   Loaded in the page's <head>, so it can catch Android's install offer as early as it comes.
   - Android (Chrome, Edge, Samsung Internet): one tap, then the phone's own "Install" box.
   - iPhone and iPad: a page can't add itself, so a two-step guide for the browser in use, with a pointer.
   - Inside Facebook, Instagram, Gmail and other apps: say how to get out to Safari or Chrome, and copy the link.
   - Offered once as a small card after the person's first answer; always in the phone's "⋯" menu.
   - Never offered when already opened from the home screen, and never on a laptop.
   The home-screen icon opens the person's own link: the page's manifest is written here with this page's address
   as its start (a data: manifest, one per link), and the page also keeps the last link in this browser. */
(function () {
  "use strict";
  var ua = navigator.userAgent || "";
  var params = new URLSearchParams(location.search);
  var EMBEDDED = params.has("in") || window.top !== window;          // inside the board, the library or a frame
  var IPADOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  var IOS = /iPhone|iPod|iPad/.test(ua) || IPADOS;
  var IPAD = /iPad/.test(ua) || IPADOS;
  var ANDROID = /Android/i.test(ua);
  var MOBILE = IOS || ANDROID;                                         // a laptop never gets the offer
  var KEY = "m7r-a2hs";
  var TEAL = "#2c6a72";                                                // the darker brand teal: light status-bar text stays readable
  var SNOOZE_DAYS = 7;

  function standalone() {
    try {
      return !!(navigator.standalone || (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches)));
    } catch (e) { return false; }
  }

  // in-app browsers that don't offer "Add to Home Screen". WhatsApp opens links in the phone's own browser today,
  // so it only counts when its own marker is in the address of the browser.
  var APPS = [
    [/MessengerForiOS|\bMessenger\b|Orca-Android/, "Messenger"],
    [/Instagram/, "Instagram"],
    [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/, "Facebook"],
    [/\bGSA\//, "the Google app"],
    [/LinkedInApp/, "LinkedIn"],
    [/musical_ly|BytedanceWebview|TikTok|trill_/i, "TikTok"],
    [/Snapchat/, "Snapchat"],
    [/Pinterest/, "Pinterest"],
    [/Twitter/, "X"],
    [/\bLine\//, "LINE"],
    [/WhatsApp/, "WhatsApp"]
  ];
  function inApp() {
    for (var i = 0; i < APPS.length; i++) if (APPS[i][0].test(ua)) return APPS[i][1];
    if (ANDROID && /; wv\)/.test(ua)) return "this app";
    return null;
  }

  function browser() {
    if (IOS) {
      if (/CriOS/.test(ua)) return "chrome";
      if (/FxiOS/.test(ua)) return "firefox";
      if (/EdgiOS/.test(ua)) return "edge";
      return "safari";
    }
    if (/SamsungBrowser/.test(ua)) return "samsung";
    if (/EdgA/.test(ua)) return "edge";
    if (/Firefox/.test(ua)) return "firefox";
    return "chrome";
  }
  var SAFARI_VER = (function () { var m = ua.match(/Version\/(\d+)/); return m ? +m[1] : 0; })();

  // ---------- remembered choices ----------
  function getPref() { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch (e) { return {}; } }
  function setPref(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }

  // ---------- the person's own link ----------
  function myLink() {
    var u = new URL(location.href);
    ["tour", "t"].forEach(function (k) { u.searchParams.delete(k); });
    return u.href;
  }

  // ---------- the manifest: this page's own address as its start ----------
  var appName = "Client Studio";
  function writeManifest() {
    try {
      var base = location.href.split("?")[0].replace(/[^/]*$/, "");
      var m = {
        id: myLink(), name: appName, short_name: "Client Studio", description: "Look at your work and tell us what you think.",
        start_url: myLink(), scope: base, display: "standalone", orientation: "portrait",
        background_color: "#faf9f6", theme_color: TEAL,
        icons: [
          { src: base + "assets/studio-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: base + "assets/studio-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: base + "assets/studio-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      };
      var href = "data:application/manifest+json," + encodeURIComponent(JSON.stringify(m));
      var l = document.querySelector('link[rel="manifest"]');
      if (!l) { l = document.createElement("link"); l.rel = "manifest"; document.head.appendChild(l); }
      if (l.getAttribute("href") !== href) l.setAttribute("href", href);
    } catch (e) {}
  }
  // the icon iPhones use (a solid tile: a see-through one turns black on the home screen)
  function iosIcon() {
    var l = document.querySelector('link[rel="apple-touch-icon"]');
    if (!l) { l = document.createElement("link"); l.rel = "apple-touch-icon"; document.head.appendChild(l); }
    l.setAttribute("href", "assets/studio-icon-180.png");
  }
  // the brand teal in the phone's top bar once it runs from the home screen
  function statusBar() {
    if (!standalone()) return;
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    m.setAttribute("content", TEAL);
  }

  if (!EMBEDDED) {
    writeManifest(); iosIcon(); statusBar();
    // the client's name, once the page knows it ("Numri · Client Studio"), goes into the app's full name
    var watchTitle = function () {
      var t = document.title || "", m = t.match(/^(.+?) · Client Studio$/);
      var n = m ? m[1] + " · Client Studio" : "Client Studio";
      if (n !== appName) { appName = n; writeManifest(); }
    };
    document.addEventListener("DOMContentLoaded", function () {
      var tl = document.querySelector("title");
      if (tl && window.MutationObserver) new MutationObserver(watchTitle).observe(tl, { childList: true, characterData: true, subtree: true });
      watchTitle();
    });
  }

  // ---------- Android's install offer ----------
  var offer = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); offer = e; });
  window.addEventListener("appinstalled", function () { offer = null; var p = getPref(); p.added = Date.now(); setPref(p); closeAll(); });
  // a small service worker: some Android browsers still want one before they offer "Install". It keeps nothing.
  if (!EMBEDDED && MOBILE && "serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  // ---------- small helpers ----------
  function el(tag, attrs) {
    var n = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;               // only our own fixed drawings
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    [].concat.apply([], kids).forEach(function (c) { if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return n;
  }
  var SVG = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v9A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17.5 9H16"/><path d="M12 3v11M8.5 6.5 12 3l3.5 3.5"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    vdots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    lines: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M6 13l6 6 6-6"/></svg>'
  };

  var CSS = [
    "#m7i-card, #m7i-sheet { font-family: inherit; color: #111214; }",
    "#m7i-card { position: fixed; left: 12px; right: 12px; bottom: calc(max(12px, env(safe-area-inset-bottom)) + 4px); z-index: 120; max-width: 460px; margin: 0 auto;",
    "  background: #faf9f6; border: 1px solid #dfe6e6; border-radius: 20px; box-shadow: 0 16px 40px rgba(17,18,20,.22); padding: 16px 16px 12px; display: grid; gap: 10px;",
    "  animation: m7i-up .35s ease-out; }",
    "#m7i-card .m7i-top { display: grid; grid-template-columns: 48px 1fr; gap: 12px; align-items: center; }",
    "#m7i-card img { width: 48px; height: 48px; border-radius: 12px; box-shadow: 0 1px 4px rgba(17,18,20,.16); }",
    "#m7i-card b { display: block; font-size: 16px; line-height: 1.25; }",
    "#m7i-card p, #m7i-sheet p { margin: 0; font-size: 14px; line-height: 1.4; color: #4a5557; }",
    ".m7i-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }",
    ".m7i-go { flex: 1 1 auto; min-height: 46px; border: 0; border-radius: 999px; background: #2c6a72; color: #faf9f6; font: inherit; font-weight: 700; font-size: 15px; padding: 0 18px; cursor: pointer; }",
    ".m7i-soft { min-height: 46px; border: 1px solid #dfe6e6; border-radius: 999px; background: #f4f1ec; color: #111214; font: inherit; font-weight: 600; font-size: 15px; padding: 0 16px; cursor: pointer; }",
    ".m7i-link { border: 0; background: none; color: #4a5557; font: inherit; font-size: 13px; text-decoration: underline; padding: 6px 2px; cursor: pointer; }",
    "#m7i-shade { position: fixed; inset: 0; z-index: 121; background: rgba(17,18,20,.42); }",
    "#m7i-sheet { position: fixed; left: 12px; right: 12px; z-index: 122; max-width: 460px; margin: 0 auto; background: #faf9f6; border-radius: 22px;",
    "  box-shadow: 0 18px 50px rgba(17,18,20,.3); padding: 20px 18px 14px; display: grid; gap: 14px; animation: m7i-up .3s ease-out; }",
    "#m7i-sheet.at-top { top: max(14px, env(safe-area-inset-top)); }",
    "#m7i-sheet.at-bottom { bottom: max(14px, env(safe-area-inset-bottom)); }",
    "#m7i-sheet h2 { margin: 0; font-size: 19px; line-height: 1.25; }",
    "#m7i-sheet ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }",
    "#m7i-sheet li { display: grid; grid-template-columns: 30px 112px 1fr; gap: 10px; align-items: center; }",
    "#m7i-sheet .m7i-n { width: 30px; height: 30px; border-radius: 50%; background: #2c6a72; color: #faf9f6; display: grid; place-items: center; font-weight: 800; font-size: 15px; }",
    "#m7i-sheet .m7i-pic { position: relative; width: 112px; height: 72px; border-radius: 12px; background: #e6eeee; border: 1px solid #dfe6e6; overflow: hidden; }",
    "#m7i-sheet .m7i-t { font-size: 15px; line-height: 1.35; }",
    "#m7i-sheet .m7i-t small { display: block; color: #4a5557; font-size: 13px; margin-top: 2px; }",
    /* the small pictures */
    ".m7i-bar { position: absolute; left: 0; right: 0; height: 26px; background: #faf9f6; display: flex; align-items: center; justify-content: space-between; padding: 0 7px; }",
    ".m7i-bar.bottom { bottom: 0; border-top: 1px solid #dfe6e6; } .m7i-bar.top { top: 0; border-bottom: 1px solid #dfe6e6; }",
    ".m7i-bar .ph { width: 9px; height: 4px; border-radius: 2px; background: #cfd8d9; } .m7i-bar .hot { position: relative; width: 20px; height: 20px; padding: 2px; border-radius: 6px; color: #2c6a72; background: #dff3ea; }",
    ".m7i-bar .addr { flex: 1; height: 10px; margin: 0 8px; border-radius: 5px; background: #dfe6e6; }",
    ".m7i-bar svg, .m7i-menu svg, .m7i-big svg { width: 100%; height: 100%; display: block; }",
    ".m7i-menu { position: absolute; left: 6px; right: 6px; top: 7px; bottom: 7px; background: #faf9f6; border-radius: 8px; border: 1px solid #dfe6e6; display: grid; align-content: center; gap: 2px; padding: 3px 4px; }",
    ".m7i-menu i { position: relative; display: flex; align-items: center; gap: 4px; font-style: normal; font-size: 7.5px; line-height: 1; white-space: nowrap; color: #4a5557; height: 16px; padding: 0 3px; }",
    ".m7i-menu i.hot { color: #111214; font-weight: 700; background: #dff3ea; border-radius: 4px; }",
    ".m7i-menu i > span:first-child { width: 10px; height: 10px; flex: none; display: block; color: #2c6a72; }",
    ".m7i-big { position: absolute; inset: 12px 18px; color: #2c6a72; }",
    ".m7i-tap { position: absolute; right: -5px; bottom: -5px; width: 13px; height: 13px; border-radius: 50%; background: rgba(239,195,25,.9); box-shadow: 0 0 0 3px rgba(239,195,25,.35); animation: m7i-tap 1.6s ease-in-out infinite; }",
    /* the pointer on the real screen */
    "#m7i-point { position: fixed; z-index: 123; width: 46px; height: 46px; border-radius: 50%; background: #efc319; color: #111214; display: grid; place-items: center;",
    "  box-shadow: 0 6px 18px rgba(17,18,20,.3); pointer-events: none; }",
    "#m7i-point svg { width: 26px; height: 26px; }",
    "#m7i-point.down { animation: m7i-down 1.4s ease-in-out infinite; } #m7i-point.up { animation: m7i-uptip 1.4s ease-in-out infinite; } #m7i-point.up svg { transform: rotate(180deg); }",
    "@keyframes m7i-up { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }",
    "@keyframes m7i-down { 0%, 100% { transform: translateY(-6px); } 50% { transform: translateY(6px); } }",
    "@keyframes m7i-uptip { 0%, 100% { transform: translateY(6px); } 50% { transform: translateY(-6px); } }",
    "@keyframes m7i-tap { 0%, 100% { transform: scale(.75); opacity: .55; } 50% { transform: scale(1.1); opacity: 1; } }",
    "@media (prefers-reduced-motion: reduce) { #m7i-point, .m7i-tap, #m7i-card, #m7i-sheet { animation: none !important; } }",
    "body.night #m7i-card, body.night #m7i-sheet { background: #1b2326; color: #eef2f2; border-color: #2e3a3d; }",
    "body.night #m7i-card p, body.night #m7i-sheet p, body.night #m7i-sheet .m7i-t small, body.night .m7i-link { color: #b8c4c6; }",
    "body.night .m7i-soft { background: #263033; color: #eef2f2; border-color: #2e3a3d; }"
  ].join("\n");
  function css() { if (!document.getElementById("m7i-css")) document.head.appendChild(el("style", { id: "m7i-css", text: CSS })); }

  function closeAll() { ["m7i-card", "m7i-sheet", "m7i-shade", "m7i-point"].forEach(function (id) { var n = document.getElementById(id); if (n) n.remove(); }); }
  function say(msg) { if (typeof window.showToast === "function") { try { showToast(msg); if (typeof window.hideToastLater === "function") hideToastLater(5000); return; } catch (e) {} } }

  function copyLink(btn) {
    var link = myLink(), done = function () { btn.textContent = "Copied. Paste it in " + (IOS ? "Safari" : "Chrome"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, fallback); else fallback();
    function fallback() {
      try { var t = el("textarea", { readonly: true, style: "position:fixed;top:-100px;opacity:0" }); t.value = link; document.body.append(t); t.select(); document.execCommand("copy"); t.remove(); done(); }
      catch (e) { window.prompt("Copy your link:", link); }
    }
  }

  // ---------- what this phone needs ----------
  function situation() {
    var app = inApp();
    if (app) return { kind: "inapp", app: app };
    if (ANDROID && offer) return { kind: "prompt" };
    if (IOS) return { kind: "ios", browser: browser() };
    if (ANDROID) return { kind: "android", browser: browser() };
    return { kind: "laptop" };
  }

  // the two steps, with their small pictures and where the real button is on screen
  function steps(s) {
    var tap = function () { return el("span", { class: "m7i-tap" }); };
    // a browser bar with the button to tap lit up, at the top or bottom of a tiny phone screen
    var bar = function (where, hotAt, icon) {
      var kids = where === "top" ? [el("span", { class: "addr" })] : [el("span", { class: "ph" }), el("span", { class: "ph" })];
      var hot = el("span", { class: "hot", html: icon }); hot.append(tap());
      if (hotAt <= 2 && where === "bottom") kids.splice(1, 0, hot); else kids.push(hot);
      return el("div", { class: "m7i-bar " + where }, kids);
    };
    // the menu that opens, with the line to tap lit up
    var menu = function (rows) { return el("div", { class: "m7i-menu" }, rows.map(function (r) { return el("i", { class: r[2] ? "hot" : null }, el("span", { html: r[0] }), r[1], r[2] ? tap() : null); })); };
    var addRow = [[SVG.plus, "Add to Home Screen", true]];
    if (s.kind === "ios" && s.browser === "safari") {
      var newSafari = SAFARI_VER >= 26 && !IPAD;
      var one = IPAD
        ? { pic: [bar("top", 4, SVG.share)], text: "Tap Share", small: "The square with an arrow, at the top right.", point: "top-right" }
        : newSafari
          ? { pic: [bar("bottom", 4, SVG.dots)], text: "Tap ⋯ at the bottom right, then Share", small: "Share is the square with an arrow.", point: "bottom-right" }
          : { pic: [bar("bottom", 2, SVG.share)], text: "Tap Share at the bottom", small: "The square with an arrow. Can't see it? Tap ⋯ first.", point: "bottom" };
      return [one, { pic: [menu([[SVG.share, "Copy"], addRow[0], [SVG.out, "Find on Page"]])], text: "Tap Add to Home Screen, then Add", small: "You may need to scroll down the list a little." }];
    }
    if (s.kind === "ios") {
      var where = { chrome: ["Tap Share in the address bar", "The square with an arrow, at the top right."],
        edge: ["Tap ⋯, then Share", "The ⋯ is at the bottom of the screen."],
        firefox: ["Tap the menu, then Share", "The menu is the three lines at the bottom right."] }[s.browser];
      return [
        { pic: [bar("top", 4, SVG.share)], text: where[0], small: where[1] + (s.browser === "chrome" ? " If your address bar is at the bottom, look there." : ""), point: s.browser === "chrome" ? "top-right" : "bottom-right" },
        { pic: [menu([[SVG.share, "Copy"], addRow[0], [SVG.out, "Find on Page"]])], text: "Tap Add to Home Screen, then Add", small: "You may need to scroll down. Can't find it? Open this page in Safari." }
      ];
    }
    if (s.kind === "android") {
      var a = {
        samsung: [SVG.lines, "Tap the menu at the bottom right", "Three lines.", [[SVG.plus, "Add page to", true]], "Tap Add page to, then Home screen", "bottom-right", "bottom"],
        firefox: [SVG.vdots, "Tap the menu", "Three dots, next to the address.", [[SVG.plus, "Add to Home screen", true]], "Tap Add to Home screen", "top-right", "top"],
        edge: [SVG.dots, "Tap the menu at the bottom", "Three dots.", [[SVG.phone, "Add to phone", true]], "Tap Add to phone, then Install", "bottom", "bottom"],
        chrome: [SVG.vdots, "Tap the menu at the top right", "Three dots, next to the address.", [[SVG.phone, "Add to Home screen", true]], "Tap Add to Home screen, then Install", "top-right", "top"]
      }[s.browser];
      return [
        { pic: [bar(a[6], 4, a[0])], text: a[1], small: a[2], point: a[5] },
        { pic: [menu([[SVG.share, "Share"], a[3][0], [SVG.out, "Open in…"]])], text: a[4], small: "It then sits on your home screen like an app." }
      ];
    }
    if (s.kind === "inapp") {
      var browserName = IOS ? "Safari" : "Chrome";
      return [
        { pic: [bar("top", 4, IOS ? SVG.dots : SVG.vdots)], text: "Tap the menu (⋯ or ⋮) at the top", small: "It is " + s.app + "'s own menu.", point: "top-right" },
        { pic: [menu([[SVG.share, "Share"], [SVG.out, "Open in " + browserName, true], [SVG.plus, "Copy link"]])], text: "Tap Open in " + browserName, small: "It may say Open in browser. Then add it from there." }
      ];
    }
    return [];
  }

  function point(where) {
    var p = el("div", { id: "m7i-point", "aria-hidden": "true", html: SVG.hand });
    var bottom = where.indexOf("bottom") === 0, gap = "calc(max(10px, env(safe-area-inset-bottom)) + 4px)";
    p.className = bottom ? "down" : "up";
    p.style[bottom ? "bottom" : "top"] = bottom ? gap : "max(10px, env(safe-area-inset-top))";
    if (/right/.test(where)) p.style.right = "14px"; else p.style.left = "calc(50% - 23px)";
    return p;
  }

  // the last two words wrap together, so no word sits alone on the last line
  function glue(t) { return String(t).replace(/ (\S+)$/, " $1"); }

  // ---------- the guide ----------
  function guide() {
    css(); closeAll();
    var s = situation(), st = steps(s);
    var shut = function () { closeAll(); };
    var firstAt = (st[0] && st[0].point) || "bottom";
    var title = s.kind === "inapp" ? "First, open this page in " + (IOS ? "Safari" : "Chrome") : "Put Client Studio on your phone";
    var lede = s.kind === "inapp" ? "You're inside " + s.app + ", which can't add it to your phone."
      : s.kind === "laptop" ? "Open your own link on your phone, then use the ⋯ menu there. Copy the link below and send it to yourself."
      : "It then opens like an app, full screen, straight on your own page.";
    var list = st.length ? el("ol", {}, st.map(function (x, i) {
      return el("li", {}, el("span", { class: "m7i-n", text: String(i + 1) }), el("span", { class: "m7i-pic", "aria-hidden": "true" }, x.pic),
        el("span", { class: "m7i-t" }, glue(x.text), el("small", { text: glue(x.small) })));
    })) : null;
    var copyBtn = s.kind === "inapp" || s.kind === "laptop" ? el("button", { type: "button", class: "m7i-soft", text: "Copy my link", onclick: function (e) { copyLink(e.currentTarget); } }) : null;
    var sheet = el("div", { id: "m7i-sheet", class: firstAt.indexOf("bottom") === 0 ? "at-top" : "at-bottom", role: "dialog", "aria-modal": "true", "aria-label": "Put Client Studio on your phone" },
      el("h2", { text: title }), el("p", { text: lede }), list,
      el("div", { class: "m7i-row" }, copyBtn, el("button", { type: "button", class: "m7i-go", text: "Got it", onclick: shut })));
    var shade = el("div", { id: "m7i-shade", onclick: shut });
    document.body.append(shade, sheet);
    if (st.length && s.kind !== "laptop") document.body.append(point(firstAt));
    var go = sheet.querySelector(".m7i-go"); if (go) go.focus({ preventScroll: true });
  }

  // one tap on Android: the phone's own install box
  function install() {
    var e = offer; if (!e) return guide();
    offer = null;
    try {
      e.prompt();
      (e.userChoice || Promise.resolve({})).then(function (c) {
        if (c && c.outcome === "accepted") { var p = getPref(); p.added = Date.now(); setPref(p); say("Added. Look for Client Studio on your home screen."); }
      });
    } catch (err) { guide(); }
  }

  function open() { closeAll(); if (situation().kind === "prompt") return install(); guide(); }

  // ---------- the card, once, after the first answer ----------
  function canOffer() {
    if (EMBEDDED || !MOBILE || standalone()) return false;
    var p = getPref();
    if (p.never || p.added) return false;
    if (p.snooze && Date.now() - p.snooze < SNOOZE_DAYS * 864e5) return false;
    return true;
  }
  var shownNow = false;
  function card() {
    if (shownNow || !canOffer()) return;
    var modal = document.getElementById("modal");
    if ((modal && !modal.hidden) || document.getElementById("m7i-sheet")) { setTimeout(card, 1500); return; }
    css(); shownNow = true;
    var s = situation();
    var main = s.kind === "prompt" ? "Add to my phone" : "Show me how";
    var text = s.kind === "inapp" ? "You're inside " + s.app + ". Open this page in " + (IOS ? "Safari" : "Chrome") + " first, then add it."
      : s.kind === "prompt" ? "One tap, and it opens like an app, straight on your own page."
      : "Two taps, and it opens like an app, straight on your own page.";
    var c = el("div", { id: "m7i-card", role: "dialog", "aria-label": "Put Client Studio on your phone" },
      el("div", { class: "m7i-top" }, el("img", { src: "assets/studio-icon-192.png", alt: "" }),
        el("div", {}, el("b", { text: "Put Client Studio on your phone" }), el("p", { text: text }))),
      el("div", { class: "m7i-row" },
        el("button", { type: "button", class: "m7i-go", text: main, onclick: function () { closeAll(); open(); } }),
        s.kind === "inapp" ? el("button", { type: "button", class: "m7i-soft", text: "Copy my link", onclick: function (e) { copyLink(e.currentTarget); } }) : null,
        el("button", { type: "button", class: "m7i-soft", text: "Not now", onclick: function () { var p = getPref(); p.snooze = Date.now(); setPref(p); closeAll(); } })),
      el("button", { type: "button", class: "m7i-link", text: "Don't show this again", onclick: function () { var p = getPref(); p.never = true; setPref(p); closeAll(); } }));
    document.body.append(c);
  }
  var answeredOnce = false;
  function answered() {
    if (answeredOnce) return; answeredOnce = true;
    if (!canOffer()) return;
    setTimeout(card, 2400);                // after the page has moved on to the next card
  }

  window.M7Install = {
    open: open, answered: answered, standalone: standalone,
    // for the test page only: what this phone gets
    _state: function () { return { situation: situation(), mobile: MOBILE, standalone: standalone(), offer: !!offer, pref: getPref(), canOffer: canOffer() }; }
  };
})();
