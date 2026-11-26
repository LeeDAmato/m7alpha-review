/* [PART R4-shell, 26 Nov 2026] Release 4: the switch, the routing and the side menu (laptop, client view).
   Owner: Builder C. Loads after the page's own scripts and after r4_data.js (see patch_R4_load.py).
   - The switch: body gets the class "r4" while R4D.on() is true (a client's view, or our Client view, on a laptop).
     Phones and the team's own pages never get it, so they stay exactly Release 3. Checked on every renderApp,
     every renderSideNav and every resize.
   - window.R4 = {
       page                     "home" | "content" | "calendar", or null on a Release 3 page (Library, Reports, Tasks...)
       go(page, opts)           go("content", { row }) draws a Release 4 page (window.R4P.render(page, #app, opts)) and
                                puts it in the address. go("library" | "reports" | "tasks" | "leads" | "brand" | "docs")
                                opens that Release 3 page (its own r3Go). go(null) only lets go of the Release 4 page (the
                                caller then presses a Release 3 page's own button). opts: { row, open, replace, keepScroll }
       refresh()                draws the current Release 4 page again (after an answer); opts carry { refresh: true }
       setUrl(params, how)      changes the address: { page, row, open } (null or "" removes one). how "push" (default)
                                or "replace". Every other part of the address (c, u, b, demo...) is kept.
     }
   - THE ADDRESS USES page=, NOT p=. Release 3 reads p= as "a link to one piece" and, when no piece has that id, reloads
     the page on the plain link (goBoard), so ?p=calendar could never be shared. The address is
     ?c=<code>&page=content&row=<key>&open=<id>. setUrl({ p }) is taken as page.
   - Back and forward draw the page from the address again; when only &open= changed, the page is left as it is and the
     card is opened or closed (window.R4C). A shared link with &open= opens that card once the page has drawn.
   - A waiting document opened from Release 3's Reports page (r3OpenDoc / r3DocCard) opens in Release 4's card
     (R4C.open("pc-document-<id>")), not Release 3's one-by-one deck; the address becomes &page=reports&open=<id>.
   - No Release 3 card on a laptop client view (review finding 1, 26 Nov 2026): libAnswer (a waiting Library tile),
     libView (an answered one), openStory (the gate of Release 3's deck: openFromHome, openHomeDeck, libOne, r3OpenTask,
     a ?p=<piece> link...) and the Library's "Review one by one" all open Release 4's card (R4C) instead, so Draw, Pin
     and Edit caption never show. A redraw of the same page and row (a quiet reload) keeps the scroll (finding 3).
   - Release 3's own Dashboard and Review are replaced on a laptop by Home and Content. While a Release 4 page shows,
     S.r3page is "r4" (truthy), so Release 3's load() never opens its one-by-one deck over the page; on a phone "r4"
     reads as Release 3's Dashboard.
   - The menu: logo, the client box, Home, Content (waiting pieces), Calendar, then the Release 3 pages this client has
     (mirrored from the page's own buttons), then How it works, Night/Day version and the black Message M7Alpha bar
     (it opens the page's own message box, r3MsgBox). The count circle on that bar shows when window.R4MSG.unread or
     S.data.client.unread_replies is above 0 (nothing hands out unread replies yet). */
(function () {
  "use strict";
  if (window.R4 && window.R4.__shell) return;
  const PAGES = ["home", "content", "calendar"];
  // Release 3's pages: the address word -> r3Go's word, and the menu word -> the address word
  const R3GO = { library: "lib", reports: "reports", tasks: "tasks", leads: "leads", brand: "brand", docs: "docs", documents: "docs" };
  const LABEL = { Library: "library", Reports: "reports", Tasks: "tasks", Leads: "leads", Brand: "brand", Documents: "docs" };
  const st = { page: null, opts: {}, pendingR3: null, pendingOpen: null, booted: false, firstDraw: false, tries: 0, tasksN: null, tasksLoading: false };
  const q = () => new URLSearchParams(location.search);
  const on = () => { try { return !!(window.R4D && R4D.on()); } catch (e) { return false; } };
  const el = (tag, attrs, ...kids) => {
    try { return h(tag, attrs || {}, ...kids); } catch (e) {
      const x = document.createElement(tag);
      Object.entries(attrs || {}).forEach(([k, v]) => { if (v == null) return; if (k === "text") x.textContent = v; else if (k === "html") x.innerHTML = v; else if (k.startsWith("on")) x[k] = v; else x.setAttribute(k, v); });
      kids.flat().forEach((k) => { if (k != null && k !== false) x.append(k); }); return x;
    }
  };
  // the switch
  function sw() {
    const v = on(); document.body.classList.toggle("r4", v); if (!v) document.body.classList.remove("r4pg");
    // [PART R4-boot] the page starts blank on a laptop client link (no flash of the old page): show it once Release 4
    // draws, or once the data says Release 4 is not for this view
    let ready = v; try { ready = v || !!S.data; } catch (e) {}
    if (ready) document.documentElement.classList.remove("r4-boot", "r4-bootn");
    return v;
  }

  // which Release 3 page shows now (the address word), or null
  function curR3() {
    try { if (S.lib) return "library"; if (S.panel) return S.panel; if (S.r3page === "reports") return "reports"; } catch (e) {}
    return null;
  }
  function setUrl(params, how) {
    const P = Object.assign({}, params || {});
    if ("p" in P) { if (!("page" in P)) P.page = P.p; delete P.p; }
    const u = new URL(location.href);
    for (const [k, v] of Object.entries(P)) { if (v == null || v === "" || v === false) u.searchParams.delete(k); else u.searchParams.set(k, String(v)); }
    // Release 3's "p" must never get into a Release 4 address (it would reload the page on the plain link)
    if (u.searchParams.get("p") && PAGES.concat(Object.keys(R3GO)).includes(u.searchParams.get("p"))) u.searchParams.delete("p");
    const to = u.pathname + u.search + u.hash;
    if (to === location.pathname + location.search + location.hash) return;
    const state = { r4: true, page: u.searchParams.get("page"), row: u.searchParams.get("row"), open: u.searchParams.get("open") };
    try { history[how === "replace" ? "replaceState" : "pushState"](state, "", to); } catch (e) {}
  }
  // Release 3's state for a Release 4 page: no Library, no plug-in page, no deck
  function holdR3() {
    try {
      $("#lcard")?.remove(); try { libViewClose(); } catch (e) {}
      S.lib = false; S.panel = null; S.r3page = "r4"; S.r3back = null; S.r3BackToLib = false;
    } catch (e) {}
  }
  // what Release 3 did by itself, seen at a redraw: did it go to one of its own pages, or back to its Dashboard / Review?
  function sync() {
    try {
      if (S.story >= 0) return;          // Release 3's deck is open over the page (a document from Reports): leave it
      const r3 = curR3();
      if (st.page) {
        if (r3) { st.page = null; setUrl({ page: r3, row: null, open: null }, "replace"); return; }
        if (S.r3page !== "r4") S.r3page = "r4";          // its first-visit Dashboard (load) or anything else: we hold the page
        return;
      }
      if (r3) return;
      // no Release 3 page and no Release 4 page: its Dashboard is our Home, its Review is our Content
      st.page = S.r3page === "dash" || S.r3page === "r4" ? "home" : "content";
      st.opts = {}; holdR3(); setUrl({ page: st.page === "home" ? null : st.page, row: null, open: null }, "replace");
    } catch (e) { console.warn("R4-shell sync", e); }
  }
  function loadingBox(text) {
    return el("div", { class: "r4-loading", role: "status" }, el("span", { class: "r4-spin", "aria-hidden": "true" }), el("span", { text: text || "Loading…" }));
  }
  function draw(redraw) {
    const app = document.getElementById("app"); if (!app) return;
    const key = st.page + "|" + (st.opts.row || ""), o = Object.assign({}, st.opts);
    if (redraw && st.drawnKey === key) { o.keepScroll = true; o.refresh = true; }      // the same page again (a quiet reload): stay where the client is
    document.body.classList.add("r4pg"); document.body.classList.remove("r3pg", "libview");
    try { renderWho(); } catch (e) {}
    try { renderModeToggle(); } catch (e) {}
    document.body.classList.remove("libview");
    if (window.R4P && typeof R4P.render === "function") {
      st.tries = 0;
      try { R4P.render(st.page, app, o); st.drawnKey = key; }
      catch (e) { console.warn("R4-shell R4P.render", e); app.replaceChildren(el("div", { class: "r4-loading" }, el("span", { text: "This page can't load right now. Please try again." }))); }
    } else {
      app.replaceChildren(loadingBox());
      if (st.tries++ < 40) setTimeout(() => { if (st.page && on() && S.story < 0) draw(); }, 250);
    }
    openPending();
  }
  // a shared link (or Back / forward) with &open=: open that card once the page is there (Release 4 and Release 3 pages)
  function openPending() {
    if (!st.pendingOpen || !window.R4C || typeof R4C.open !== "function") return;
    try { if (S.story >= 0) return; } catch (e) {}
    const id = st.pendingOpen, row = st.opts.row || q().get("row") || null; st.pendingOpen = null;
    setTimeout(() => { try { if (!R4C.isOpen || !R4C.isOpen()) R4C.open(id, { rowKey: row, fromHistory: true }); } catch (e) { console.warn("R4-shell R4C.open", e); } }, 60);
  }

  // the page's renderApp: Release 4's pages on a laptop client view, Release 3's everywhere else
  const r4RA = renderApp;
  renderApp = function () {
    const v = sw();
    if (!v) {
      try { if (S.r3page === "r4") S.r3page = "dash"; } catch (e) {}
      return r4RA.apply(this, arguments);
    }
    if (!st.firstDraw && S.data) { st.firstDraw = true; if (!st.pendingOpen) st.pendingOpen = q().get("open") || null; }
    if (st.pendingR3 && S.data) {          // a shared link to a Release 3 page (&page=library): now that the data is here
      const n = st.pendingR3; st.pendingR3 = null; st.page = null;
      try { return r3Go(n); } catch (e) {}
    }
    sync();
    if (!st.page || S.story >= 0) { document.body.classList.remove("r4pg"); const out = r4RA.apply(this, arguments); openPending(); return out; }
    if (S.r3page !== "r4") holdR3();
    return draw(true);
  };

  // ---------- going between pages ----------
  function go(page, opts) {
    opts = opts || {};
    page = page == null ? null : String(page).toLowerCase();
    if (page === "dashboard") page = "home";
    if (page === "review") page = "content";
    if (page && R3GO[page]) {                 // a Release 3 page
      st.page = null; st.opts = {};
      try { if (S.r3page === "r4") S.r3page = null; } catch (e) {}
      if (!opts.fromHistory) setUrl({ page, row: null, open: null }, opts.replace ? "replace" : "push");
      try { r3Go(R3GO[page]); } catch (e) { console.warn("R4-shell r3Go", e); }
      return;
    }
    if (!page) {          // let go; { r3: "reports" } also says which Release 3 page the caller is about to open (for the address)
      st.page = null; st.opts = {}; try { if (S.r3page === "r4") S.r3page = null; } catch (e) {}
      const back = { lib: "library", reports: "reports", tasks: "tasks", leads: "leads", brand: "brand", docs: "docs" }[String(opts.r3 || "")];
      if (back && !opts.fromHistory) setUrl({ page: back, row: null, open: null }, opts.replace ? "replace" : "push");
      return;
    }
    if (!PAGES.includes(page)) return;
    st.page = page; st.opts = Object.assign({}, opts); delete st.opts.replace; delete st.opts.fromHistory;
    try { if (window.R4C && R4C.isOpen && R4C.isOpen() && !opts.open) R4C.close({ quiet: true }); } catch (e) {}
    try { if (S.story >= 0) { S.r3back = null; closeStory(); } } catch (e) {}
    holdR3();
    if (!opts.fromHistory) setUrl({ page: page === "home" ? null : page, row: opts.row || null, open: opts.open || null }, opts.replace ? "replace" : "push");
    if (opts.open) st.pendingOpen = opts.open;
    if (!on() || !S.data) return;
    sw(); draw();
    if (!opts.keepScroll && !opts.row) { try { window.scrollTo(0, 0); document.getElementById("app").scrollTop = 0; } catch (e) {} }
  }
  function refresh() {
    if (!on() || !S.data) return renderApp();
    if (!st.page) return renderApp();
    sw(); const keep = st.opts; st.opts = Object.assign({}, keep, { refresh: true, keepScroll: true }); draw(); st.opts = keep;
  }
  // the address -> the page (start-up and Back / forward)
  function fromAddress(how) {
    const a = q(), pg = String(a.get("page") || "").toLowerCase(), row = a.get("row") || null, open = a.get("open") || null;
    const was = { page: st.page, row: st.opts.row || null };
    const card = () => { try { return !!(window.R4C && R4C.isOpen && R4C.isOpen()); } catch (e) { return false; } };
    if (pg && R3GO[pg]) {
      if (!S.data) { st.pendingR3 = R3GO[pg]; st.page = null; st.pendingOpen = open; return; }
      const same = curR3() === (pg === "documents" ? "docs" : pg);
      if (!open && card()) { try { R4C.close({ fromHistory: true }); } catch (e) {} }
      if (!same) { st.pendingOpen = open; go(pg, { fromHistory: true }); return; }
      if (open && !card() && window.R4C) { try { R4C.open(open, { rowKey: row, fromHistory: true }); } catch (e) {} }
      return;
    }
    const page = PAGES.includes(pg) ? pg : pg === "dashboard" ? "home" : pg === "review" ? "content" : "home";
    if (how === "start" || !S.data) { st.page = page; st.opts = { row, open }; st.pendingOpen = open; return; }
    if (was.page === page && was.row === row && on()) {          // only the card changed
      st.opts.open = open;
      if (!open && card()) { try { R4C.close({ fromHistory: true }); } catch (e) {} }
      else if (open && window.R4C) { try { if (!card()) R4C.open(open, { rowKey: row, fromHistory: true }); } catch (e) {} }
      return;
    }
    try { if (card()) R4C.close({ fromHistory: true }); } catch (e) {}
    go(page, { row, open, fromHistory: true });
  }
  addEventListener("popstate", (e) => {
    try { if (!S.data) return; } catch (x) { return; }
    if (!on()) return;
    try { if (S.story >= 0) return; } catch (x) {}          // Release 3 closes its own deck on Back
    fromAddress("pop");
  });

  // ---------- a waiting document opened from Release 3's Reports page ----------
  // It opens in Release 4's large card (window.R4C), the same as from Home or Content, instead of Release 3's one-by-one
  // deck (which would show every waiting piece, "2 of 18", in the old look). An answered document has no card here: it
  // keeps Release 3's own reader.
  function openDocR4(d) {
    if (!d || !sw() || !window.R4C || typeof R4C.open !== "function") return false;
    const id = "pc-document-" + d.id;
    let p = null; try { p = R4D.piece(id); } catch (e) {}
    if (!p) return false;
    try { R4C.open(id, { rowKey: R4D.rowOf(id) }); return true; } catch (e) { console.warn("R4-shell document", e); return false; }
  }
  try {
    if (typeof r3OpenDoc === "function") { const o = r3OpenDoc; r3OpenDoc = function (d) { if (openDocR4(d)) return; return o.apply(this, arguments); }; }
    if (typeof r3DocCard === "function") { const o2 = r3DocCard; r3DocCard = function (d) { if (openDocR4(d)) return true; return o2.apply(this, arguments); }; }
  } catch (e) { console.warn("R4-shell document wrap", e); }

  // ---------- no Release 3 card on a laptop client view (review finding 1, 26 Nov 2026) ----------
  // Release 3's card has Draw, Pin and Edit caption, which Release 4 does not offer. While body.r4 is on, every route
  // into it opens Release 4's card (window.R4C, which picks the centred card or the side panel) instead:
  //   libAnswer   a waiting Library tile (Release 3 opened its card in a window, an iframe of the page with in=lib)
  //   libView     an answered Library tile (Release 3's viewer): Release 4's side panel, as R4C decides
  //   openStory   the gate of Release 3's one-by-one deck: openFromHome, openHomeDeck, libOne, r3OpenTask, r3DocCard's
  //               fallback, showAnswered, the old Review grid and a ?p=<piece> link all go through it
  //   drawLib     the Library's "Review one by one" button goes to Content, at the first row with work, with its first
  //               piece open in Release 4's card
  // If R4C is missing (it loads after this file and should always be there), Release 3 keeps its own way.
  const r4ok = () => sw() && !!window.R4C && typeof R4C.open === "function";
  function openPieceR4(id, rowKey) {
    if (!id) return;
    Promise.resolve().then(() => (window.R4D && R4D.ready ? R4D.ready() : null)).catch(() => null)
      .then(() => { try { R4C.open(id, { rowKey: rowKey || (R4D.rowOf && R4D.rowOf(id)) || undefined }); } catch (e) { console.warn("R4-shell open", e); } });
  }
  try {
    if (typeof libAnswer === "function") { const oa = libAnswer; libAnswer = function (p) { if (r4ok() && p && p.id) return openPieceR4(p.id); return oa.apply(this, arguments); }; }
    if (typeof libView === "function") { const ov = libView; libView = function (p) { if (r4ok() && p && p.id) { try { libViewClose(); } catch (e) {} return openPieceR4(p.id); } return ov.apply(this, arguments); }; }
    if (typeof openStory === "function") {
      const os = openStory;
      openStory = function (i) {
        if (!r4ok()) return os.apply(this, arguments);
        let it = null; try { const v = visibleItems(); it = v[Math.max(0, Math.min(i, v.length - 1))] || null; } catch (e) {}
        // undo what the caller set up for the deck, so Release 3's own state stays as before
        try { if (HOME) { S.homeIds = null; S.set = null; S.roundId = (rounds()[0] || {}).id || null; } S.story = -1; } catch (e) {}
        if (it) openPieceR4(it.id);
        else { try { showToast("This piece can't open right now. Please try again."); hideToastLater(3500); } catch (e) {} }
      };
    }
    if (typeof drawLib === "function") {
      const odl = drawLib;
      drawLib = function () {
        const out = odl.apply(this, arguments);
        try {
          const b = r4ok() && document.querySelector("#lib .r3onebtn");
          if (b) b.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            const r = R4D.rows().find((x) => x.fromTask && x.pieces.some((y) => y.waiting && !y.panel)) || R4D.rows().find((x) => x.fromTask && x.pieces.some((y) => y.waiting));
            const first = r && (r.pieces.find((y) => y.waiting && !y.panel) || r.pieces.find((y) => y.waiting));
            try { $("#lcard")?.remove(); libViewClose(); } catch (x) {}
            go("content", r ? { row: r.key } : {});
            if (first) openPieceR4(first.id, r.key);
          };
        } catch (e) { console.warn("R4-shell library", e); }
        return out;
      };
    }
  } catch (e) { console.warn("R4-shell card routes", e); }

  // [main session, 26 Nov 2026] "Message M7Alpha" stays hidden, on laptops and phones, until the message relay is live
  // (SQL_CHECK.md): without the client-messages database change every send fails; with it, messages would be saved but
  // nobody reads them yet. Set MSG_LIVE to true on the day the relay goes live (and run R3_2_client_messages_checked.sql).
  const MSG_LIVE = false;
  try { if (typeof r3MsgOn === "function") { const msgOn = r3MsgOn; r3MsgOn = function () { return MSG_LIVE && msgOn.apply(this, arguments); }; } } catch (e) {}

  // ---------- the menu ----------
  const DOT = () => el("i", { class: "r4-dot", "aria-hidden": "true" });
  // [main session, 26 Nov 2026] Lee: "on the left side of the items on the menu there should be icons, not circles", as in
  // Nexus's menu: thin outline icons in the words' own colour. Drawn here (simple line shapes), no icon font or download.
  const SVG = (inner) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  const ICONS = {
    home: SVG('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
    content: SVG('<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.6-4.9"/>'),
    calendar: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01M16 17.5h.01"/>'),
    library: SVG('<rect x="7" y="3" width="14" height="14" rx="2"/><circle cx="11.5" cy="7.5" r="1.6"/><path d="m21 13-3.2-3.2a1.5 1.5 0 0 0-2.1 0L10 15.5"/><path d="M4 7v11a3 3 0 0 0 3 3h11"/>'),
    reports: SVG('<path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/><path d="M14 3v4.5h5"/><path d="M9 12.5h6M9 16h6M9 9h2"/>'),
    tasks: SVG('<path d="m3.5 6.5 1.8 1.8 3.2-3.3M3.5 16.5l1.8 1.8 3.2-3.3"/><path d="M12.5 7h8M12.5 12h8M12.5 17h8"/>'),
    leads: SVG('<path d="M21 12.5h-5l-1.8 2.8h-4.4L8 12.5H3"/><path d="M6 5.5h12l3 7V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5.5Z"/>'),
    brand: SVG('<path d="M12 3a9 9 0 0 0 0 18c1 0 1.6-.7 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6h2A4.6 4.6 0 0 0 21 11c0-4.4-4-8-9-8Z"/><path d="M7.5 12h.01M9.5 7.8h.01M14.2 7.2h.01M17 10.8h.01" stroke-width="2.6"/>'),
    docs: SVG('<path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/><path d="M14 3v4.5h5"/>'),
  };
  const ICON = (key) => (ICONS[key] ? el("i", { class: "r4-ico", "aria-hidden": "true", html: ICONS[key] }) : DOT());
  const ENV ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></svg>';
  function item(label, pressed, onclick, n, extra, key) {
    return el("button", Object.assign({ type: "button", class: "r4-item", "aria-pressed": String(!!pressed), "aria-current": pressed ? "page" : null, onclick }, extra || {}),
      ICON(key || String(label).toLowerCase()), el("span",{ class: "r4-l", text: label }), n ? el("em", { class: "r4-n", text: String(n), "aria-label": n + " waiting" }) : null);
  }
  // Content's number counts content only: documents and reports live on Home and Reports (Lee, 26 Nov 2026)
  function waitingN() { try { return waitingAll().filter((x) => !x.it.panel && statusOf(x.it).kind === "wait").length; } catch (e) { return 0; } }
  function tasksN() {          // the client's own open tasks (the Tasks page's own read, once per visit)
    if (st.tasksN != null || st.tasksLoading) return st.tasksN || 0;
    try { if (typeof r3TasksOn === "function" && !r3TasksOn()) return 0; } catch (e) { return 0; }
    st.tasksLoading = true;
    try {
      PCTX.rpc("studio_tasks", { p_token: (typeof UTOKEN !== "undefined" && UTOKEN) || null, p_client_code: S.code }).then((r) => {
        st.tasksN = ((r && r.tasks) || []).filter((t) => !t.done && t.for_client).length; st.tasksLoading = false;
        if (st.tasksN && on()) { try { renderSideNav(); } catch (e) {} }
      }).catch(() => { st.tasksN = 0; st.tasksLoading = false; });
    } catch (e) { st.tasksN = 0; st.tasksLoading = false; }
    return 0;
  }
  function unreadN() {
    try { const n = Number((window.R4MSG && window.R4MSG.unread) || (S.data && S.data.client && S.data.client.unread_replies) || 0); return isFinite(n) && n > 0 ? n : 0; } catch (e) { return 0; }
  }
  function whoName() {
    try {
      if (TEAM.on && TEAM.me) return TEAM.me;
      if (typeof PERSON !== "undefined" && PERSON && PERSON.name) return String(PERSON.name).trim().split(/\s+/)[0];
      if (S.me) return S.me;
    } catch (e) {}
    return "";
  }
  function clientBox() {
    const name = String((S.data && S.data.client && S.data.client.name) || "");
    let swBtn = null;
    try { const kids = cnameKids(name, true); swBtn = kids[0] && kids[0].querySelector && kids[0].querySelector(".cn-sw"); } catch (e) {}
    const who = whoName();
    const box = el("div", { class: "r4-client" },
      el("div", { class: "r4-cl1" }, el("b", { class: "r4-cname", text: name }), swBtn || null),
      who ? el("span", { class: "r4-who" }, "Signed in as " + who,
        // a name typed on a shared link can be changed; a personal link's name and our own sign-in cannot
        ...((!TEAM.on && !(typeof PERSON !== "undefined" && PERSON) && S.me) ? [" · ", el("button", { type: "button", class: "r4-notyou", text: "Not you?", onclick: () => { try { askName(true); } catch (e) {} } })] : [])) : null);
    try { if (teamCard()) viewToggle(name).forEach((x) => box.append(x)); } catch (e) {}
    return box;
  }
  function drawMenu() {
    const nav = document.getElementById("sidenav"); if (!nav || !S.data) return;
    nav.classList.add("r4-menu");
    const kids = [];
    kids.push(el("div", { class: "r4-logo" }, el("img", { src: "assets/studio-icon-dark-180.png", alt: "", width: "34", height: "34" }),
      el("div", {}, el("b", { text: "Client Studio" }), el("span", { text: "by M7Alpha" }))));
    kids.push(clientBox());
    const list = el("div", { class: "r4-nav", role: "list" });
    const pick = (p) => st.page === p && S.story < 0;
    list.append(item("Home", pick("home"), () => go("home")),
      item("Content", pick("content"), () => go("content"), waitingN()),
      item("Calendar", pick("calendar"), () => go("calendar")));
    // the Release 3 pages this client has, exactly as the page's own buttons offer them
    let t = null; try { t = modeToggle(); } catch (e) {}
    if (t) [...t.querySelectorAll("button")].forEach((b) => {
      const n = b.querySelector("b, .tbn")?.textContent || "", label = b.textContent.replace(n, "").trim();
      if (/^(dashboard|review)$/i.test(label)) return;
      if (window.R4MERGE && /^(library|all work)$/i.test(label)) return;      // Library merged into Content (r4_merge.js sets R4MERGE)
      const key = LABEL[label] || b.dataset.panel || label.toLowerCase();
      const isOn = !st.page && b.getAttribute("aria-pressed") === "true";
      const cnt = key === "tasks" ? tasksN() : n;
      list.append(item(label, isOn, () => { st.page = null; st.opts = {}; try { if (S.r3page === "r4") S.r3page = null; } catch (e) {} setUrl({ page: key, row: null, open: null }); b.click(); try { window.scrollTo(0, 0); } catch (e) {} }, cnt, null, key));
    });
    kids.push(list, el("div", { class: "r4-sp" }));
    const foot = el("div", { class: "r4-foot" });
    // How it works: Release 3's tour only knows its Review deck and its Library, so it shows on the Library only (on Home,
    // Content and Calendar it found nothing and said "Nothing is waiting for you right now", which is wrong there)
    // [26 Nov 2026] Lee: "update the 'how to' cards, constrain them to a max of 5 cards for every page": r4_tour.js (window.R4TOUR)
    // has a set for each page; Release 3's own tour stays only where Release 4 has none
    try {
      const pk = st.page || curR3() || null;
      const btn = (fn) => el("button", { type: "button", class: "r4-foot-b", onclick: () => { try { fn(); } catch (e) {} } }, el("span", { class: "r4-fi", html: SN_ICON.help }), el("span", { text: "How it works" }));
      if (window.R4TOUR && R4TOUR.has && R4TOUR.has(pk)) foot.append(btn(() => R4TOUR.open(pk, { manual: true })));
      else if (tourHere && S.lib && !st.page) foot.append(btn(() => tourOpen()));
    } catch (e) {}
    const night = document.body.classList.contains("night");
    foot.append(el("button", { type: "button", class: "r4-foot-b", onclick: () => {
      const v = document.body.classList.toggle("night"); try { store.set("m7r-night", v ? 1 : null); } catch (e) {}
      document.querySelectorAll(".nightbtn").forEach((x) => x._paint?.());
      document.querySelectorAll("iframe").forEach((f) => { try { f.contentDocument.body.classList.toggle("night", v); } catch (e) {} });
      renderSideNav();
    } }, el("span", { class: "r4-fi", html: night ? SN_ICON.sun : SN_ICON.moon }), el("span", { text: night ? "Day version" : "Night version" })));
    kids.push(foot);
    let msgOk = false; try { msgOk = r3MsgOn(); } catch (e) {}
    if (msgOk) {
      const box = document.getElementById("r3msgbox"), open = !!(box && !box.hidden), n = unreadN();
      const b = el("button", { type: "button", class: "r4-msg", "aria-haspopup": "dialog", "aria-expanded": String(open) },
        el("span", { class: "r4-mi", html: ENV }), el("span", { class: "r4-ml", text: "Message M7Alpha" }), n ? el("em", { class: "r4-mn", text: String(n), "aria-label": n + " new " + (n === 1 ? "reply" : "replies") }) : null);
      b.onclick = () => {
        const bx = r3MsgBox(); watchBox(bx); bx.hidden = !bx.hidden; b.setAttribute("aria-expanded", String(!bx.hidden));
        if (!bx.hidden) { try { bx.querySelector("textarea").focus(); } catch (e) {} }
      };
      kids.push(b);
    }
    nav.replaceChildren(...kids);
  }
  function watchBox(bx) {          // the box's own Close button and Escape: keep the menu bar's state right
    if (!bx || bx._r4w) return; bx._r4w = true;
    new MutationObserver(() => { document.querySelectorAll("#sidenav .r4-msg").forEach((b) => b.setAttribute("aria-expanded", String(!bx.hidden))); })
      .observe(bx, { attributes: true, attributeFilter: ["hidden"] });
  }
  const r4SN = renderSideNav;
  renderSideNav = function () {
    const out = r4SN.apply(this, arguments);
    try {
      if (sw()) drawMenu();
      else document.getElementById("sidenav")?.classList.remove("r4-menu");
    } catch (e) { console.warn("R4-shell menu", e); }
    return out;
  };

  // the client's other brands arrive after the first draw (loadBrands): draw the menu again so its switch shows
  try {
    if (typeof loadBrands === "function") { const ob = loadBrands; loadBrands = async function () { const r = await ob.apply(this, arguments); try { if (sw()) renderSideNav(); } catch (e) {} return r; }; }
  } catch (e) {}

  // ---------- the switch on resize ----------
  let was = null, raf = 0;
  function recheck() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const v = sw();
      if (was !== null && v !== was) { try { if (S.data && S.story < 0) renderApp(); else renderSideNav(); } catch (e) {} }
      was = v;
    });
  }
  addEventListener("resize", recheck);
  try { matchMedia("(min-width: 901px)").addEventListener("change", recheck); } catch (e) {}

  // ---------- start ----------
  fromAddress("start");
  window.R4 = {
    __shell: true,
    get page() { return st.page; },
    set page(v) { st.page = PAGES.includes(v) ? v : null; },
    go, refresh, setUrl,
    get opts() { return Object.assign({}, st.opts); },
  };
  function boot() {
    if (st.booted) return; st.booted = true;
    try { if (S.data) { was = on(); renderApp(); } else was = on(); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else setTimeout(boot, 0);
})();
