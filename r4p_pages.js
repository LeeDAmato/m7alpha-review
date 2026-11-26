/* [PART R4P-pages, 26 Nov 2026] Release 4 on PHONES: Home, Content and Calendar. Owner: Builder P-PAGES.
   Loads only in the phone build (build\R4P.html), after r4_pages.js and r4_merge.js. Everything here acts only at phone
   widths (max-width 900 px) while Release 4 draws (body.r4); a laptop never sees a change.
   Mock-ups: ..\R4_phone_mockups_2026-11-26\ (P01 / P01b / P13 Home, P02 / P03 Content, P11 Calendar).
   - Home and Content: the laptop pages (r4_pages.js, with r4_merge.js's search box and type buttons) are drawn as they
     are, so every link, count, task and redraw works the same; r4p_pages.css lays them out for a phone, and phonePass()
     makes three small word changes: a Home task's line loses "opens Content at this row" (the chevron says it), a Content
     row's line loses "Task on Home ·", and each tile gets its phone size class (r4pp-sq / -tall / -land / -pick).
     Content on a phone keeps only the type line and the task line (Lee left out the status and channel buttons).
     While a search or a type is chosen, the matching tiles show in one grid, waiting first (mock-up P03).
     The grown tile (hover) never shows on a phone (r4p_pages.css hides it; touch never starts it).
   - Calendar: drawn here. Week first (P11): ‹ week › and Today, the week strip with a dot for each piece, the list by
     day (picture, title, channels, type · time, status). Month: a small month grid with dots; a tap on a day shows that
     day's list under it. A tap on a piece opens it at once (R4C.open).
   Wraps window.R4P.render by reassigning it (never edits another file). Reads only; never writes, never sends. */
(function () {
  "use strict";
  if (window.__r4pp) return;
  window.__r4pp = true;
  if (!window.R4P || typeof R4P.render !== "function") { console.warn("R4P-pages: R4P is missing"); return; }
  const MQ = matchMedia("(max-width: 900px)");
  const narrow = () => { try { return MQ.matches; } catch (e) { return false; } };
  const phone = () => narrow() && document.body.classList.contains("r4");
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toDate = (s) => new Date(String(s).slice(0, 10) + "T12:00:00");
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); return addDays(x, -((x.getDay() + 6) % 7)); };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const dayLabel = (s) => { try { return R4P.dayLabel(s); } catch (e) { const d = toDate(s); return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; } };
  const shortTitle = (t) => { try { return R4P.shortTitle(t); } catch (e) { return String(t || ""); } };
  const typeName = (p) => { try { return R4P.typeName(p); } catch (e) { return p.kindLabel || "Post"; } };
  // no word alone on the last line: the last two words are joined with a no-break space (as r4_pages.js does)
  const nw = (s) => { s = String(s || "").trim().replace(/(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/g, "$1 $2"); const i = s.lastIndexOf(" "); return i > 0 && s.split(" ").length > 2 ? s.slice(0, i) + " " + s.slice(i + 1) : s; };
  const calm = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const SV = (d, w) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="${w || 2.2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IC = { l: SV('<path d="m14.5 6-6 6 6 6"/>'), r: SV('<path d="m9.5 6 6 6-6 6"/>') };
  function openPiece(id, rowKey) {
    try { if (window.R4C && R4C.open) R4C.open(id, { rowKey: rowKey || (window.R4D && R4D.rowOf(id)) || null }); } catch (e) { console.warn("R4P-pages open", e); }
  }

  // ---------- the status label and the dot of a piece ----------
  const ST_CLS = { wait: "wait", change: "chg", approve: "pub", choose: "pub", scheduled: "sch", published: "pub", done: "plan" };
  const chip = (p) => h("span", { class: "r4p-chip r4p-c-" + (ST_CLS[p.status] || "plan"), text: p.status === "wait" ? "Waiting" : p.status === "done" ? "Planned" : p.statusLabel || "Planned" });
  const DOT = { wait: "dw", scheduled: "ds", approve: "dp", choose: "dp", published: "dp", change: "dc" };
  const dotOf = (p) => DOT[p.status] || "dn";
  function legend(ps) {
    const has = new Set(ps.map(dotOf)); if (!has.size) return null;
    const pub = ps.some((p) => p.status === "published"), ok = ps.some((p) => p.status === "approve" || p.status === "choose");
    const L = [["dw", "Waiting for you"], ["ds", "Scheduled"], ["dp", pub && ok ? "Approved or published" : pub ? "Published" : "Approved"], ["dc", "Changes asked"], ["dn", "Planned"]];
    return h("div", { class: "r4pp-key", "aria-hidden": "true" }, ...L.filter(([k]) => has.has(k)).map(([k, t]) => h("span", {}, h("i", { class: "r4pp-" + k }), t)));
  }

  // ---------- Home and Content: the laptop page, shaped for a phone ----------
  const contentRoot = () => { const app = document.getElementById("app"); return app && app.querySelector(":scope > .r4p-content"); };
  function phonePass() {
    if (!phone()) return;
    const app = document.getElementById("app"); if (!app) return;
    const home = app.querySelector(":scope > .r4p-home"); if (home && !home.__r4pp) homePass(home);
    const c = app.querySelector(":scope > .r4p-content"); if (c) contentPass(c);
  }
  const parts = (t) => String(t || "").split(" · ").map((x) => x.trim().replace(/ /g, " ")).join(" · ");          // a line of "a · b · c" breaks only between its parts
  function homePass(root) {
    root.__r4pp = true;
    // the mock-up's shorter line (P01): "You have 5 things to look at. Start with this one." (the count of pieces is on Content's tab)
    const sub = root.querySelector(":scope > .r4p-top .r4p-sub");
    const SHORT = /(, including \d+ pieces of content| \d+ pieces of content are waiting\.)/;          // both wordings r4_pages.js has used
    if (sub && SHORT.test(sub.textContent)) sub.textContent = nw(sub.textContent.replace(/ /g, " ").replace(SHORT, ""));
    // "Plan · 3 pages · Answer by Sat 28 Nov": the line breaks only between its parts, so "Nov" never sits alone at 375 px
    const det = root.querySelector(".r4p-hero .r4p-herom");
    if (det && / · /.test(det.textContent)) det.textContent = parts(det.textContent);
    // "8 posts · answer by 1 Dec · opens Content at this row" -> "8 posts · answer by 1 Dec" (the chevron says where it goes)
    root.querySelectorAll(".r4p-task .r4p-taskt small").forEach((s) => {
      const t = s.textContent.replace(/ /g, " ").replace(/\s·\sopens\b[\s\S]*$/i, "");
      if (t !== s.textContent.replace(/ /g, " ")) s.textContent = nw(t);
    });
  }
  function contentPass(root) {
    root.querySelectorAll(".r4p-row .r4p-tile, .r4pp-found .r4p-tile").forEach((t) => {
      if (t.dataset.r4pp) return;
      const a = t.querySelector(":scope > .r4p-art");
      const k = a ? (a.classList.contains("r4p-land") ? "land" : parseInt(a.style.width, 10) === 150 ? "tall" : "sq") : t.querySelector(":scope > .r4p-pick") ? "pick" : "sq";
      t.dataset.r4pp = k; t.classList.add("r4pp-" + k);
    });
    // a task row's line "Task on Home · 8 to review · answer by 1 Dec" -> "8 to review · answer by 1 Dec" (r4_merge.js keeps
    // the line in data-r4m and puts it back on each search, so that copy changes too)
    const strip = (x) => String(x || "").replace(/^Task on Home\s·\s/, "").replace(/(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/g, "$1 $2");
    root.querySelectorAll(".r4p-row .r4p-rowh small").forEach((s) => {
      if (s.dataset.r4m != null && s.dataset.r4m !== strip(s.dataset.r4m)) s.dataset.r4m = strip(s.dataset.r4m);
      const v = strip(s.textContent); if (v !== s.textContent) s.textContent = v;
    });
    // the green line over the row a Home task opened: it breaks only between its parts ("answer by 1 Dec" stays whole)
    root.querySelectorAll(".r4p-lit .r4p-lits").forEach((x) => { if (/ · |\d \w/.test(x.textContent)) x.textContent = parts(x.textContent); });
    found(root);
    fitMeta(root);
  }
  // "Carousel · Wed 23 Dec" is wider than a 132 px tile: the weekday goes ("Carousel · 23 Dec") rather than the date ending in "…"
  function fitMeta(root) {
    root.querySelectorAll(".r4p-tile .r4p-meta").forEach((m) => {
      if (m.dataset.r4ppFit || !m.clientWidth) return;
      m.dataset.r4ppFit = "1";
      if (m.scrollWidth <= m.clientWidth + 1) return;
      for (const n of m.childNodes) if (n.nodeType === 3 && /(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d/.test(n.textContent)) n.textContent = n.textContent.replace(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?=\d)/, "");
    });
  }
  // ---------- Content: search or type chosen -> one grid of the matching pieces, waiting first (P03) ----------
  const ONE = { Post: ["post", "posts"], Carousel: ["carousel", "carousels"], Advert: ["advert", "adverts"], Story: ["Story", "Stories"], Video: ["video", "videos"],
    Reel: ["reel", "reels"], "Photo set": ["photo set", "photo sets"], Article: ["article", "articles"], "Lead form": ["lead form", "lead forms"], "Pick one": ["choice", "choices"] };
  function found(root) {
    const M = window.R4M && R4M.state; if (!M) return;
    const old = root.querySelector(":scope > .r4pp-found"); if (old) old.remove();
    // r4_merge.js puts its "Nothing matches." card under the type line; on a phone the task line comes next, so the card goes under that
    const empty = root.querySelector(":scope > .r4m-empty"), tl = root.querySelector(":scope > .r4p-ftasks");
    if (empty && tl && (empty.compareDocumentPosition(tl) & Node.DOCUMENT_POSITION_FOLLOWING)) tl.after(empty);
    const q = String(M.q || "").trim(), t = M.type || null;
    const tiles = (q || t) ? [...root.querySelectorAll(":scope > .r4p-row button.r4p-tile[data-id]")].filter((b) => !b.hidden && !b.closest(".r4p-row").hidden) : [];
    root.classList.toggle("r4pp-searching", tiles.length > 0);
    if (!tiles.length) return;          // nothing chosen, or nothing matches (r4_merge.js shows "Nothing matches.")
    const list = tiles.map((b, i) => ({ b, i, p: (window.R4D && R4D.piece(b.dataset.id)) || {}, row: b.closest(".r4p-row").dataset.row }))
      .sort((x, y) => (x.p.waiting ? 0 : 1) - (y.p.waiting ? 0 : 1) || x.i - y.i);
    const n = list.length, w = t && ONE[t] ? ONE[t] : ["piece", "pieces"], noun = n === 1 ? w[0] : w[1];
    const mixed = list.some((x) => x.p.waiting) && list.some((x) => !x.p.waiting);
    const grid = h("div", { class: "r4p-tiles r4p-wrap r4pp-grid" }, ...list.map(({ b, p, row }) => {
      const pic = b.querySelector(":scope > .r4p-art, :scope > .r4p-pick"), meta = b.querySelector(":scope > .r4p-meta");
      const k = b.dataset.r4pp || "sq";
      return h("button", { type: "button", class: "r4p-tile r4pp-" + k, "data-fid": p.id || b.dataset.id, "data-r4pp": k, "aria-label": b.getAttribute("aria-label") || "",
        onclick: () => openPiece(b.dataset.id, row) }, pic ? pic.cloneNode(true) : null, meta ? meta.cloneNode(true) : null);
    }));
    const sec = h("section", { class: "r4pp-found", "aria-label": "What you searched for" },
      h("div", { class: "r4pp-fh" }, h("b", { text: q ? `${n} ${noun} with “${q}”` : `${n} ${noun}` }), mixed ? h("small", { text: "Waiting for you first, then the rest" }) : null), grid);
    const at = root.querySelector(":scope > .r4p-above, :scope > .r4p-row");
    root.insertBefore(sec, at || null);
    fitMeta(sec);
  }
  // the search box and the type buttons change the page without a redraw: build the grid again just after r4_merge.js has
  // hidden or shown the tiles (its own handlers sit on the box and buttons, so they run before these)
  const later = () => { if (!phone()) return; requestAnimationFrame(() => { const r = contentRoot(); if (r) found(r); }); };
  document.addEventListener("input", (e) => { if (e.target && e.target.closest && e.target.closest(".r4m-search")) later(); });
  document.addEventListener("click", (e) => { if (e.target && e.target.closest && e.target.closest(".r4m-tchip, .r4m-x, .r4m-empty")) later(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && e.target && e.target.closest && e.target.closest(".r4m-search")) later(); });

  // ---------- Calendar (phone) ----------
  const CALP = { mode: "week", wk: null, sel: null, tapped: false, y: null, m: null, tok: 0, el: null, opts: {} };
  const sig = () => { try { return R4D.pieces().map((p) => p.id + p.status + p.date + (p.time || "")).join("|"); } catch (e) { return ""; } };
  function calRender(el, opts) {
    el = el || document.getElementById("app"); if (!el || !window.R4D) return;
    opts = opts || {};
    try { R4P.closePop(); } catch (e) {}
    CALP.el = el; CALP.opts = opts;
    const redraw = !opts.fresh && !!el.querySelector(":scope > .r4pp-cal");
    const keep = redraw ? [el.scrollTop, window.scrollY] : null;
    const root = h("div", { class: "r4p r4p-calendar r4pp-cal", "data-page": "calendar" });
    try { drawCal(root); } catch (e) {
      console.warn("R4P-pages calendar", e);
      root.replaceChildren(h("div", { class: "r4p-card r4p-empty" }, h("b", { text: "This page can't show right now." }), h("span", { text: "Please try again in a moment." })));
    }
    el.replaceChildren(root); el.__r4p = "calendar";
    if (keep) { const put = () => { if (Math.abs(el.scrollTop - keep[0]) > 2) el.scrollTop = keep[0]; if (Math.abs(window.scrollY - keep[1]) > 2) window.scrollTo(0, keep[1]); }; put(); requestAnimationFrame(put); }
    // the library (answered pieces too) loads once per visit: draw again when it adds or changes pieces
    const tok = ++CALP.tok, s0 = sig();
    try { R4D.ready().then(() => { if (tok === CALP.tok && root.isConnected && sig() !== s0) calRender(el, Object.assign({}, opts, { keepScroll: true, fresh: false })); }); } catch (e) {}
  }
  const calAgain = (then) => { calRender(CALP.el, Object.assign({}, CALP.opts, { keepScroll: true, fresh: false })); if (then) requestAnimationFrame(then); };
  // bring a part of the list into view when it is out of sight (the shell's header sits over the top: see scroll-margin-top)
  function showEl(sel) {
    const x = CALP.el && CALP.el.querySelector(sel); if (!x) return;
    const r = x.getBoundingClientRect(), vh = (window.visualViewport && visualViewport.height) || innerHeight;
    if (r.top < 70 || r.top > vh * .62) x.scrollIntoView({ block: "start", behavior: calm() ? "auto" : "smooth" });
  }
  function evRow(p) {
    const title = shortTitle(p.title) || typeName(p), type = typeName(p), rowKey = window.R4D ? R4D.rowOf(p.id) : null;
    const th = h("span", { class: "r4pp-th", "aria-hidden": "true" });
    if (p.thumb) th.append(h("img", { src: p.thumb, alt: "", loading: "lazy", decoding: "async", draggable: "false" }));
    let chans = null; try { chans = (p.platforms || []).length ? R4P.channelIcons(p.platforms) : null; } catch (e) {}
    return h("button", { type: "button", class: "r4p-card r4pp-ev", "data-id": p.id,
      "aria-label": `${title}. ${type}${p.time ? " at " + p.time : ""}. ${p.statusLabel || "Planned"}`, onclick: () => openPiece(p.id, rowKey) },
      th,
      h("span", { class: "r4pp-evm" }, h("b", { text: nw(title) }),
        h("span", { class: "r4pp-evs" }, chans, h("span", { class: "r4pp-evk", text: type + (p.time ? " · " + p.time : "") }), chip(p))),
      h("span", { class: "r4pp-chev", "aria-hidden": "true", html: IC.r }));
  }
  function dayBlock(k, ps) {
    return [h("div", { class: "r4pp-dayh", "data-day": k }, h("b", { text: dayLabel(k) }), h("span", { text: plural(ps.length, "piece", "pieces") })), ...ps.map(evRow)];
  }
  const dots = (ps) => h("span", { class: "r4pp-dd", "aria-hidden": "true" }, ...ps.slice(0, 3).map((p) => h("i", { class: "r4pp-" + dotOf(p) })));
  function drawCal(root) {
    const now = new Date(), t0 = iso(now);
    if (!CALP.wk) CALP.wk = monday(now);
    if (CALP.y == null) { CALP.y = now.getFullYear(); CALP.m = now.getMonth(); }
    const all = R4D.pieces().filter((p) => !p.panel && p.date).sort((a, b) => String(a.time || "99").localeCompare(String(b.time || "99")));
    const byDay = new Map(); all.forEach((p) => { const k = String(p.date).slice(0, 10); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(p); });
    const seg = (k, l) => h("button", { type: "button", "aria-pressed": String(CALP.mode === k), onclick: () => {
      if (CALP.mode === k) return;
      if (k === "month") { const d = CALP.sel ? toDate(CALP.sel) : addDays(CALP.wk, 3); CALP.y = d.getFullYear(); CALP.m = d.getMonth(); }
      else CALP.wk = monday(CALP.sel ? toDate(CALP.sel) : new Date(CALP.y, CALP.m, 1, 12));
      CALP.mode = k; calAgain(); } }, l);
    root.append(h("div", { class: "r4pp-calhead" }, h("h1", { class: "r4p-h1", text: "Calendar" }),
      h("div", { class: "r4pp-seg", role: "group", "aria-label": "Show one week or one month" }, seg("week", "Week"), seg("month", "Month"))));
    const today = () => { const t = new Date(); CALP.wk = monday(t); CALP.y = t.getFullYear(); CALP.m = t.getMonth(); CALP.sel = iso(t); CALP.tapped = false; calAgain(); };
    const nav = (label, prevL, nextL, shift) => h("div", { class: "r4pp-nav" },
      h("button", { type: "button", class: "r4pp-rb", "aria-label": prevL, onclick: () => shift(-1), html: IC.l }),
      h("b", { class: "r4pp-navl", "aria-live": "polite", text: label }),
      h("button", { type: "button", class: "r4pp-rb", "aria-label": nextL, onclick: () => shift(1), html: IC.r }),
      h("button", { type: "button", class: "r4p-btn r4p-sm r4pp-tod", onclick: today }, "Today"));
    if (CALP.mode === "week") drawWeek(root, byDay, all, t0, nav); else drawMonth(root, byDay, t0, nav);
  }
  function drawWeek(root, byDay, all, t0, nav) {
    const a = CALP.wk, days = [...Array(7)].map((_, i) => addDays(a, i)), keys = days.map(iso);
    if (CALP.sel && !keys.includes(CALP.sel)) { CALP.sel = null; CALP.tapped = false; }
    if (!CALP.sel && keys.includes(t0)) { CALP.sel = t0; CALP.tapped = false; }
    const b = days[6];
    const label = a.getMonth() === b.getMonth() ? `${a.getDate()} to ${b.getDate()} ${MON[b.getMonth()]}` : `${a.getDate()} ${MON[a.getMonth()]} to ${b.getDate()} ${MON[b.getMonth()]}`;
    root.append(nav(label, "Previous week", "Next week", (d) => { CALP.wk = addDays(CALP.wk, 7 * d); CALP.sel = null; const th = addDays(CALP.wk, 3); CALP.y = th.getFullYear(); CALP.m = th.getMonth(); calAgain(); }));
    root.append(h("div", { class: "r4pp-strip", role: "group", "aria-label": "Days of this week" }, ...days.map((d, i) => {
      const k = keys[i], ps = byDay.get(k) || [];
      return h("button", { type: "button", class: "r4pp-wd" + (k === t0 ? " r4pp-now" : ""), "aria-pressed": String(CALP.sel === k), "aria-current": k === t0 ? "date" : null,
        "aria-label": `${dayLabel(k)}${k === t0 ? ", today" : ""}: ${ps.length ? plural(ps.length, "piece", "pieces") : "nothing planned"}`,
        onclick: () => { CALP.sel = k; CALP.tapped = true; calAgain(() => showEl(`.r4pp-dayh[data-day="${k}"]`)); } },
        h("small", { text: WD[d.getDay()] }), h("b", { text: String(d.getDate()) }), dots(ps));
    })));
    const inWeek = keys.flatMap((k) => byDay.get(k) || []);
    const key = legend(inWeek); if (key) root.append(key);
    const list = h("div", { class: "r4pp-list" });
    if (CALP.sel && CALP.tapped && !(byDay.get(CALP.sel) || []).length && inWeek.length) list.append(h("p", { class: "r4pp-none", text: `Nothing planned on ${dayLabel(CALP.sel)}.` }));
    keys.forEach((k) => { const ps = byDay.get(k) || []; if (ps.length) list.append(...dayBlock(k, ps)); });
    if (!inWeek.length) {
      const after = all.map((p) => String(p.date).slice(0, 10)).filter((k) => k > keys[6]).sort()[0];
      const before = all.map((p) => String(p.date).slice(0, 10)).filter((k) => k < keys[0]).sort().pop();
      const jump = (k) => h("button", { type: "button", class: "r4p-btn r4p-sm", onclick: () => { CALP.wk = monday(toDate(k)); CALP.sel = k; calAgain(); } }, (k > keys[6] ? "Next: " : "Before: ") + dayLabel(k));
      list.append(h("div", { class: "r4p-card r4pp-empty" }, h("b", { text: "Nothing planned this week." }),
        (after || before) ? h("div", { class: "r4pp-jumps" }, after ? jump(after) : null, before ? jump(before) : null) : null));
    }
    root.append(list);
  }
  function drawMonth(root, byDay, t0, nav) {
    const first = new Date(CALP.y, CALP.m, 1, 12), last = new Date(CALP.y, CALP.m + 1, 0, 12);
    const inMonth = (k) => k.slice(0, 7) === iso(first).slice(0, 7);
    if (CALP.sel && !inMonth(CALP.sel)) CALP.sel = null;
    if (!CALP.sel) CALP.sel = inMonth(t0) ? t0 : ([...byDay.keys()].filter(inMonth).sort()[0] || iso(first));
    root.append(nav(`${MONTH[CALP.m]} ${CALP.y}`, "Previous month", "Next month", (d) => { const x = new Date(CALP.y, CALP.m + d, 1, 12); CALP.y = x.getFullYear(); CALP.m = x.getMonth(); CALP.sel = null; calAgain(); }));
    const cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => h("span", { class: "r4pp-mh", "aria-hidden": "true", text: d }));
    for (let d = monday(first), end = addDays(monday(last), 6); d <= end; d = addDays(d, 1)) {
      const k = iso(d);
      if (!inMonth(k)) { cells.push(h("span", { class: "r4pp-md r4pp-out", "aria-hidden": "true" }, h("b", { text: String(d.getDate()) }))); continue; }
      const ps = byDay.get(k) || [];
      cells.push(h("button", { type: "button", class: "r4pp-md" + (k === t0 ? " r4pp-now" : ""), "aria-pressed": String(CALP.sel === k), "aria-current": k === t0 ? "date" : null,
        "aria-label": `${dayLabel(k)}${k === t0 ? ", today" : ""}: ${ps.length ? plural(ps.length, "piece", "pieces") : "nothing planned"}`,
        onclick: () => { CALP.sel = k; calAgain(() => showEl(".r4pp-list")); } }, h("b", { text: String(d.getDate()) }), dots(ps)));
    }
    root.append(h("div", { class: "r4pp-month", role: "group", "aria-label": `${MONTH[CALP.m]} ${CALP.y}` }, ...cells));
    const inM = [...byDay.entries()].filter(([k]) => inMonth(k)).flatMap(([, ps]) => ps);
    const key = legend(inM); if (key) root.append(key);
    const ps = byDay.get(CALP.sel) || [];
    root.append(h("div", { class: "r4pp-list" }, ...(ps.length ? dayBlock(CALP.sel, ps)
      : [h("div", { class: "r4pp-dayh", "data-day": CALP.sel }, h("b", { text: dayLabel(CALP.sel) })), h("p", { class: "r4pp-none", text: inM.length ? "Nothing planned on this day." : `Nothing planned in ${MONTH[CALP.m]}.` })])));
  }

  // ---------- wiring ----------
  const prev = R4P.render;
  R4P.render = function (page, el, opts) {
    if (page === "calendar" && narrow()) return calRender(el, opts);
    const out = prev.apply(this, arguments);
    phonePass();
    return out;
  };
  // r4_pages.js also draws again by itself (when the library arrives) and r4_merge.js adds its search box then: shape that too
  function watchApp() {
    const app = document.getElementById("app"); if (!app || app.__r4ppw) return;
    app.__r4ppw = true;
    new MutationObserver(() => phonePass()).observe(app, { childList: true });
  }
  if (document.getElementById("app")) watchApp(); else document.addEventListener("DOMContentLoaded", watchApp, { once: true });
  // crossing 900 px (a window made narrower or wider): draw the page again in the other layout
  const onWidth = () => { try { if (window.R4 && R4.page && document.body.classList.contains("r4")) R4.refresh(); } catch (e) {} };
  try { MQ.addEventListener("change", onWidth); } catch (e) { try { MQ.addListener(onWidth); } catch (e2) {} }
  window.R4PP = { calendar: CALP, pass: phonePass };          // for checks
  phonePass();
})();
