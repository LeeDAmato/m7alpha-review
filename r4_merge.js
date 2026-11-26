/* [PART R4-merge, 26 Nov 2026] Release 4: the Library is merged into the Content page (laptop, client view).
   Owner: the merge builder. Lee agreed on 26 Nov 2026. Loads after r4_pages.js. Phones and the team's own pages are not
   touched: everything here only acts while R4D.on() is true (a client's view, or our Client view, on a laptop).
   1. window.R4MERGE = true once this file has wired itself (r4_shell.js then leaves "Library" / "All work" out of the menu).
   2. Every way into the Library goes to Content instead: Release 3's openLib() and r3Go("lib"), R4.go("library"), the
      address &page=library (start-up, Back and forward), and anything else that turns the Library on (S.lib) before a
      redraw. Done by wrapping those functions (reassigning the globals), never by editing the page.
   3. Content gains what the Library had: a search box (the piece's title) and a type filter (only the types this client
      has), in Content's filter area, working together with Content's own status and channel buttons. Done by wrapping
      R4P.render (and watching #app, for the redraw r4_pages.js makes by itself when the library arrives): tiles that do
      not match are hidden, a row left empty is hidden, and the search and type are kept across redraws.
   4. A "Download" button in the side panel (an answered piece: approved, picked, scheduled or published) for pieces with
      pictures or videos. The address is the store's own ?download=<name>, which makes the store send the file as a
      download with a tidy name (title + label + extension, as Release 3's Library made it).
   5. Documents and reports never show in Content (R4D.rows() already leaves them out; any that slipped in are hidden).
   It never writes anything and never sends anything. */
(function () {
  "use strict";
  if (window.__r4merge) return;
  window.__r4merge = true;
  const on = () => { try { return !!(window.R4D && R4D.on()); } catch (e) { return false; } };
  const LIBWORD = /^(library|lib|all ?work|work)$/i;
  const MS = { q: "", type: null, focus: false, input: null };

  // ---------- 2. every way into the Library goes to Content ----------
  function toContent(how) {
    if (!window.R4 || typeof R4.go !== "function") return false;
    try { $("#lcard")?.remove(); } catch (e) {}
    try { libViewClose(); } catch (e) {}
    try { S.lib = false; } catch (e) {}
    try { R4.go("content", { replace: how === "replace" }); return true; } catch (e) { console.warn("R4-merge go", e); return false; }
  }
  try {
    if (typeof openLib === "function") {
      const o = openLib;
      openLib = function () { if (on() && toContent("push")) return; return o.apply(this, arguments); };
    }
    if (typeof r3Go === "function") {
      const o = r3Go;
      // the shell's go("library") has already put &page=library in the address: Content replaces it
      r3Go = function (page) { if (page === "lib" && on() && toContent("replace")) return; return o.apply(this, arguments); };
    }
    if (window.R4 && typeof R4.go === "function") {
      const o = R4.go;
      R4.go = function (page, opts) {
        if (typeof page === "string" && LIBWORD.test(page.trim()) && on()) page = "content";
        return o.call(this, page, opts);
      };
    }
    if (typeof renderApp === "function") {
      const o = renderApp;
      // anything else that turned the Library on (S.lib) goes to Content at the next redraw
      renderApp = function () {
        try { if (S.lib && !(S.story >= 0) && on() && toContent("replace")) return; } catch (e) {}
        return o.apply(this, arguments);
      };
    }
  } catch (e) { console.warn("R4-merge routes", e); }

  // ---------- 3. Content: search and type ----------
  const TYPES = [["Post", "Posts"], ["Carousel", "Carousels"], ["Advert", "Adverts"], ["Story", "Stories"], ["Video", "Videos"], ["Reel", "Reels"],
    ["Photo set", "Photo sets"], ["Article", "Articles"], ["Lead form", "Lead forms"], ["Pick one", "Pick one"]];
  const MANY = new Map(TYPES);
  const typeOf = (p) => { try { return R4P.typeName(p) || p.kindLabel || "Post"; } catch (e) { return p.kindLabel || "Post"; } };
  // never in Content: documents and reports (they live on Home and Reports), and a dropped piece (none reach a client's
  // get_library today; r4_data.js would file one under "Approved", so it is hidden here in case one ever does)
  const isDoc = (p) => !!(p && (p.panel || /^(plan|report|document)$/.test(String(p.kind || "")) || /drop/i.test(String((p.lib && (p.lib.status || "") + " " + (p.lib.stage || "")) || ""))));
  // Maltese letters match their plain ones (typing "zejtun" finds "Żejtun"); case does not matter
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[ħĦ]/g, "h").toLowerCase().replace(/\s+/g, " ").trim();
  function contentPieces() { try { return R4D.rows().flatMap((r) => r.pieces); } catch (e) { return []; } }
  function typesHere(ps) {
    const have = new Set(ps.filter((p) => !isDoc(p)).map(typeOf));
    const out = TYPES.map((x) => x[0]).filter((t) => have.has(t));
    have.forEach((t) => { if (!out.includes(t)) out.push(t); });
    return out;
  }
  const SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
  const X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>';
  function searchBox() {
    if (MS.input) return MS.input.closest(".r4m-search") || MS.input.parentNode;
    const input = h("input", { type: "search", class: "r4m-q", placeholder: "Search your work", "aria-label": "Search your work by title", autocomplete: "off", spellcheck: "false", maxlength: "80" });
    const clear = h("button", { type: "button", class: "r4m-x", "aria-label": "Clear the search", title: "Clear the search", hidden: true, html: X_SVG });
    // "9 found" sits inside the box, at its right end (as a browser's own find bar does), so the page never moves while typing
    const box = h("label", { class: "r4m-search" }, h("span", { class: "r4m-si", html: SEARCH_SVG }), input, h("span", { class: "r4m-n", "aria-hidden": "true" }), clear);
    input.addEventListener("input", () => { MS.q = input.value; clear.hidden = !MS.q; applyNow(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape" && input.value) { e.preventDefault(); e.stopPropagation(); input.value = ""; MS.q = ""; clear.hidden = true; applyNow(); } });
    clear.addEventListener("click", (e) => { e.preventDefault(); input.value = ""; MS.q = ""; clear.hidden = true; applyNow(); input.focus({ preventScroll: true }); });
    MS.input = input;
    return box;
  }
  // Is the client typing in the search box? A redraw takes the box out of the page for a moment, and Chrome calls that a
  // blur, so blur cannot tell. Focus moving to something else, or a press anywhere outside the box, can.
  document.addEventListener("focusin", (e) => { if (MS.input) MS.focus = e.target === MS.input; }, true);
  document.addEventListener("pointerdown", (e) => { const b = MS.input && MS.input.parentNode; if (b && !b.contains(e.target)) MS.focus = false; }, true);
  function typeChips(types) {
    const set = (t) => { MS.type = t; root().querySelectorAll(".r4m-tchip").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.type || null) === MS.type))); applyNow(); };
    const chip = (t, label) => h("button", { type: "button", class: "r4p-fchip r4m-tchip", "data-type": t || "", "aria-pressed": String((t || null) === MS.type),
      onclick: () => set(t && MS.type !== t ? t : null) }, label);
    return h("div", { class: "r4m-types", role: "group", "aria-label": "Type" }, chip(null, "All types"), ...types.map((t) => chip(t, MANY.get(t) || t)));
  }
  const root = () => { const app = document.getElementById("app"); return (app && app.querySelector(":scope > .r4p-content")) || document.createElement("div"); };
  function enhance() {
    const app = document.getElementById("app"), r = app && app.querySelector(":scope > .r4p-content");
    if (!r || r.__r4m || !on()) return;
    r.__r4m = true;
    try {
      const ps = contentPieces();
      if (!ps.length || !r.querySelector(".r4p-filters")) return;          // "Nothing here yet.": nothing to search
      const types = typesHere(ps);
      if (MS.type && !types.includes(MS.type)) MS.type = null;
      const box = searchBox(); const clear = box.querySelector(".r4m-x"); if (clear) clear.hidden = !MS.q;
      if (MS.input.value !== MS.q) MS.input.value = MS.q;
      // the search box sits at the right of Content's heading (at 1280 px a box and the type buttons do not fit on one line);
      // the type buttons are a second line under Content's own filter buttons
      const sw = h("div", { class: "r4m-sw", role: "search" }, box, h("span", { class: "r4m-sr", role: "status", "aria-live": "polite" }));          // the count, read out by screen readers
      const top = r.querySelector(":scope > .r4p-top");
      if (top) top.append(sw);
      const bar = h("div", { class: "r4m-bar" }, top ? null : sw, types.length > 1 ? typeChips(types) : null);
      if (bar.childNodes.length) r.querySelector(".r4p-filters").after(bar);
      if (MS.focus) { try { MS.input.focus({ preventScroll: true }); } catch (e) {} }
      apply(r);
    } catch (e) { console.warn("R4-merge content", e); }
  }
  function applyNow() { const r = root(); if (r.isConnected) apply(r); }
  function apply(r) {
    const q = fold(MS.q), t = MS.type, active = !!(q || t);
    // rows folded away above a Home task's row ("↑ Posts · Adverts · show") are shown while searching
    if (active) { const above = r.querySelector(":scope > .r4p-above"); if (above) { above.click(); return; } }
    const map = new Map(contentPieces().map((p) => [p.id, p]));
    let shown = 0;
    r.querySelectorAll("button.r4p-tile[data-id]").forEach((tile) => {
      const p = map.get(tile.dataset.id);
      const ok = p ? !isDoc(p) && (!t || typeOf(p) === t) && (!q || fold(p.title).includes(q)) : !active;
      tile.hidden = !ok; if (ok) shown++;
    });
    r.querySelectorAll(".r4p-row").forEach((sec) => {
      const n = sec.querySelectorAll("button.r4p-tile[data-id]:not([hidden])").length;
      sec.hidden = !n;
      const all = sec.querySelector(".r4p-seeall"); if (all && /^See all/.test(all.textContent)) all.textContent = `See all ${n} ›`;
      // "10 pieces" beside a row's name reads "1 of 10 pieces" while some are hidden, by the search, the type or Content's own
      // buttons (a task row's own line, "Task on Home · 8 to review", is left as it is)
      const sub = sec.querySelector(".r4p-rowh small");
      if (sub) { if (sub.dataset.r4m == null) sub.dataset.r4m = sub.textContent;
        const m = /^(\d+) (pieces?)$/.exec(sub.dataset.r4m);
        sub.textContent = m && n < +m[1] ? `${n} of ${m[1]} ${+m[1] === 1 ? "piece" : "pieces"}` : sub.dataset.r4m; }
      if (typeof sec._check === "function") { try { sec._check(); } catch (e) {} }
    });
    r.querySelector(".r4m-empty")?.remove();
    const anyRow = !!r.querySelector(".r4p-row");
    const sr = r.querySelector(".r4m-sr");
    if (sr) sr.textContent = active && anyRow ? (shown ? `${shown} ${shown === 1 ? "piece matches" : "pieces match"}` : "Nothing matches.") : "";
    const nb = MS.input && MS.input.parentNode && MS.input.parentNode.querySelector(".r4m-n");
    if (nb) { nb.textContent = q && anyRow ? `${shown} found` : ""; nb.parentNode.classList.toggle("r4m-hasn", !!nb.textContent); }
    if (active && anyRow && !shown) {
      const clearAll = () => { MS.q = ""; MS.type = null; if (MS.input) MS.input.value = ""; r.querySelectorAll(".r4m-tchip").forEach((b) => b.setAttribute("aria-pressed", String(!b.dataset.type)));
        const x = r.querySelector(".r4m-x"); if (x) x.hidden = true; apply(r); };
      // [review2 fix, 26 Nov] with one task chosen in the task line, the search can find pieces in the other tasks: offer
      // them (review2 item 15). "All tasks" redraws Content and keeps the search.
      const allBtn = r.querySelector(".r4p-ftasks .r4p-fchip"), inAll = allBtn && allBtn.getAttribute("aria-pressed") === "false"
        ? contentPieces().filter((p) => !isDoc(p) && (!t || typeOf(p) === t) && (!q || fold(p.title).includes(q))).length : 0;
      const card = h("div", { class: "r4p-card r4p-empty r4m-empty", role: "status" }, h("b", { text: inAll ? "Nothing matches in this task." : "Nothing matches." }),
        inAll ? h("button", { type: "button", class: "r4p-btn r4p-sm", onclick: () => allBtn.click() }, `Show all tasks (${inAll} found)`) : null,
        h("button", { type: "button", class: "r4p-btn r4p-sm", onclick: clearAll }, q ? "Clear the search" : "Show all types"));
      (r.querySelector(":scope > .r4m-bar") || r.querySelector(".r4p-filters")).after(card);
    }
  }
  try {
    const o = R4P.render;
    R4P.render = function (page, el, opts) {
      if (page === "content") {
        const target = el || document.getElementById("app");
        const redraw = !(opts && opts.fresh) && !!(target && target.querySelector(":scope > .r4p-content"));
        if (opts && opts.row && !redraw) { MS.q = ""; MS.type = null; MS.focus = false; if (MS.input) MS.input.value = ""; }      // a new arrival from a Home task starts clean, as Content's own filter does
      }
      const out = o.apply(this, arguments);
      if (page === "content") enhance();
      return out;
    };
  } catch (e) { console.warn("R4-merge render", e); }
  // r4_pages.js also redraws Content by itself (its own render, when the library arrives): watch #app for that
  function watchApp() {
    const app = document.getElementById("app"); if (!app || app.__r4mw) return;
    app.__r4mw = true;
    new MutationObserver(() => enhance()).observe(app, { childList: true });
  }
  if (document.getElementById("app")) watchApp(); else document.addEventListener("DOMContentLoaded", watchApp, { once: true });

  // ---------- 4. Download in the side panel ----------
  const DL_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5v9m0 0-3.6-3.6M10 12.5l3.6-3.6M4.5 16.5h11"/></svg>';
  const DL_OK = new Set(["approve", "choose", "scheduled", "published"]);      // not "changes asked": that version is being redone
  const tidy = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").replace(/ħ/g, "h").replace(/Ħ/g, "H")
    .replace(/[^\w\d \-]+/g, " ").replace(/\s+/g, " ").trim();
  function extOf(m) {
    const e = String(m.path || "").split("?")[0].split("/").pop().split(".");
    const x = e.length > 1 ? e.pop().toLowerCase() : "";
    return /^[a-z0-9]{2,5}$/.test(x) ? x : m.type === "video" ? "mp4" : "png";
  }
  // the button's words: the file's own label without its sort mark ("1 Slide 1" -> "Slide 1", "2 Questions" -> "Questions")
  function fileLabel(p, m, k, files) {
    if (p.choice) return "Option " + String.fromCharCode(65 + k);
    const l = String(m.label || "").trim().replace(/^(\d{1,2}|[A-Z])\s+(?=\S)/, "");
    if (l) return l;
    let lf = false; try { lf = /^lead form\b/i.test(p.title) || typeOf(p) === "Lead form"; } catch (e) {}
    return (lf ? "Screen " : files.every((x) => x.type === "video") ? "Video " : "Slide ") + (k + 1);
  }
  // Release 3's Library name: the title (plus the file's label when there are several) and the file's own extension
  const fileName = (p, m, label, many) => (tidy(p.title + (many ? " " + label : "")).slice(0, 80) || "M7Alpha file") + "." + extOf(m);
  function dlLink(p, m, label, many, text, cls) {
    const name = fileName(p, m, label, many);
    let href = ""; try { href = mediaUrl(m.path) + "?download=" + encodeURIComponent(name); } catch (e) { return null; }
    return h("a", { class: "r4c-btn r4c-sm r4m-dlb" + (cls ? " " + cls : ""), href, download: name, rel: "noopener", "data-name": name,
      "aria-label": "Download " + (many ? text : m.type === "video" ? "the video" : "the picture") + " (" + name + ")" }, h("span", { class: "r4c-ic", "aria-hidden": "true", html: DL_SVG }), text);
  }
  function sidePiece() {
    try {
      const st = window.R4C && R4C._state;
      if (!st || st.mode !== "side") return null;
      return st.sideP || (st.id ? R4D.piece(st.id) : null);
    } catch (e) { return null; }
  }
  function addDownload(aside) {
    if (!aside || !on()) return;
    const p = sidePiece(); const old = aside.querySelector(".r4m-dl");
    if (old && p && old.dataset.id === p.id) return;
    if (old) old.remove();
    if (!p || isDoc(p) || !DL_OK.has(p.status)) return;
    const files = (p.media || []).filter((m) => m && m.path && m.type !== "text");
    if (!files.length) return;
    const body = aside.querySelector(".r4c-sbody"); if (!body) return;
    let box;
    if (files.length === 1) {
      const m = files[0], a = dlLink(p, m, "", false, m.type === "video" ? "Download the video" : "Download the picture", "r4m-dl1");
      if (!a) return;
      box = h("div", { class: "r4m-dl", "data-id": p.id }, a);
    } else {
      // the file's name keeps the label's sort mark ("... 1 Slide 1.png"), so the files line up in order in a folder
      const links = files.map((m, k) => { const lab = fileLabel(p, m, k, files), raw = String(m.label || "").trim() || (k + 1) + " " + lab;
        return dlLink(p, m, p.choice ? lab : raw, true, lab); }).filter(Boolean);
      if (!links.length) return;
      box = h("section", { class: "r4c-box r4m-dl", "data-id": p.id, "aria-label": "Download" }, h("h3", { text: "Download" }),
        h("p", { class: "r4c-small r4m-dlh", text: `${files.length} files. Each one downloads on its own.` }), h("div", { class: "r4m-dlrow" }, ...links));
    }
    const after = body.querySelector(":scope > .r4c-sgrid") || body.querySelector(":scope > .r4c-wash");
    if (after) after.after(box); else body.prepend(box);
  }
  function watchSide() {
    const seen = new WeakSet();
    const look = () => {
      const aside = document.querySelector("body > .r4c-root.r4c-m-side > aside.r4c-side");
      if (!aside) return;
      if (!seen.has(aside)) { seen.add(aside); new MutationObserver(() => addDownload(aside)).observe(aside, { childList: true }); }
      addDownload(aside);
    };
    new MutationObserver(look).observe(document.body, { childList: true });
    look();
  }
  if (document.body) watchSide(); else document.addEventListener("DOMContentLoaded", watchSide, { once: true });

  // ---------- start-up ----------
  window.R4MERGE = true;
  window.R4M = { state: MS, apply: applyNow, fileName };          // for checks
  function start() {
    try {
      if (!on()) return;
      const pg = new URLSearchParams(location.search).get("page");
      if (S.lib || (pg && LIBWORD.test(pg))) { toContent("replace"); return; }
      renderSideNav();          // the menu was drawn before R4MERGE was set: draw it again without Library
      enhance();
    } catch (e) { console.warn("R4-merge start", e); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else setTimeout(start, 0);
})();
