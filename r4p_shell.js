/* [PART R4P-shell, 26 Nov 2026] Release 4 on PHONES: the switch, the frame, the More page, "Switch client", Back.
   Owner: Builder P-SHELL. Phone build only (build\R4P.html, see build_R4P.py): loads after r4_tour.js and before
   r4p_pages.js, r4p_card.js and r4_team.js. It edits no other file: it wraps the page's and Release 4's functions by
   reassignment. Everything it draws is phone-only (<= 900 px); on a laptop it changes nothing.
   - The switch: window.R4D.on() is also true on a phone (<= 900 px) for a client's view or our Client view, never
     inside a frame (EMBED / INLIB) and never on our team's own view. body gets "r4" (r4_shell.js) and "r4ps" (here).
     Every class and id this file draws starts with "r4ps-" (r4p- is the laptop pages' own, r4pp- the phone pages').
   - No flash of the old page on a phone: r4p_shell.css covers the page with a plain "Loading your work…" until
     Release 4 draws (only on a client link, ?c= or ?u=). This file lifts it when Release 4 draws, when the data says
     Release 4 is not for this view (our own sign-in), or when the page shows a screen that comes before the data
     (passcode, wrong link, error). 8-second safety in the CSS itself, so the page can never stay hidden.
   - The frame (mock-ups ..\R4_phone_mockups_2026-11-26\ P01, P01b, P12, P14):
       header (Home only, sticky): the Client Studio mark, the client's name, the switch chevron (only when this person
         has more than one client, as Release 3's own switch), "Client Studio by M7Alpha". Content and Calendar draw
         their own title (r4p_pages); the More page draws "More". Release 3's pages reached from More (Reports, Tasks…)
         get a "‹ More" bar instead.
       bottom bar: Home, Content (its waiting count, the same number as the laptop menu), Calendar, More. Fixed to the
         bottom with the safe-area gap, so it sits on the real bottom edge whether Safari's toolbar shows or hides.
         Hidden while the keyboard is up (Release 3's body.kbd).
       The message envelope is NOT drawn: r3MsgOn() is false while r4_shell.js has MSG_LIVE = false.
   - The More page (?page=more): the client box (switch, "Signed in as…", "Not you?"), then Release 3's own pages this
     client has (Reports, Tasks with its count, Leads, Brand, Documents), Night version (a switch), How it works (plays
     R4TOUR's set for the page the person came from, when R4TOUR has one), and the black Message M7Alpha bar only once
     r3MsgOn() is true.
   - "Switch client": a sheet from the bottom with this person's clients (the page's own S.brands, or TEAM.clients in
     our Client view), "You're here now" and a tick on the current one; "N things waiting for you" only when the page
     already knows the number. A tap goes where Release 3's own switch goes (?c=… / ?u=…&b=…, or teamGo).
   - Back: anything that opens over the page can call R4PS.back(close): Back then closes it before leaving the page.
     Pieces (window.R4C) already close on Back through the address (&open=).
   window.R4PS = {
     phone()          true on a phone width (<= 900 px)
     on()             true while Release 4 draws on a phone
     page             what the bottom bar lights: "home" | "content" | "calendar" | "more" (Release 3 pages light More)
     back(close)      adds one step to the browser's history; Back calls close({ fromBack: true }) instead of leaving the
                      page. Returns { done() }: call it when the thing closes by its own button (takes the step out).
     sheet(opts)      opens a sheet from the bottom: { title, sub, body: [nodes], foot: node|string, label } -> { el, close }
     switchClient()   opens the "Switch client" sheet
     refresh()        draws the header and the bottom bar again (counts, the lit page)
   } */
(function () {
  "use strict";
  if (window.R4PS) return;
  const PHONE = matchMedia("(max-width: 900px)");
  const D = document.documentElement;
  const q = () => new URLSearchParams(location.search);

  // ---------- [PART R4P-boot] no flash of Release 3 on a phone (the cover itself is in r4p_shell.css) ----------
  (function boot() {
    try {
      const a = q();
      if (!PHONE.matches || !(a.get("c") || a.get("u")) || a.get("in")) { D.classList.add("r4ps-lift"); return; }
      try { if (JSON.parse(localStorage.getItem("m7r-night"))) D.classList.add("r4ps-bootn"); } catch (e) {}
      let mo = null, t = 0;
      const lift = () => { D.classList.add("r4ps-lift"); D.classList.remove("r4ps-bootn"); if (mo) { mo.disconnect(); mo = null; } clearTimeout(t); };
      const check = () => {
        if (D.classList.contains("r4ps-lift")) return lift();
        const b = document.body; if (!b) return;
        if (b.classList.contains("r4")) return lift();
        let data = false; try { data = !!S.data; } catch (e) {}
        if (data) { let v = true; try { v = R4D.on(); } catch (e) { v = false; } if (!v) lift(); return; }      // our own sign-in: Release 3
        const app = document.getElementById("app"); if (!app || !app.firstElementChild) return;
        if (!/^\s*Loading your work/.test(app.textContent || "")) lift();      // passcode, wrong link or error screen
      };
      mo = new MutationObserver(check); mo.observe(D, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
      t = setTimeout(lift, 8000);
      check();
    } catch (e) { D.classList.add("r4ps-lift"); }
  })();

  if (!window.R4D || !window.R4 || !window.R4.__shell) { console.warn("R4P-shell: Release 4 is missing"); D.classList.add("r4ps-lift"); return; }

  // ---------- the switch: Release 4 on phones too ----------
  const lapOn = R4D.on;
  const phoneOn = () => { try { return PHONE.matches && !!S.data && (!TEAM.on || TEAM.client) && !EMBED && !INLIB; } catch (e) { return false; } };
  R4D.on = function () { let v = false; try { v = !!lapOn.apply(R4D, arguments); } catch (e) {} return v || phoneOn(); };
  const on = phoneOn;

  // ---------- small helpers ----------
  const el = (tag, attrs, ...kids) => {
    const x = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === "text") x.textContent = v; else if (k === "html") x.innerHTML = v; else if (k.startsWith("on") && typeof v === "function") x[k] = v; else x.setAttribute(k, v === true ? "" : v);
    });
    kids.flat().forEach((k) => { if (k != null && k !== false) x.append(k); });
    return x;
  };
  const SV = (inner, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  // the same outline icons as the laptop menu (r4_shell.js ICONS) and the mock-ups
  const I = {
    home: SV('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
    content: SV('<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.6-4.9"/>'),
    calendar: SV('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/>'),
    more: SV('<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>', 1.6),
    reports: SV('<path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/><path d="M14 3v4.5h5"/><path d="M9 12.5h6M9 16h6M9 9h2"/>'),
    tasks: SV('<path d="m3.5 6.5 1.8 1.8 3.2-3.3M3.5 16.5l1.8 1.8 3.2-3.3"/><path d="M12.5 7h8M12.5 12h8M12.5 17h8"/>'),
    leads: SV('<path d="M21 12.5h-5l-1.8 2.8h-4.4L8 12.5H3"/><path d="M6 5.5h12l3 7V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5.5Z"/>'),
    brand: SV('<path d="M12 3a9 9 0 0 0 0 18c1 0 1.6-.7 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6h2A4.6 4.6 0 0 0 21 11c0-4.4-4-8-9-8Z"/><path d="M7.5 12h.01M9.5 7.8h.01M14.2 7.2h.01M17 10.8h.01" stroke-width="2.6"/>'),
    docs: SV('<path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/><path d="M14 3v4.5h5"/>'),
    library: SV('<rect x="7" y="3" width="14" height="14" rx="2"/><circle cx="11.5" cy="7.5" r="1.6"/><path d="m21 13-3.2-3.2a1.5 1.5 0 0 0-2.1 0L10 15.5"/><path d="M4 7v11a3 3 0 0 0 3 3h11"/>'),
    moon: SV('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
    sun: SV('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
    help: SV('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>'),
    env: SV('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'),
    x: SV('<path d="M6 6l12 12M18 6 6 18"/>', 2),
    l: SV('<path d="m14.5 6-6 6 6 6"/>', 2.2), r: SV('<path d="m9.5 6 6 6-6 6"/>', 2.2),
    tick: SV('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 2.8),
    down: SV('<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>', 2.2),
  };
  const ICON = (k) => el("i", { class: "r4ps-ic", "aria-hidden": "true", html: I[k] || I.docs });
  // Release 3's pages: the menu word -> the address word (as r4_shell.js), and the address word -> what R4.go knows
  const LABEL = { Library: "library", Reports: "reports", Tasks: "tasks", Leads: "leads", Brand: "brand", Documents: "docs" };
  const R3GO = ["library", "reports", "tasks", "leads", "brand", "docs", "documents"];
  const MAIN = ["home", "content", "calendar"];
  const initials = (n) => String(n || "").trim().split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w)).slice(0, 2).map((w) => [...w][0]).join("").toUpperCase() || "?";      // "Haven & Keys" -> HK
  // the initials circle: one dark colour per client name (always the same for a name), off-white letters (all over 6:1)
  const AV = ["#7A2E2E", "#1D4E89", "#5B3A8C", "#8A3D0C", "#365E12", "#2B6C73"];
  const avColour = (n) => { let x = 7; for (const c of String(n || "")) x = (x * 31 + c.charCodeAt(0)) >>> 0; return AV[x % AV.length]; };
  // the client's logo in a circle (Lee, 26 Nov 2026: "Profile with logo of client in circle"), or its initials when there is
  // no logo. No logo is stored with a client today, so the first field found wins when one is added.
  const logoOf = (c) => { try { const v = c && (c.logo_url || c.logo || c.icon_url || c.avatar_url); return v && /^(https?:|data:image\/|assets\/)/.test(String(v)) ? String(v) : ""; } catch (e) { return ""; } };
  function avatar(name, logo, cls) {
    const box = el("span", { class: "r4ps-ini" + (cls ? " " + cls : "") + (logo ? " r4ps-logo" : ""), "aria-hidden": "true" });
    if (logo) { const im = el("img", { src: logo, alt: "" }); im.onerror = () => { box.classList.remove("r4ps-logo"); box.style.background = avColour(name); box.replaceChildren(document.createTextNode(initials(name))); }; box.append(im); }
    else { box.style.background = avColour(name); box.textContent = initials(name); }
    return box;
  }
  function clientLogo() { try { return logoOf(S.data && S.data.client); } catch (e) { return ""; } }
  const toast = (t) => { try { showToast(t); hideToastLater(4500); } catch (e) {} };

  // ---------- state ----------
  const ps = { more: false, last: "home", stack: [], skipPop: 0, hd: null, tabs: null, sig: "", raf: 0, meta: null };
  const R = window.R4, goR = R.go, refreshR = R.refresh;
  const pageDesc = Object.getOwnPropertyDescriptor(R, "page");
  const shellPage = () => { try { return pageDesc.get.call(R); } catch (e) { return null; } };
  function curR3() {          // Release 3's page that shows now (the address word), or null
    try { if (S.lib) return "library"; if (S.panel) return S.panel; if (S.r3page === "reports") return "reports"; } catch (e) {}
    return null;
  }
  function pageKey() {
    if (ps.more) return "more";
    const p = shellPage(); if (p) return p;
    return curR3() || "home";
  }
  const tabOf = (k) => (k === "library" ? "content" : MAIN.includes(k) || k === "more" ? k : "more");      // Release 3's pages light More

  // Release 3's own pages this client has, exactly as the page's own buttons offer them (as r4_shell.js does)
  function r3Pages() {
    let t = null; try { t = modeToggle(); } catch (e) {}
    if (!t) return [];
    return [...t.querySelectorAll("button")].map((b) => {
      const n = b.querySelector("b, .tbn")?.textContent || "", label = b.textContent.replace(n, "").trim();
      return { b, label, key: LABEL[label] || b.dataset.panel || label.toLowerCase() };
    }).filter((x) => !/^(dashboard|review|library|all work)$/i.test(x.label));
  }
  // Content's number: content only, as the laptop menu (documents and reports live on Home and Reports)
  function waitingN() { try { return waitingAll().filter((x) => !x.it.panel && statusOf(x.it).kind === "wait").length; } catch (e) { return 0; } }
  // the client's open tasks: r4_shell.js reads them once per visit for its (hidden) menu; take its number from there
  function tasksN() {
    try {
      const it = [...document.querySelectorAll("#sidenav .r4-item")].find((b) => (b.querySelector(".r4-l")?.textContent || "").trim() === "Tasks");
      const n = Number(it?.querySelector(".r4-n")?.textContent || 0); return isFinite(n) && n > 0 ? n : 0;
    } catch (e) { return 0; }
  }
  function clientName() { try { return String((S.data && S.data.client && S.data.client.name) || ""); } catch (e) { return ""; } }
  function whoName() {
    try {
      if (TEAM.on && TEAM.me) return TEAM.me;
      if (typeof PERSON !== "undefined" && PERSON && PERSON.name) return String(PERSON.name).trim().split(/\s+/)[0];
      if (S.me) return S.me;
    } catch (e) {}
    return "";
  }
  // the clients this person can see: the page's own lists (Release 3's switch uses the same ones)
  function clients() {
    try {
      if (typeof teamCard === "function" && teamCard() && TEAM.clients && TEAM.clients.length > 1)
        return TEAM.clients.map((c) => ({ name: c.name, logo: logoOf(c) || (c.link_code === S.code ? clientLogo() : ""), here: c.link_code === S.code, n: Number.isFinite(+c.n) && c.n !== null && c.n !== undefined ? +c.n : null, go: () => teamGo(c.link_code) }));
    } catch (e) {}
    try {
      if (S.brands && S.brands.length > 1) {
        const ut = typeof UTOKEN !== "undefined" ? UTOKEN : null;
        return S.brands.map((b) => {
          const raw = b.waiting ?? b.n ?? b.waiting_n ?? null;
          const here = !!b.here || b.code === S.code;
          return { name: b.name, logo: logoOf(b) || (here ? clientLogo() : ""), here, n: raw !== null && raw !== "" && Number.isFinite(+raw) ? +raw : null,
            href: ut ? "?u=" + encodeURIComponent(ut) + "&b=" + encodeURIComponent(b.slug || "") : "?c=" + encodeURIComponent(b.code) };
        });
      }
    } catch (e) {}
    return [];
  }

  // ---------- Back: one history step for anything open over the page ----------
  function back(close) {
    const entry = { close };
    ps.stack.push(entry);
    try { history.pushState(Object.assign({}, history.state || {}, { r4ps: ps.stack.length }), "", location.href); } catch (e) {}
    return {
      done() {
        const i = ps.stack.indexOf(entry); if (i < 0) return;
        ps.stack.splice(i, 1); ps.skipPop++;
        try { history.back(); } catch (e) { ps.skipPop--; }
      },
    };
  }

  // ---------- a sheet from the bottom (P14) ----------
  function sheet(o) {
    o = o || {};
    const id = "r4ps-sh-" + Date.now();
    const prev = document.activeElement;
    const dim = el("div", { class: "r4ps-dim", "aria-hidden": "true" });
    const closeB = el("button", { type: "button", class: "r4ps-ib", "aria-label": "Close", html: I.x });
    const box = el("div", { class: "r4ps-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": id + "-t", tabindex: "-1" },
      el("div", { class: "r4ps-grab", "aria-hidden": "true" }),
      el("div", { class: "r4ps-shead" }, el("div", { class: "r4ps-sht" }, el("h2", { id: id + "-t", text: o.title || "" }), o.sub ? el("p", { text: o.sub }) : null), closeB),
      el("div", { class: "r4ps-sbody" }, ...(o.body || [])),
      o.foot ? el("p", { class: "r4ps-sfoot" }, o.foot) : null);
    let shut = false, bk = null;
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    function close(how) {
      if (shut) return; shut = true;
      removeEventListener("keydown", key, true);
      dim.classList.remove("in"); box.classList.remove("in");
      const gone = () => { dim.remove(); box.remove(); };
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) gone(); else setTimeout(gone, 230);
      document.body.classList.remove("r4ps-sheeton");
      if (!(how && how.fromBack) && bk) bk.done();
      try { if (prev && prev.focus && prev.isConnected) prev.focus({ preventScroll: true }); } catch (e) {}
      try { if (o.onClose) o.onClose(); } catch (e) {}
    }
    dim.onclick = () => close(); closeB.onclick = () => close();
    document.body.append(dim, box); document.body.classList.add("r4ps-sheeton");
    addEventListener("keydown", key, true);
    requestAnimationFrame(() => requestAnimationFrame(() => { dim.classList.add("in"); box.classList.add("in"); }));
    bk = back((how) => close(how || { fromBack: true }));
    try { box.focus({ preventScroll: true }); } catch (e) {}          // the sheet itself (a screen reader reads its title; no ring on a row)
    return { el: box, close };
  }
  // one row per brand: logo (or initials) circle, name, "You're here now" + tick for the one they are on
  function brandRows(after) {
    const list = clients(); if (list.length < 2) return [];
    list.sort((a, b) => (b.here ? 1 : 0) - (a.here ? 1 : 0));          // the brand they are on comes first (P14)
    return list.map((c) => {
      const sub = c.here ? "You're here now" : c.n != null ? (c.n === 0 ? "Nothing waiting for you" : c.n + (c.n === 1 ? " thing" : " things") + " waiting for you") : null;
      const inner = [avatar(c.name, c.logo),
        el("span", { class: "r4ps-ct" }, el("b", { text: c.name }), sub ? el("small", { text: sub }) : null),
        c.here ? el("span", { class: "r4ps-tickc", "aria-hidden": "true", html: I.tick }) : el("span", { class: "r4ps-chev", "aria-hidden": "true", html: I.r })];
      const lab = c.here ? c.name + ", you're here now" : "Switch to " + c.name;
      if (c.here) return el("button", { type: "button", class: "r4ps-crow", "aria-current": "page", "aria-label": lab, onclick: () => after && after(c) }, ...inner);
      if (c.go) return el("button", { type: "button", class: "r4ps-crow", "aria-label": lab, onclick: () => { after && after(c); setTimeout(() => { try { c.go(); } catch (e) {} }, 0); } }, ...inner);
      return el("a", { class: "r4ps-crow", href: c.href, "aria-label": lab, onclick: () => after && after(c) }, ...inner);
    });
  }
  function switchClient() {
    if (clients().length < 2) return null;
    let sh = null;
    const rows = brandRows(() => sh && sh.close());
    let msg = false; try { msg = r3MsgOn(); } catch (e) {}
    sh = sheet({ title: "Switch brand", sub: "The brands you can see", body: [el("div", { class: "r4ps-card r4ps-clist" }, ...rows)],
      foot: msg ? "Missing a brand? Message M7Alpha." : "Missing a brand? Ask your M7Alpha contact." });
    return sh;
  }
  function swBtn(cls) {
    if (clients().length < 2) return null;
    return el("button", { type: "button", class: "r4ps-swb" + (cls ? " " + cls : ""), "aria-label": "Switch client", "aria-haspopup": "dialog", onclick: () => switchClient() },
      el("i", { "aria-hidden": "true", html: I.down }));
  }

  // ---------- the header (Home) or the "‹ More" bar (Release 3's pages reached from More) ----------
  function drawHeader(k) {
    let hd = document.getElementById("r4ps-hd");
    const app = document.getElementById("app");
    if (!hd) { hd = el("div", { id: "r4ps-hd", class: "r4ps-hd" }); if (app && app.parentNode) app.parentNode.insertBefore(hd, app); else document.body.prepend(hd); }
    else if (app && hd.nextElementSibling !== app) app.parentNode.insertBefore(hd, app);
    const name = clientName();
    // no header bar on Home, Content or Calendar any more (Lee, 26 Nov 2026: "remove the header bar, it is unnecessary");
    // the brand switch lives on Profile. Release 3's pages reached from Profile keep their "‹ Profile" bar.
    const want = (!MAIN.includes(k) && k !== "more") ? "back" : "none";
    if (hd.dataset.v === want) return;
    hd.dataset.v = want;
    hd.className = "r4ps-hd" + (want === "none" ? "" : " r4ps-on r4ps-hd-" + (want === "back" ? "back" : "home"));
    if (want === "none") { hd.replaceChildren(); return; }
    if (want === "back") {
      hd.replaceChildren(el("button", { type: "button", class: "r4ps-backb", onclick: () => R.go("more") }, el("i", { "aria-hidden": "true", html: I.l }), el("span", { text: "Profile" })));
      return;
    }
    hd.replaceChildren(
      el("img", { class: "r4ps-mark", src: "assets/studio-icon-dark-180.png", alt: "", width: "34", height: "34" }),
      el("div", { class: "r4ps-hdt" }, el("div", { class: "r4ps-hl1" }, el("b", { class: "r4ps-hname", text: name }), swBtn()), el("span", { class: "r4ps-by", text: "Client Studio by M7Alpha" })));
  }

  // ---------- the bottom bar ----------
  function drawTabs(k) {
    let nav = document.getElementById("r4ps-tabs");
    if (!nav) {
      nav = el("nav", { id: "r4ps-tabs", class: "r4ps-tabs", "aria-label": "Pages" });
      [["home", "Home"], ["content", "Content"], ["calendar", "Calendar"], ["more", "Profile"]].forEach(([key, label]) => {
        nav.append(el("button", { type: "button", class: "r4ps-tab", "data-k": key, onclick: () => tabGo(key) },
          el("i", { class: "r4ps-ti", "aria-hidden": "true", html: key === "more" ? "" : I[key] }), el("span", { class: "r4ps-tl", text: label })));
      });
      document.body.append(nav);
    }
    // the Profile tab's icon: this brand's logo (or initials) in a circle; drawn again when the brand changes
    const pt = nav.querySelector('.r4ps-tab[data-k="more"] .r4ps-ti'), nm = clientName(), lg = clientLogo();
    if (pt && pt.dataset.v !== nm + "|" + lg) { pt.dataset.v = nm + "|" + lg; pt.replaceChildren(avatar(nm, lg, "r4ps-ini-tab")); }
    const lit = tabOf(k), n = waitingN();
    nav.querySelectorAll(".r4ps-tab").forEach((b) => {
      const key = b.dataset.k, isOn = key === lit;
      b.setAttribute("aria-pressed", String(isOn));
      if (isOn) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      if (key === "content") {
        const ti = b.querySelector(".r4ps-ti"); let em = ti.querySelector("em");
        if (n > 0) { if (!em) { em = el("em", {}); ti.append(em); } em.textContent = String(n); b.setAttribute("aria-label", "Content, " + n + " waiting"); }
        else { em?.remove(); b.removeAttribute("aria-label"); }
      }
    });
  }
  function tabGo(key) {
    if (key === "more") { R.go("more"); return; }
    const k = pageKey();
    // a second tap on the page that shows takes it back to its top (as phone apps do)
    if (k === key && !ps.more) { try { window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } catch (e) { window.scrollTo(0, 0); } return; }
    R.go(key);
  }

  // ---------- the More page (P12) ----------
  function holdR3() {
    try {
      document.getElementById("lcard")?.remove(); try { libViewClose(); } catch (e) {}
      S.lib = false; S.panel = null; S.r3page = "r4"; S.r3back = null; S.r3BackToLib = false;
    } catch (e) {}
  }
  function nightToggle() {
    const v = document.body.classList.toggle("night"); try { store.set("m7r-night", v ? 1 : null); } catch (e) {}
    document.querySelectorAll(".nightbtn").forEach((x) => x._paint?.());
    document.querySelectorAll("iframe").forEach((f) => { try { f.contentDocument.body.classList.toggle("night", v); } catch (e) {} });
    try { renderSideNav(); } catch (e) {}
    return v;
  }
  function howItWorks() {
    const k = MAIN.includes(ps.last) ? ps.last : curR3Key(ps.last);
    if (!k || !window.R4TOUR || !R4TOUR.has || !R4TOUR.has(k)) return;
    R.go(k);
    setTimeout(() => {
      let ok = false; try { ok = R4TOUR.open(k, { manual: true }); } catch (e) {}
      // r4_tour.js plays only on a laptop for now (it starts, then stops itself under 901 px): look a few times, and say
      // so once it has gone, rather than doing nothing
      let n = 0;
      const look = () => {
        if (document.querySelector(".r4t")) { if (++n < 4) setTimeout(look, 400); return; }
        toast(ok === false ? "There is nothing to show on this page yet." : "The guide works on a laptop for now.");
      };
      setTimeout(look, 400);
    }, 500);
  }
  const curR3Key = (k) => (k === "documents" ? "docs" : k);
  function row(icon, label, opts) {
    opts = opts || {};
    const right = opts.sw != null
      ? el("span", { class: "r4ps-sw" + (opts.sw ? " on" : ""), "aria-hidden": "true" }, el("i", {}))
      : el("span", { class: "r4ps-chev", "aria-hidden": "true", html: I.r });
    return el("button", Object.assign({ type: "button", class: "r4ps-lrow", onclick: opts.onclick }, opts.sw != null ? { role: "switch", "aria-checked": String(!!opts.sw) } : {}, opts.attrs || {}),
      ICON(icon), el("span", { class: "r4ps-ll", text: label }), opts.n ? el("em", { class: "r4ps-n", text: String(opts.n), "aria-label": opts.n + " open" }) : null, right);
  }
  function drawMore() {
    const app = document.getElementById("app"); if (!app) return;
    try { renderWho(); } catch (e) {}
    try { renderModeToggle(); } catch (e) {}
    const name = clientName(), who = whoName();
    let person = null; try { person = typeof PERSON !== "undefined" ? PERSON : null; } catch (e) {}
    let notYou = null;
    try {
      if (!TEAM.on && person && person.name) notYou = () => toast(`This link is for ${person.name} only. If you are someone else, please ask M7Alpha for your own link.`);
      else if (!TEAM.on && S.me) notYou = () => { try { askName(true); } catch (e) {} };
    } catch (e) {}
    const many = clients().length > 1;
    const box = many
      // more than one brand: the switch comes first (below); this box is only who is signed in
      ? el("div", { class: "r4ps-card r4ps-mcl r4ps-mwhobox" },
          el("div", { class: "r4ps-mrow" },
            el("div", { class: "r4ps-mct" }, el("b", { class: "r4ps-mname", text: who ? "Signed in as " + who : "Signed in" })),
            notYou ? el("button", { type: "button", class: "r4ps-btn r4ps-notyou", text: "Not you?", onclick: notYou }) : null))
      : el("div", { class: "r4ps-card r4ps-mcl" },
      avatar(name, clientLogo(), "r4ps-ini44"),
      // the name and "Not you?" share a line when there is room (P12); on a narrow phone or with a long name, "Not you?"
      // moves under the name instead of squeezing it
      el("div", { class: "r4ps-mrow" },
        el("div", { class: "r4ps-mct" }, el("div", { class: "r4ps-hl1" }, el("b", { class: "r4ps-mname", text: name })), who ? el("span", { class: "r4ps-mwho", text: "Signed in as " + who }) : null),
        notYou ? el("button", { type: "button", class: "r4ps-btn r4ps-notyou", text: "Not you?", onclick: notYou }) : null));
    const kids = [el("div", { class: "r4ps-top" }, el("h1", { class: "r4ps-h1", text: "Profile" }))];
    // Lee, 26 Nov 2026: "most prominent option is to switch between brands (if the option is available)"
    if (many) kids.push(el("section", { class: "r4ps-swsec", "aria-labelledby": "r4ps-swh" },
      el("h2", { class: "r4ps-swh", id: "r4ps-swh", text: "Switch brand" }),
      el("div", { class: "r4ps-card r4ps-clist" }, ...brandRows(null))));
    kids.push(box);
    // our Client view: Release 3's own team band (top of the page) already has M7Alpha view / Client view on a phone
    const list = el("div", { class: "r4ps-card r4ps-list" });
    r3Pages().forEach((x) => {
      const n = x.key === "tasks" ? tasksN() : 0;
      list.append(row(I[x.key] ? x.key : "docs", x.label, { n, onclick: () => {
        if (R3GO.includes(x.key)) R.go(x.key);
        else { leaveMore(); try { R.setUrl({ page: x.key, row: null, open: null }); } catch (e) {} x.b.click(); }
        try { window.scrollTo(0, 0); } catch (e) {}
      } }));
    });
    const night = document.body.classList.contains("night");
    list.append(row(night ? "sun" : "moon", night ? "Day version" : "Night version", { sw: night, onclick: () => { nightToggle(); drawMore(); paint(true); try { document.querySelector("#app .r4ps-lrow[role=switch]")?.focus({ preventScroll: true }); } catch (e) {} } }));
    const tk = MAIN.includes(ps.last) ? ps.last : curR3Key(ps.last);
    if (tk && window.R4TOUR && R4TOUR.has && R4TOUR.has(tk)) list.append(row("help", "How it works", { onclick: howItWorks }));
    kids.push(list);
    let msgOk = false; try { msgOk = r3MsgOn(); } catch (e) {}
    if (msgOk) kids.push(el("button", { type: "button", class: "r4ps-msg", "aria-haspopup": "dialog", onclick: () => { try { const bx = r3MsgBox(); bx.hidden = !bx.hidden; if (!bx.hidden) bx.querySelector("textarea")?.focus(); } catch (e) {} } },
      el("i", { class: "r4ps-ic", "aria-hidden": "true", html: I.env }), el("span", { text: "Message M7Alpha" })));
    ps.moreSig = moreSig();
    app.replaceChildren(el("div", { class: "r4ps-more" }, ...kids));
  }
  // what the More page shows that can change by itself (the Tasks count arrives after the first draw, the brands too)
  const moreSig = () => [tasksN(), clients().length, document.body.classList.contains("night"), r3Pages().map((x) => x.key).join(",")].join("|");
  function showMore(opts) {
    opts = opts || {};
    try { if (window.R4C && R4C.isOpen && R4C.isOpen()) R4C.close({ quiet: true }); } catch (e) {}
    try { if (S.story >= 0) { S.r3back = null; closeStory(); } } catch (e) {}
    const was = pageKey(); if (was !== "more") ps.last = was;
    ps.more = true;
    hintSeen();
    try { pageDesc.set.call(R, null); } catch (e) {}          // r4_shell.js lets go of its page
    holdR3();
    if (!opts.fromHistory) { try { R.setUrl({ page: "more", row: null, open: null }, opts.replace ? "replace" : "push"); } catch (e) {} }
    if (!on()) return;
    document.body.classList.add("r4", "r4pg"); document.body.classList.remove("r3pg", "libview");
    drawMore(); paint(true);
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  function leaveMore() { ps.more = false; }

  // ---------- Release 4's routing, with More ----------
  Object.defineProperty(R, "page", {
    configurable: true, enumerable: true,
    get() { return ps.more ? "more" : shellPage(); },
    set(v) { ps.more = v === "more"; try { pageDesc.set.call(R, v === "more" ? null : v); } catch (e) {} },
  });
  R.go = function (page, opts) {
    const p = page == null ? null : String(page).toLowerCase();
    if (p === "more" && PHONE.matches) return showMore(opts);          // on a laptop "more" is unknown, as before (r4_shell.js ignores it)
    if (ps.more) leaveMore();
    const out = goR.apply(R, arguments);
    paint(true);
    return out;
  };
  R.refresh = function () {
    if (ps.more && on()) { drawMore(); paint(true); return; }
    return refreshR.apply(R, arguments);
  };
  const baseRA = renderApp;
  renderApp = function () {
    if (ps.more) {
      let deck = false; try { deck = S.story >= 0; } catch (e) {}
      if (on() && !deck) {
        document.body.classList.add("r4", "r4pg"); document.body.classList.remove("r3pg", "libview");
        try { pageDesc.set.call(R, null); } catch (e) {}
        holdR3(); drawMore(); try { renderSideNav(); } catch (e) {} paint(true);
        return;
      }
      if (!on()) { ps.more = false; try { if (S.r3page === "r4") S.r3page = "dash"; } catch (e) {} }
    }
    const out = baseRA.apply(this, arguments);
    paint(true);
    return out;
  };
  // a phone link with &page=more (shared, or a reload)
  if (PHONE.matches && String(q().get("page") || "").toLowerCase() === "more") { ps.more = true; ps.last = "home"; try { pageDesc.set.call(R, null); } catch (e) {} }

  // Back and forward: a sheet first; then the More page (r4_shell.js does not know it); everything else is r4_shell.js's
  addEventListener("popstate", (e) => {
    if (ps.skipPop > 0) { ps.skipPop--; e.stopImmediatePropagation(); return; }
    if (ps.stack.length) {
      const top = ps.stack.pop(); e.stopImmediatePropagation();
      try { top.close({ fromBack: true }); } catch (x) {}
      if (ps.more && on() && !document.querySelector("#app > .r4ps-more")) drawMore();
      return;
    }
    let ok = false; try { ok = !!S.data && S.story < 0; } catch (x) {}
    if (!ok || !on()) return;
    const pg = String(q().get("page") || "").toLowerCase();
    if (pg === "more") {
      e.stopImmediatePropagation();
      try { if (window.R4C && R4C.isOpen && R4C.isOpen()) R4C.close({ fromHistory: true }); } catch (x) {}
      showMore({ fromHistory: true }); return;
    }
    if (ps.more) leaveMore();          // r4_shell.js's own listener (next) draws the page in the address: its page is null, so it redraws
    setTimeout(() => paint(true), 0);
  }, true);

  // ---------- paint: the frame for the page that shows ----------
  function themeColour(v) {
    try {
      const ms = [...document.querySelectorAll('meta[name="theme-color"]')];
      if (!ps.meta) ps.meta = ms.map((m) => m.getAttribute("content"));
      const c = document.body.classList.contains("night") ? "#101010" : "#F6F6F5";
      ms.forEach((m, i) => m.setAttribute("content", v ? c : ps.meta[i] || m.getAttribute("content")));
    } catch (e) {}
  }
  function paint(now) {
    if (!now) { if (!ps.raf) ps.raf = requestAnimationFrame(() => { ps.raf = 0; paint(true); }); return; }
    const v = on() && document.body.classList.contains("r4");
    document.body.classList.toggle("r4ps", v);
    if (!v) {
      const hd = document.getElementById("r4ps-hd"); if (hd) { hd.className = "r4ps-hd"; hd.dataset.v = ""; hd.replaceChildren(); }
      document.getElementById("r4ps-hint")?.remove();
      if (ps.meta) { themeColour(false); ps.meta = null; }
      return;
    }
    let k = "home"; try { k = pageKey(); } catch (e) {}
    document.body.dataset.r4ps = k;
    try { drawHeader(k); } catch (e) { console.warn("R4P-shell header", e); }
    try { drawTabs(k); } catch (e) { console.warn("R4P-shell bar", e); }
    try { drawHint(k); } catch (e) { console.warn("R4P-shell hint", e); }
    themeColour(true);
    if (ps.more && document.querySelector("#app > .r4ps-more") && ps.moreSig !== moreSig()) { try { drawMore(); } catch (e) {} }
  }
  // ---------- the one-time hint: "Tap Profile to switch between them" (Lee, 26 Nov 2026) ----------
  // Only for people who can switch brands; never again on this device once "Got it" is tapped or Profile is opened.
  const HINT = "m7r-hint-brand-switch";
  const hintDone = () => { try { return localStorage.getItem(HINT) === "1"; } catch (e) { return true; } };
  function hintSeen() { try { localStorage.setItem(HINT, "1"); } catch (e) {} document.getElementById("r4ps-hint")?.remove(); }
  function drawHint(k) {
    let hb = document.getElementById("r4ps-hint");
    const want = k !== "more" && !ps.more && clients().length > 1 && !hintDone();
    if (!want) { hb?.remove(); return; }
    if (hb) return;
    hb = el("div", { id: "r4ps-hint", class: "r4ps-hint", role: "status" },
      el("p", { text: "You look after more than one brand. Tap Profile to switch between them." }),
      el("button", { type: "button", class: "r4ps-hintok", text: "Got it", onclick: () => hintSeen() }));
    document.body.append(hb);
  }
  const r4SN = renderSideNav;
  renderSideNav = function () { const out = r4SN.apply(this, arguments); paint(); return out; };
  // r4_shell.js's own page changes (its menu, Back) draw straight into #app: follow them
  function watch() {
    const app = document.getElementById("app");
    if (app) new MutationObserver(() => paint()).observe(app, { childList: true });
    new MutationObserver(() => paint()).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
  // the header's thin line once the page has scrolled (P01b)
  let sRaf = 0;
  addEventListener("scroll", () => {
    if (sRaf) return;
    sRaf = requestAnimationFrame(() => { sRaf = 0; document.body.classList.toggle("r4ps-scrolled", (window.scrollY || D.scrollTop) > 2); });
  }, { passive: true });
  // crossing 900 px: Release 4 draws on both sides now, so draw the page again for the other layout
  try {
    PHONE.addEventListener("change", () => {
      let data = false; try { data = !!S.data && S.story < 0; } catch (e) {}
      if (!PHONE.matches && ps.more) { ps.more = false; try { R.setUrl({ page: null }, "replace"); } catch (e) {} }
      if (data) { try { renderApp(); } catch (e) {} } else paint();
    });
  } catch (e) {}

  window.R4PS = {
    phone: () => PHONE.matches,
    on: () => on() && document.body.classList.contains("r4"),
    get page() { return tabOf(pageKey()); },
    back, sheet, switchClient,
    refresh: () => paint(true),
  };
  function start() {
    watch(); paint(true);
    try { if (S.data && on() && ps.more) renderApp(); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else setTimeout(start, 0);
})();
