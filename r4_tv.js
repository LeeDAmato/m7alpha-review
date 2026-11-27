/* [PART R4-tv, 26 Nov 2026] Release 4 for OUR OWN view too (the M7Alpha view, team signed in, laptop 901 px and wider).
   Lee, 26 Nov 2026: "I wanted the changes that we made to apply both to the m7alpha view and the client view (changes to
   dashboard, changing review to 'content' page, removing 'all work' etc etc)".
   Loads after the other Release 4 files and BEFORE r4_team.js (which must stay last). Phones, the client's own view and
   our Client view are untouched: everything here runs only while teamOn() is true.
   - The switch: R4D.on() also says yes for our M7Alpha view (wrapped here, r4_data.js is not edited).
   - The menu (r4_shell.js draws it; this adds to it): Sessions | Client Studio, the client box with its switch and the
     M7Alpha view | Client view toggle (the shell's), Home, Content, Calendar, then Reports, Tasks, Leads, Brand, Documents
     where this client has them, then a small "Team" group: Copy client link, Ask a question.
     "Internal review" and "All work" are gone as menu items: Content replaces both.
   - Home: "Next for you" leads with what waits for Lee (Internal review), then what the client answered.
   - Content: every piece at every stage, a stage line (Internal review first and chosen), our checks hidden unless asked,
     the team's grown tile on hover (r4_team.js: it finds the tiles by #work .wt[data-id]).
   - The opened piece: Release 4's card (the r4c- look) with the team's tools. Every save is the page's own Release 3
     function: workRun ("move" | "skip" | "ok" | "pull" | "comment"); Pin, Edit caption and Edited in Figma save here, in
     the card, with Release 3's own submit_feedback note (see teamNote). No tool opens Release 3's card any more (Lee,
     26 Nov 2026); Draw, Fix caption and Team only are gone from our view.
   - Review links (?c=<code>&wall=<ids>, which the board's ?review=<code>&ids=… becomes): Content with exactly those
     pieces, the first one open in the card.
   window.R4TV = { on(), go(key), content(opts), open(id, opts), close(), state() } (for checks). */
(function () {
  "use strict";
  if (window.R4TV || !window.R4D || !window.R4) return;
  const WIDE = matchMedia("(min-width: 901px)");
  const teamOn = () => { try { return WIDE.matches && !!S.data && typeof teamCard === "function" && teamCard() && !TEAM.client; } catch (e) { return false; } };
  const E = (...a) => h(...a);
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toDate = (s) => new Date(String(s).slice(0, 10) + "T12:00:00");
  const dayLabel = (s) => { if (!s) return ""; const d = toDate(s); return isNaN(d) ? String(s) : `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
  const shortDay = (s) => { if (!s) return ""; const d = toDate(s); return isNaN(d) ? String(s) : `${d.getDate()} ${MON[d.getMonth()]}`; };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // no word alone on the last line: the last two words are joined with a no-break space (a day and its month too)
  const NB = " ";
  const nw = (s) => { s = String(s || "").trim().replace(/(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/g, "$1" + NB + "$2"); const i = s.lastIndexOf(" "); return i > 0 && s.split(" ").length > 2 ? s.slice(0, i) + NB + s.slice(i + 1) : s; };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const cname = () => { try { return S.data.client.name || "the client"; } catch (e) { return "the client"; } };
  const short = (t) => { try { return (window.R4P && R4P.shortTitle(t)) || String(t || ""); } catch (e) { return String(t || ""); } };

  // ---------- the stages (Lee's six, in his order) ----------
  const ORDER = ["internal", "client", "wip", "approved", "scheduled", "published"];
  const LABEL = { internal: "Internal review", client: "Client review", wip: "Work in progress", approved: "Approved", scheduled: "Scheduled", published: "Published", dropped: "Dropped" };
  const CHIP = { internal: "wait", client: "rev", wip: "plan", approved: "pub", scheduled: "sch", published: "pub", dropped: "plan" };
  const six = (i) => { try { return sixOf(i); } catch (e) { return "internal"; } };
  const loaded = () => { try { return W.code === S.code && Array.isArray(W.items); } catch (e) { return false; } };
  // [26 Nov 2026] Lee: "why arent all the cards not just in the content page". Every card is on Content, at its stage; our
  // own checks are just a type ("Our checks", last in the type row). And only real checks count as checks: the page's own
  // isCheck counted every team card with no kind (old cards carry none), which hid real artwork (329 pieces across all
  // clients, e.g. "20 Comino in January: variants"). Here a card is a check when its kind is "proof", or it has no kind
  // and its title says it is one.
  const CHECK_WORDS = /\b(check|checks|test|tests|proof|screens?|screenshots?|QA|verification|before and after|measure|contrast|layout)\b/i;
  const chk = (i) => !!i && (i.kind === "proof" || (!i.kind && CHECK_WORDS.test(String(i.title || ""))));
  const pool = () => { try { return W.items.slice(); } catch (e) { return []; } };
  const byId = (id) => { try { return W.items.find((x) => x.id === id) || (W.dropped || []).find((x) => x.id === id) || null; } catch (e) { return null; } };
  const typeOfW = (i) => { if (chk(i)) return "Our checks"; try { return tileKind(i.kind, i.group_name, i.media || [], i.title) || workType(i) || "Post"; } catch (e) { return "Post"; } };
  const isArt = (i) => typeOfW(i) === "Article";
  const dateOf = (i) => (i.scheduled_for || i.post_date || "").slice(0, 10) || null;
  const PROMO = { organic: "Timeline post", promotional: "Advert", advert: "Advert", ad: "Advert", both: "Timeline post and advert" };

  const TV = { page: null, cs: { stage: "internal", type: null, link: null, ids: null, idsLabel: "" }, card: null, loading: null, started: false, linkDone: false,
    pend: (() => { const p = new URLSearchParams(location.search).get("page"); return p && /^(library|reports|tasks|leads|brand|docs|documents)$/i.test(p) ? p : null; })() };
  function load(force) {
    if (!force && loaded()) return Promise.resolve();
    if (TV.loading) return TV.loading;
    // a read that failed (for example while the team's list of clients is still arriving) is tried again after 1.5 s, never
    // straight away: the pages that wait on it ask again when it ends, and an instant retry would lock the page in a loop
    const wait = TV.failAt ? Math.max(0, 1500 - (Date.now() - TV.failAt)) : 0;
    TV.loading = new Promise((ok) => setTimeout(ok, wait)).then(() => workLoad()).then(() => { TV.failAt = 0; }, (e) => { TV.err = e && e.message; TV.failAt = Date.now(); })
      .finally(() => { TV.loading = null; });
    return TV.loading;
  }

  // ---------- the switch: our M7Alpha view gets Release 4 on a laptop ----------
  const baseOn = R4D.on;
  R4D.on = function () { return baseOn.apply(this, arguments) || teamOn(); };
  // the Calendar (r4_pages.js) reads R4D.pieces(): for us, every dated piece at every stage
  const basePieces = R4D.pieces;
  const SMAP = { internal: "wait", client: "change", wip: "done", approved: "approve", scheduled: "scheduled", published: "published", dropped: "done" };
  function tpiece(i) {
    const s = six(i), t = typeOfW(i);
    let thumb = null; try { thumb = i.thumb ? mediaUrl(i.thumb) : null; } catch (e) {}
    return { id: i.id, it: null, lib: null, panel: null, title: i.title, kind: i.kind || "", kindLabel: t, date: dateOf(i), time: null, platforms: [], campaign: i.campaign || "",
      promo: i.promo || "", promoLabel: PROMO[i.promo] || "", status: SMAP[s], statusLabel: LABEL[s], media: i.media || [], thumb, slides: (i.media || []).length, choice: null,
      waiting: s === "internal", six: s };
  }
  R4D.pieces = function () { if (!teamOn()) return basePieces.apply(this, arguments); return loaded() ? pool().map(tpiece) : []; };
  const baseRowOf = R4D.rowOf;
  R4D.rowOf = function (id) { if (teamOn() && byId(id)) return null; return baseRowOf.apply(this, arguments); };

  // ---------- going between pages ----------
  const R3TAB = { reports: "reports", tasks: "jobs", leads: "leads", brand: "brand", docs: "docs", documents: "docs", dashboard: "dashboard" };
  const TABKEY = { reports: "reports", jobs: "tasks", leads: "leads", brand: "brand", docs: "docs" };
  const isR3Tab = (t) => ["jobs", "docs", "reports", "leads", "brand", "dashboard"].includes(t);
  function tabTo(tab) {          // one of our Release 3 pages, in the new frame (the page's own setTab: it draws and remembers it)
    try { R4C.isOpen() && R4C.close({ quiet: true }); } catch (e) {}
    R4.page = null;
    try { setTab(tab); } catch (e) { console.warn("R4-tv tab", e); }
  }
  // r3Go is how the shell opens a Release 3 page (the menu, the address, Back): for us, our own page of that name
  const baseR3Go = r3Go;
  r3Go = function (page) {
    if (!teamOn()) return baseR3Go.apply(this, arguments);
    if (page === "lib" || page === "review") return R4.go("content");
    if (page === "dash") return R4.go("home");
    const tab = R3TAB[page]; if (tab) return tabTo(tab);
    return baseR3Go.apply(this, arguments);
  };
  const baseGo = R4.go;
  R4.go = function (page, opts) {
    if (teamOn() && (page === "home" || page === "content" || page === "calendar")) {
      try { S.tab = page === "content" ? "work" : "review"; sess.set("m7r-tab", S.tab); S.panel = null; } catch (e) {}
    }
    return baseGo.apply(this, arguments);
  };
  function go(key) {          // the menu and checks: "home" | "content" | "calendar" | "reports" | "tasks" | "leads" | "brand" | "docs"
    if (["home", "content", "calendar"].includes(key)) return R4.go(key);
    R4.go(key === "documents" ? "docs" : key);
  }

  // the page's renderApp: our Release 3 pages (Tasks, Reports, Leads, Brand, Documents) draw in the new frame; the rest
  // is the shell's (Home, Content, Calendar go to R4P.render, wrapped below)
  const baseRA = renderApp;
  renderApp = function () {
    if (!teamOn()) {
      try { if (S.data) TV.shellRan = true; } catch (e) {}
      if (TV.started) { TV.started = false; closeCard(); document.body.classList.remove("r4tv"); }
      return baseRA.apply(this, arguments);
    }
    if (!TV.started) start();
    document.body.classList.add("r4tv");
    if (TV.pend) {          // a shared address with &page=tasks…
      const pg = TV.pend.toLowerCase(); TV.pend = null;
      if (!TV.shellRan) return baseRA.apply(this, arguments);      // the shell has not used it yet: it hands it to r3Go (above)
      if (pg === "library") { R4.page = "content"; S.tab = "work"; } else if (R3TAB[pg]) { R4.page = null; S.tab = R3TAB[pg]; }
    }
    if (!R4.page && isR3Tab(S.tab) && S.tab !== "dashboard") {
      document.body.classList.add("r4"); document.body.classList.remove("r4pg");
      try { renderWho(); renderModeToggle(); } catch (e) {}
      try { if (S.tab === "jobs") { S.panel = null; const out = renderJobs(); jobsWords(); return out; } S.panel = S.tab; return renderPanelPage(); }
      catch (e) { console.warn("R4-tv R3 page", e); }
      return;
    }
    try { S.lib = false; if (S.panel) S.panel = null; if (S.r3page === "reports") S.r3page = "r4"; } catch (e) {}
    if (!R4.page) R4.page = S.tab === "work" ? "content" : "home";
    return baseRA.apply(this, arguments);
  };
  // the menu calls our Jobs page "Tasks" (the client's word for the same list): its heading and first button say so too
  let jobsMo = null;
  function jobsWords() {
    const app = document.getElementById("app"); if (!app) return;
    const fix = () => {
      if (!teamOn() || S.tab !== "jobs" || R4.page) { if (jobsMo) { jobsMo.disconnect(); jobsMo = null; } return; }
      app.querySelectorAll("h1").forEach((x) => { if (x.textContent.trim() === "Jobs") x.textContent = "Tasks"; });
      app.querySelectorAll("button").forEach((x) => { if (x.childElementCount === 0 && x.textContent.trim() === "All jobs") x.textContent = "All tasks"; });
    };
    fix();
    if (!jobsMo) { jobsMo = new MutationObserver(fix); jobsMo.observe(app, { childList: true, subtree: true }); }
  }
  function start() {
    TV.started = true;
    load().then(() => {
      try { renderSideNav(); } catch (e) {}
      // a review link (?wall=<ids> or ?wallp=<id>): Content with exactly those pieces, the first one open
      try {
        if (W.wall && !TV.linkDone) {
          TV.linkDone = true;
          let ids = W.items.filter((i) => W.wall.ids.some((k) => i.id.startsWith(k))).map((i) => i.id);
          if (W.wall.p) { const one = W.items.find((i) => i.id.startsWith(W.wall.p)); if (one) ids = W.items.filter((i) => i.round_id === one.round_id).map((i) => i.id); }
          if (ids.length) {
            Object.assign(TV.cs, { link: ids, stage: "link", type: null, ids: null });
            R4.go("content", { replace: true });
            const first = W.wall.p ? (W.items.find((i) => i.id.startsWith(W.wall.p)) || {}).id : ids[0];
            setTimeout(() => open(first || ids[0], { run: ids, row: "From your link" }), 80);
            return;
          }
        }
      } catch (e) { console.warn("R4-tv link", e); }
      redraw();
    });
  }
  function redraw() {
    if (!teamOn()) return;
    const app = document.getElementById("app"); if (!app) return;
    if (R4.page === "home" || R4.page === "content" || R4.page === "calendar") { try { R4P.render(R4.page, app, { keepScroll: true, refresh: true }); } catch (e) { console.warn("R4-tv redraw", e); } }
    if (TV.card) drawCard();
  }

  // ---------- our pages: Home and Content (the Calendar is r4_pages.js's, reading R4D.pieces above) ----------
  const baseRender = R4P.render;
  R4P.render = function (page, el, opts) {
    if (!teamOn()) return baseRender.apply(this, arguments);
    el = el || document.getElementById("app"); if (!el) return;
    TV.page = page;
    // the remembered tab follows the page shown, however it was reached (address, menu, Back, a review link, a reload):
    // the team's grown tile (r4_team.js) and the page's own redraws read it
    try { if (page === "content" && S.tab !== "work") { S.tab = "work"; sess.set("m7r-tab", "work"); } else if ((page === "home" || page === "calendar") && S.tab === "work") { S.tab = "review"; sess.set("m7r-tab", "review"); } } catch (e) {}
    if (page !== "content" && SEL.on) selEnd();
    if (page === "calendar") {
      if (!loaded()) { el.replaceChildren(loadingBox("Loading the Calendar…")); load().then(() => { if (TV.page === "calendar") redraw(); }); return; }
      const out = baseRender.apply(this, arguments);
      try { calendarWords(el); } catch (e) {}
      return out;
    }
    if (page !== "home" && page !== "content") return baseRender.apply(this, arguments);
    if (!loaded()) { el.replaceChildren(loadingBox(page === "home" ? "Loading…" : "Loading the work…")); load().then(() => { if (TV.page === page) redraw(); }); return; }
    const keep = el.querySelector(":scope > .r4tv-" + page) ? [window.scrollY, el.scrollTop] : null;
    const root = page === "home" ? homePage() : contentPage(opts || {});
    el.replaceChildren(root); el.__r4p = page;
    const bar = root.querySelector(".r4tv-bar"); if (bar) placeBar(bar);
    if (keep) { window.scrollTo(0, keep[0]); el.scrollTop = keep[1]; }
    else { try { window.scrollTo(0, 0); } catch (e) {} }
  };
  const loadingBox = (t) => E("div", { class: "r4-loading", role: "status" }, E("span", { class: "r4-spin", "aria-hidden": "true" }), E("span", { text: t }));
  function calendarWords(el) {
    const sub = el.querySelector(".r4p-calendar .r4p-sub"); if (sub) sub.textContent = nw("Every piece with a date, at every stage. Only the M7Alpha team sees this view.");
    const lg = el.querySelector(".r4p-legend"); if (!lg) return;
    const dot = (c, t) => E("span", {}, E("i", { class: "r4p-dot r4p-dot-" + c }), t);
    lg.replaceChildren(dot("wait", "Internal review"), dot("chg", "Client review"), dot("plan", "Work in progress"), dot("pub", "Approved or published"), dot("sch", "Scheduled"));
    el.querySelectorAll(".r4p-ev .r4p-chip").forEach((c) => { if (/^waiting$/i.test(c.textContent)) c.textContent = "Internal review"; });
  }

  // which pieces are where
  function counts() { const c = {}; ORDER.forEach((k) => (c[k] = 0)); pool().forEach((i) => { const s = six(i); if (s in c) c[s]++; }); return c; }
  const byDate = (a, b) => String(dateOf(a) || "9999").localeCompare(String(dateOf(b) || "9999")) || String(a.created_at).localeCompare(String(b.created_at));
  function clientAsked() {          // pieces the client asked to change (their own library says so), still with us
    let ids = new Set();
    try { const r = R4D.rows().find((x) => x.key === "r4:changing"); if (r) r.pieces.forEach((p) => ids.add(p.id)); } catch (e) {}
    return pool().filter((i) => ids.has(i.id));
  }
  const clientOk = () => pool().filter((i) => six(i) === "approved" && !i.noclient && i.audience !== "team" && i.stage === "approved");

  function homePage() {
    const c = counts(), internal = pool().filter((i) => six(i) === "internal").sort(byDate), asked = clientAsked(), ok = clientOk();
    const hr = new Date().getHours(), hello = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    const td = new Date();
    const total = pool().length;
    const line = internal.length ? `${plural(internal.length, "piece waits", "pieces wait")} for you in Internal review. ${total} ${total === 1 ? "piece" : "pieces"} for ${cname()} in all.`
      : `Nothing waits for you in Internal review. ${total} ${total === 1 ? "piece" : "pieces"} for ${cname()} in all.`;
    const top = E("div", { class: "r4p-top" },
      E("div", {}, E("h1", { class: "r4p-h1", text: hello + (TEAM.me ? ", " + TEAM.me : "") }), E("p", { class: "r4p-sub", text: nw(line) })),
      E("span", { class: "r4p-datebox", text: `${WD[td.getDay()]} ${td.getDate()} ${MON[td.getMonth()]}` }));
    const parts = (list) => list.slice(0, 3).map((i) => E("div", {}, E("b", { text: dateOf(i) ? dayLabel(dateOf(i)) : typeOfW(i) }), E("span", { text: short(i.title) || typeOfW(i) })));
    const MANY = { "Photo post": "photo posts", "Photo set": "photo sets", Story: "Stories", Reel: "reels", Article: "articles", Banner: "banners", Form: "forms", Design: "designs", Video: "videos" };
    const typesLine = (list) => { const ts = [...new Set(list.map(typeOfW))]; return ts.length === 1 && MANY[ts[0]] ? (list.length === 1 ? "1 " + ts[0].toLowerCase().replace(/^story$/, "Story") : list.length + " " + MANY[ts[0]]) : plural(list.length, "piece", "pieces"); };
    let hero;
    const heroBox = (ask, details, list, act, label) => E("section", { class: "r4p-hero", "aria-label": "Next for you" },
      E("div", { class: "r4p-herot" }, E("div", { class: "r4p-k", text: "Next for you" }), E("h2", { class: "r4p-ask", text: nw(ask) }), E("div", { class: "r4p-herom", text: details.filter(Boolean).join(" · ") })),
      E("div", { class: "r4p-herobot" }, list.length ? E("div", { class: "r4p-hw" }, ...parts(list)) : E("span", { class: "r4p-hw" }),
        E("button", { type: "button", class: "r4p-go", onclick: act }, label || "Open", E("i", { "aria-hidden": "true" }))));
    if (internal.length) {
      const first = internal.find((i) => dateOf(i));
      hero = heroBox(internal.length === 1 ? "One piece waits for you in Internal review" : `${internal.length} pieces wait for you in Internal review`,
        [typesLine(internal), first ? "first goes out " + dayLabel(dateOf(first)) : "", "move each one to client review, or approve it and skip the client"], internal,
        () => { content({ stage: "internal" }); setTimeout(() => open(internal[0].id, { run: internal.map((i) => i.id), row: "Internal review" }), 60); });
    } else if (asked.length) {
      hero = heroBox(`${cname()} asked for changes on ${plural(asked.length, "piece", "pieces")}`, ["their notes are on each piece"], asked,
        () => { content({ ids: asked.map((i) => i.id), idsLabel: `${cname()} asked for changes` }); setTimeout(() => open(asked[0].id, { run: asked.map((i) => i.id), row: "Changes asked" }), 60); });
    } else {
      hero = E("section", { class: "r4p-hero r4p-calm", "aria-label": "Next for you" },
        E("span", { class: "r4p-tick", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24"><path d="M6 12.5 10.5 17 18.5 7.5"/></svg>' }),
        E("div", { class: "r4p-herot" }, E("div", { class: "r4p-k", text: "Next for you" }), E("h2", { class: "r4p-ask", text: "Nothing waits for you right now." }),
          E("div", { class: "r4p-herom", text: nw("New pieces show up here as soon as they are uploaded.") })));
    }
    const ico = (svg) => E("span", { class: "r4p-ico", "aria-hidden": "true", html: svg });
    const I_GRID = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>';
    const I_CHAT = '<svg viewBox="0 0 24 24"><path d="M4.5 5.5h15v10h-9l-6 4z"/></svg>';
    const I_TICK = '<svg viewBox="0 0 24 24"><path d="M6 12.5 10.5 17 18.5 7.5"/></svg>';
    const I_CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>';
    const task = (icon, typ, chipCls, chipTxt, name, sub, btn, act) => E("div", { class: "r4p-card r4p-task", onclick: (e) => { if (!e.target.closest("button")) act(); } },
      ico(icon), E("div", { class: "r4p-taskt" }, E("div", { class: "r4p-chips" }, E("span", { class: "r4p-chip r4p-c-type", text: typ }), E("span", { class: "r4p-chip r4p-c-" + chipCls, text: chipTxt })),
        E("b", { text: nw(name) }), E("small", { text: nw(sub) })),
      E("button", { type: "button", class: "r4p-btn", onclick: act, "aria-label": btn + ": " + name }, btn + " ›"));
    const rest = [];
    if (internal.length && asked.length) rest.push(task(I_CHAT, "Client answered", "chg", plural(asked.length, "change asked", "changes asked"), `${cname()} asked for changes on ${plural(asked.length, "piece", "pieces")}`,
      "Their notes are on each piece · opens Content with just these", "Go to Content", () => content({ ids: asked.map((i) => i.id), idsLabel: `${cname()} asked for changes` })));
    if (ok.length) rest.push(task(I_TICK, "Client answered", "pub", plural(ok.length, "approved", "approved"), `${cname()} approved ${plural(ok.length, "piece", "pieces")}`,
      "Ready to schedule · opens Content at Approved", "Go to Content", () => content({ stage: "approved" })));
    if (c.client) rest.push(task(I_CLOCK, "With the client", "rev", plural(c.client, "waiting", "waiting"), `${plural(c.client, "piece is", "pieces are")} with ${cname()}, waiting for their answer`,
      "Opens Content at Client review", "Go to Content", () => content({ stage: "client" })));
    if (c.wip) rest.push(task(I_GRID, "Our work", "plan", plural(c.wip, "in progress", "in progress"), `We're working on ${plural(c.wip, "piece", "pieces")}`,
      "Opens Content at Work in progress", "Go to Content", () => content({ stage: "wip" })));
    // This month: the client's lead figures (as the client's Home shows them), then our own stage count (team only)
    const figs = [];
    try {
      const L = S.data.client.dash_leads, fs = (L && Array.isArray(L.figures)) ? L.figures : [];
      for (const f of fs) { if (/quality/i.test(String(f.key) + " " + String(f.label))) continue; const r = r3Fig(f); if (!r) continue;
        if (f.key === "new_month") figs.push({ o: 0, label: "Leads", big: r.big, small: "New this month" });
        else if (f.key === "cpl" || /cost per lead/i.test(f.label || "")) figs.push({ o: 1, label: "Cost per lead", big: r.big, small: "Opens Reports" }); }
      figs.sort((a, b) => a.o - b.o);
    } catch (e) {}
    const kpis = figs.length ? E("div", {}, E("div", { class: "r4p-sec" }, E("span", { text: "This month" })),
      E("div", { class: "r4p-kpis" + (figs.length === 1 ? " r4p-one" : "") }, ...figs.slice(0, 2).map((f) => E("button", { type: "button", class: "r4p-card r4p-kpi", onclick: () => go("reports"), "aria-label": `${f.label}: ${f.big}. Opens Reports` },
        E("small", { text: f.label }), E("b", { text: f.big }), E("small", { text: f.small }))))) : null;
    const stages = E("div", {}, E("div", { class: "r4p-sec" }, E("span", { text: "Every stage" }), E("em", { text: "Only the team sees this" })),
      E("div", { class: "r4p-card r4tv-stages" }, ...ORDER.map((k) => E("button", { type: "button", class: "r4tv-strow", onclick: () => content({ stage: k }), "aria-label": `${LABEL[k]}: ${c[k]}. Opens Content` },
        E("span", { class: "r4p-chip r4p-c-" + CHIP[k], text: LABEL[k] }), E("b", { text: String(c[k]) }), E("i", { "aria-hidden": "true", text: "›" })))));
    const t0 = iso(new Date());
    const soon = pool().filter((i) => dateOf(i) && dateOf(i) >= t0 && six(i) !== "published").sort(byDate).slice(0, 4);
    const coming = E("div", {}, E("div", { class: "r4p-sec" }, E("span", { text: "Coming up" })),
      soon.length ? E("div", { class: "r4p-card r4p-soon" }, ...soon.map((i) => { const d = toDate(dateOf(i)), s = six(i);
        return E("button", { type: "button", class: "r4p-mini", onclick: () => open(i.id), "aria-label": `${dayLabel(dateOf(i))}: ${short(i.title)}, ${LABEL[s]}` },
          E("span", { class: "r4p-mind" }, E("b", { text: String(d.getDate()) }), E("span", { text: WD[d.getDay()] })),
          E("span", { class: "r4p-mint" }, E("b", { text: short(i.title) || typeOfW(i) }), E("span", { class: "r4p-mins" }, E("span", { text: typeOfW(i) }), E("span", { class: "r4p-chip r4p-c-" + CHIP[s], text: LABEL[s] })))); }))
        : E("div", { class: "r4p-card r4p-soon r4p-none", text: "Nothing planned yet." }),
      E("div", { class: "r4p-right" }, E("button", { type: "button", class: "r4p-btn r4p-sm", onclick: () => go("calendar") }, "Open the Calendar ›")));
    const root = E("div", { class: "r4p r4p-home r4tv-home", "data-page": "home" });
    root.append(top, E("div", { class: "r4p-grid" },
      E("div", { class: "r4p-main" }, hero, ...(rest.length ? [E("div", { class: "r4p-sec" }, E("span", { text: "Also waiting for you" })), ...rest] : [])),
      E("div", { class: "r4p-side" }, kpis, stages, coming)));
    return root;
  }

  // ---------- Content ----------
  function content(opts) {
    opts = opts || {};
    if (opts.stage) Object.assign(TV.cs, { stage: opts.stage, link: opts.stage === "link" ? TV.cs.link : null, ids: null, idsLabel: "" });
    if (opts.ids) Object.assign(TV.cs, { stage: "ids", ids: opts.ids, idsLabel: opts.idsLabel || "Chosen pieces", link: null });
    if ("type" in opts) TV.cs.type = opts.type;
    if (R4.page === "content" && TV.page === "content") redraw(); else R4.go("content");
  }
  function shownPool() {
    const cs = TV.cs; let list = pool();
    if (cs.stage === "link") list = list.filter((i) => (cs.link || []).includes(i.id));
    else if (cs.stage === "ids") list = list.filter((i) => (cs.ids || []).includes(i.id));
    else if (cs.stage === "dropped") list = (W.dropped || []).slice();
    else if (cs.stage !== "all") list = list.filter((i) => six(i) === cs.stage);
    return list;
  }
  function contentPage() {
    const cs = TV.cs, c = counts();
    if (cs.stage === "link" && !(cs.link || []).length) cs.stage = "internal";
    const base = shownPool();
    const types = [...new Set(base.map(typeOfW))].sort((a, b) => (a === "Our checks") - (b === "Our checks") || a.localeCompare(b));      // "Our checks" last
    if (cs.type && !types.includes(cs.type)) cs.type = null;
    const list = base.filter((i) => !cs.type || typeOfW(i) === cs.type);
    const root = E("div", { class: "r4p r4tv-content work", id: "work", "data-page": "content" });      // not "r4p-content": the client's search and tour (r4_merge.js, r4_tour.js) look for that
    const redo = () => redraw();
    const chip = (key, label, n) => E("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(cs.stage === key),
      onclick: () => { Object.assign(cs, { stage: key, ids: key === "ids" ? cs.ids : null, link: key === "link" ? cs.link : null, type: null }); redo(); } }, n == null ? label : `${label} · ${n}`);
    root.append(E("div", { class: "r4p-top" }, E("div", {}, E("h1", { class: "r4p-h1", text: "Content" }),
      E("p", { class: "r4p-sub", text: nw(`Every piece for ${cname()}, at every stage. Only the M7Alpha team sees this view.`) })),
      E("div", { class: "r4tv-topb" }, ...selTop(list))));
    const dropped = (W.dropped || []).length;
    root.append(E("div", { class: "r4p-filters", role: "group", "aria-label": "Stage" },
      ...(cs.stage === "link" ? [chip("link", "From your link", (cs.link || []).length)] : []),
      ...(cs.stage === "ids" ? [chip("ids", cs.idsLabel || "Chosen pieces", (cs.ids || []).length)] : []),
      chip("all", "All stages", pool().length), ...ORDER.map((k) => chip(k, LABEL[k], c[k])), dropped ? chip("dropped", "Dropped", dropped) : null));      // Lee, 26 Nov: "All stages" first
    if (types.length > 1) root.append(E("div", { class: "r4p-filters r4tv-types", role: "group", "aria-label": "Type" },
      E("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(!cs.type), onclick: () => { cs.type = null; redo(); } }, "All types"),
      ...types.map((t) => E("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(cs.type === t), onclick: () => { cs.type = cs.type === t ? null : t; redo(); } }, t === "Our checks" ? `Our checks · ${base.filter(chk).length}` : t))));
    if (!list.length) {
      root.append(E("div", { class: "r4p-card r4p-empty" }, E("b", { text: cs.stage === "internal" ? "Nothing waits for you in Internal review." : "Nothing here right now." }),
        E("span", { text: nw("Pieces show up here as soon as they are uploaded.") }),
        cs.stage !== "all" ? E("button", { type: "button", class: "r4p-btn r4p-sm", onclick: () => { Object.assign(cs, { stage: "all", type: null }); redo(); } }, "Show every stage") : null));
      return root;
    }
    // rows: one stage chosen = one row per batch (newest first); every stage = one row per stage; a link = one row
    let rows = [];
    if (cs.stage === "all") rows = ORDER.map((k) => ({ key: "st:" + k, title: LABEL[k], list: list.filter((i) => six(i) === k).sort(byDate) })).filter((r) => r.list.length);
    else if (cs.stage === "link" || cs.stage === "ids") rows = [{ key: cs.stage, title: cs.stage === "link" ? "From your link" : cs.idsLabel, list: list.slice().sort(byDate), lit: true }];
    else {
      const m = new Map();
      list.forEach((i) => { const k = i.batch || "Other"; if (!m.has(k)) m.set(k, []); m.get(k).push(i); });
      rows = [...m].map(([k, l]) => ({ key: "b:" + k, title: k, list: l.sort(byDate), newest: l.reduce((a, i) => (String(i.created_at) > a ? String(i.created_at) : a), "") }))
        .sort((a, b) => b.newest.localeCompare(a.newest));
    }
    rows.forEach((r) => {
      const sec = E("section", { class: "r4p-row" + (r.lit ? " r4p-lit" : ""), "data-row": r.key, "aria-label": r.title });
      if (r.lit) sec.append(E("div", { class: "r4p-lith" }, E("span", { class: "r4p-chip r4p-c-lime", text: cs.stage === "link" ? "From your review link" : "From Home" }),
        E("span", { class: "r4p-lits", text: plural(r.list.length, "piece", "pieces") }),
        E("button", { type: "button", class: "r4p-btn r4p-dark r4p-sm", onclick: () => open(r.list[0].id, { run: r.list.map((i) => i.id), row: r.title }) }, r.list.length > 1 ? `Go through all ${r.list.length}, one after another ›` : "Open it ›")));
      if (!r.lit) sec.append(E("div", { class: "r4p-rowh" }, E("b", { text: r.title }), E("small", { text: plural(r.list.length, "piece", "pieces") })));
      sec.append(E("div", { class: "r4p-tw" }, E("div", { class: "r4p-tiles r4p-wrap" }, ...r.list.map((i) => tile(i, r)))));
      root.append(sec);
    });
    if (SEL.on) root.append(selBar());
    return root;
  }
  function tile(i, r) {
    const s = cs6(i), t = typeOfW(i), art = t === "Article", gone = !!i.dropped_at;
    const m = (i.media || [])[0], tall = /story|reel/i.test(i.kind || "") || !!(m && m.width && m.height && m.height / m.width >= 1.6);
    const w = art ? 336 : tall ? 150 : 168, hgt = art ? 210 : tall ? 267 : 210;
    let src = null; try { src = i.thumb ? mediaUrl(i.thumb) : null; } catch (e) {}
    const thumb = E("div", { class: "thumb r4tv-art" + (art ? " wart" : "") });      // its size is the button's (an inline size here would follow it into the grown copy)
    if (src) thumb.append(E("img", { src, alt: "", loading: "lazy", decoding: "async", draggable: "false" }));
    else thumb.append(E("span", { class: "r4tv-artw", text: nw(short(i.title)) }));
    if (art && src) thumb.append(E("span", { class: "r4tv-shade", "aria-hidden": "true" }), E("span", { class: "r4tv-atl", "aria-hidden": "true", text: nw(short(i.title)) }));
    if (m && m.type === "video") thumb.append(E("span", { class: "r4tv-play", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24"><path d="M9 7v10l8-5z"/></svg>' }));
    const n = (i.media || []).length;
    const bits = [dateOf(i) ? dayLabel(dateOf(i)) : null].filter(Boolean);
    const lab = `${t}: ${short(i.title) || t}. ${LABEL[s]}`;
    const ticked = SEL.on && SEL.ids.has(i.id);
    const pic = E("button", { type: "button", class: "r4tv-pic", style: `width:${w}px;height:${hgt}px`, "aria-label": (SEL.on ? (ticked ? "Untick " : "Tick ") : "Open ") + lab,
      ...(SEL.on ? { "aria-pressed": String(ticked) } : {}),
      onclick: () => { if (SEL.on) return selToggle(i.id); open(i.id, { run: r.list.map((x) => x.id), row: r.title }); } },
      thumb,
      n > 1 && !art ? E("span", { class: "r4tv-n", text: "1/" + n }) : null,
      SEL.on ? E("span", { class: "r4tv-tick" + (ticked ? " on" : ""), "aria-hidden": "true", html: ticked ? '<svg viewBox="0 0 16 16"><path d="m3.5 8.4 3 3 6-6.4"/></svg>' : "" }) : null);
    return E("div", { class: (ticked ? "r4tv-on " : "") + (SEL.on ? "r4tv-picking " : "") + "wt st-" + (({ internal: "need", client: "cli", wip: "wip", approved: "ok", scheduled: "sched", published: "pub", dropped: "gone" })[s] || "need") + " r4tv-t" + (art ? " r4tv-wide" : "") + (gone ? " gone" : ""),
      "data-id": i.id, title: [i.title, LABEL[s] + (i.noclient ? " (skipped the client)" : ""), chk(i) ? "our own check" : null].filter(Boolean).join("\n"),
      oncontextmenu: (e) => { e.preventDefault(); if (SEL.on) return; try { workMenu(i, e.currentTarget); } catch (x) {} } },
      // Lee, 26 Nov 2026: the stage label sits to the right of the post type, off the picture; it wraps under the type when
      // the line is too long for the tile
      pic, E("span", { class: "r4p-meta r4tv-meta", style: `max-width:${w}px` }, E("span", { class: "r4tv-mt" }, E("b", { text: t }), bits.length ? " · " + bits.join(" · ") : ""),
        E("span", { class: "r4p-chip r4p-c-" + CHIP[s] + " r4tv-mchip", text: LABEL[s] })));
  }
  const cs6 = (i) => (i.dropped_at ? "dropped" : six(i));

  // ---------- Select several (Lee, 26 Nov 2026: "in the content page, I want the option to select multiple items… so I
  // can then mass approve-send to client, for example"). Team only, signed-in editors only. Each action runs the page's
  // own workRun once per piece, one after another (the same save the single button makes), so N ticked pieces make
  // exactly N single saves. A piece that fails does not stop the others and stays ticked. ----------
  const SEL = { on: false, ids: new Set(), phase: "", kind: null, k: 0, n: 0, result: null };
  // Remove and Bring back (Lee, 26 Nov 2026: "so I would be able to hide/remove cards with ease"): the page's own Drop and
  // Put back (workRun "drop" / "back"). Nothing is deleted: a dropped piece waits under Dropped and can come back.
  const SAY = { move: "Move to client review", skip: "Approve, skip client", ok: "Approve", pull: "Pull back from client review", drop: "Remove", back: "Bring back" };
  const ONLYFOR = { move: "is only for pieces in Internal review that are for the client", skip: "is only for pieces in Internal review that are for the client",
    ok: "is only for team-only pieces", pull: "is only for pieces in Client review", drop: "is for pieces that are not in Dropped already", back: "is only for pieces in Dropped" };
  const DOING = { move: "Sending", skip: "Approving", ok: "Approving", pull: "Pulling back", drop: "Removing", back: "Bringing back" };
  const KINDS = ["move", "skip", "ok", "pull", "drop", "back"];
  const CAN = (k, i) => { try { if (k === "back") return !!i.dropped_at; if (i.dropped_at) return false; return k === "drop" ? true : WACT[k].can(i); } catch (e) { return false; } };
  function selStart() { if (!canAct()) return; Object.assign(SEL, { on: true, phase: "", result: null }); SEL.ids.clear(); try { R4T && R4T.close(); W.picking = true; } catch (e) {} redraw(); }
  function selEnd() { Object.assign(SEL, { on: false, phase: "", result: null, kind: null }); SEL.ids.clear(); try { W.picking = false; } catch (e) {} if (TV.page === "content") redraw(); }
  function selToggle(id) { if (SEL.phase === "run") return; SEL.ids.has(id) ? SEL.ids.delete(id) : SEL.ids.add(id); if (SEL.phase !== "run") { SEL.phase = ""; SEL.result = null; } redraw(); }
  function selTop(list) {
    if (!canAct()) return [];
    if (!SEL.on) return [E("button", { type: "button", class: "r4p-fchip r4tv-selb", onclick: selStart }, "Select")];
    const all = list.map((i) => i.id), allOn = all.length && all.every((id) => SEL.ids.has(id));
    return [E("button", { type: "button", class: "r4p-fchip", disabled: SEL.phase === "run", onclick: () => { if (allOn) all.forEach((id) => SEL.ids.delete(id)); else all.forEach((id) => SEL.ids.add(id)); SEL.phase = ""; SEL.result = null; redraw(); } },
        allOn ? "Untick all in this stage" : TV.cs.stage === "all" ? "Select all shown" : "Select all in this stage"),
      E("button", { type: "button", class: "r4p-fchip r4tv-selx", disabled: SEL.phase === "run", onclick: selEnd }, "Cancel")];
  }
  const picked = () => [...SEL.ids].map(byId).filter(Boolean);
  function selBar() {
    const list = picked(), n = list.length, who = cname();
    const bar = E("div", { class: "r4tv-bar", role: "region", "aria-label": "Act on the ticked pieces", "aria-live": "polite" });
    const count = E("b", { class: "r4tv-barn", text: n ? `${n} selected` : "Tick the pieces to act on" });
    if (SEL.phase === "ask" && SEL.kind === "drop") {
      bar.classList.add("r4tv-barask");
      const atClient = list.filter((i) => i.stage === "needs_client").length;
      bar.append(E("div", { class: "r4tv-bart" }, E("b", { text: `Remove ${plural(n, "piece", "pieces")}?` }),
        E("span", { text: nw(`They move to Dropped, and you can bring them back from there. Nothing is deleted, and the sessions are asked to archive the frames in Figma.`
          + (atClient ? ` ${atClient === 1 ? "One of them is" : atClient + " of them are"} with ${who} right now: removing takes ${atClient === 1 ? "it" : "them"} off their page.` : "")) })),
        E("div", { class: "r4tv-bara" }, E("button", { type: "button", class: "r4p-btn r4tv-danger", "data-act": "bulk-yes", onclick: () => selRun("drop") }, `Yes, remove ${n}`),
          E("button", { type: "button", class: "r4p-btn", "data-act": "bulk-no", onclick: () => { SEL.phase = ""; redraw(); } }, "Cancel")));
      return bar;
    }
    if (SEL.phase === "ask") {
      bar.classList.add("r4tv-barask");
      bar.append(E("div", { class: "r4tv-bart" }, E("b", { text: `Send ${plural(n, "piece", "pieces")} to ${who} for review?` }),
        E("span", { text: nw(`${who} will see ${n === 1 ? "it" : "them"} straight away and be asked to approve ${n === 1 ? "it" : "each one"}. You can pull a piece back while they have not answered.`) })),
        E("div", { class: "r4tv-bara" }, E("button", { type: "button", class: "r4p-btn r4p-dark", "data-act": "bulk-yes", onclick: () => selRun("move") }, `Yes, send ${n}`),
          E("button", { type: "button", class: "r4p-btn", "data-act": "bulk-no", onclick: () => { SEL.phase = ""; redraw(); } }, "Cancel")));
      return bar;
    }
    if (SEL.phase === "run") {
      bar.append(E("span", { class: "r4-spin", "aria-hidden": "true" }), E("b", { class: "r4tv-barn", text: `${DOING[SEL.kind]} ${SEL.k} of ${SEL.n}…` }),
        E("span", { class: "r4tv-barw", text: nw("Please keep this page open until it finishes.") }));
      return bar;
    }
    if (SEL.result) {
      const r = SEL.result, did = { move: `Sent ${r.ok} of ${r.n} to ${who}`, skip: `Approved ${r.ok} of ${r.n}, client skipped`, ok: `Approved ${r.ok} of ${r.n}`, pull: `Pulled back ${r.ok} of ${r.n} from client review`,
        drop: `Removed ${r.ok} of ${r.n}: ${r.ok === 1 ? "it is" : "they are"} under Dropped now`, back: `Brought back ${r.ok} of ${r.n}` }[r.kind];
      bar.classList.add(r.bad.length ? "r4tv-barbad" : "r4tv-bargood");
      bar.append(E("div", { class: "r4tv-bart" }, E("b", { text: did + "." }),
        r.bad.length ? E("span", { text: nw(`${r.bad.length === 1 ? "This one didn't go" : `These ${r.bad.length} didn't go`}, so ${r.bad.length === 1 ? "it is" : "they are"} still ticked: ` + r.bad.map((x) => `“${short(x.title)}” (${x.why})`).join("; ") + ".") })
          : E("span", { text: nw(r.ok === 1 ? "The piece has moved to its new stage." : "The pieces have moved to their new stage.") })),
        E("div", { class: "r4tv-bara" }, E("button", { type: "button", class: "r4p-btn r4p-dark", "data-act": "bulk-done", onclick: () => { SEL.result = null; if (!SEL.ids.size) selEnd(); else redraw(); } }, r.bad.length ? "OK" : "Done")));
      return bar;
    }
    const kinds = KINDS.map((k) => [k, list.filter((i) => CAN(k, i)).length]).filter(([, c]) => c > 0);
    // one line per reason: "Move to client review" and "Approve, skip client" share theirs
    const grp = new Map(); kinds.filter(([, c]) => c < n).forEach(([k, c]) => { const g = ONLYFOR[k] + "|" + c; if (!grp.has(g)) grp.set(g, { ks: [], c, why: ONLYFOR[k] }); grp.get(g).ks.push(k); });
    const why = [...grp.values()].map((g) => `${g.ks.map((k) => "“" + SAY[k] + "”").join(" and ")} ${g.ks.length > 1 ? g.why.replace(/^is /, "are ") : g.why}: ${g.c} of ${n} ticked ${g.c === 1 ? "fits" : "fit"}.`);
    const acts = kinds.map(([k, c], j) => E("button", { type: "button", class: "r4p-btn" + (k === "drop" ? " r4tv-danger" : j === 0 && c === n ? " r4p-dark" : ""), "data-act": "bulk-" + k, disabled: c < n,
      title: c < n ? `${SAY[k]} ${ONLYFOR[k]}` : `${SAY[k]}: ${plural(n, "piece", "pieces")}`, onclick: () => { if (k === "move" || k === "drop") { SEL.phase = "ask"; SEL.kind = k; redraw(); } else selRun(k); } }, SAY[k]));
    if (n && !kinds.length) why.push("None of the actions fits these pieces at their stage.");
    bar.append(count, E("div", { class: "r4tv-bara" }, ...acts));
    if (why.length) bar.append(E("p", { class: "r4tv-barw", text: why.map(nw).join(" ") }));
    return bar;
  }
  async function selRun(kind) {
    if (!canAct() || SEL.phase === "run") return;
    const list = picked().filter((i) => CAN(kind, i));
    if (!list.length) return;
    Object.assign(SEL, { phase: "run", kind, k: 0, n: list.length, result: null });
    document.body.classList.add("r4tv-running");      // the page's own "Saving…" messages stay out of the way: the bar shows the progress
    redraw();
    const res = { kind, n: list.length, ok: 0, bad: [] };
    const toastEl = document.getElementById("toast");
    for (const p of list) {
      SEL.k++; redraw();
      for (let t = 0; t < 100 && W.busy; t++) await new Promise((ok) => setTimeout(ok, 100));      // the page saves one thing at a time
      if (toastEl) toastEl.textContent = "";
      const now = byId(p.id) || p;
      try {
        // Drop asks twice with the browser's own box (and again for a piece at Client review); the bar asked already, once
        // for the whole batch, so those boxes say yes. They are asked before the page's first wait, so the box is put back at once
        const c0 = window.confirm; if (kind === "drop") window.confirm = () => true;
        let run; try { run = workRun(kind, [now], {}); } finally { window.confirm = c0; }
        await run;
      } catch (e) {}
      try { W.picking = true; } catch (e) {}      // the page's own save turns "select several" off after each one
      const told = (toastEl && toastEl.textContent || "").trim();
      if (!told || /^(That stopped|Nothing to do)/.test(told)) {
        res.bad.push({ id: p.id, title: p.title, why: !told ? "nothing happened" : /^Nothing to do/.test(told) ? "it had already moved on" : told.replace(/^That stopped part-way:\s*/, "").replace(/\.\s*\d+ of \d+ saved\.?.*$/, "") || "it didn't save" });
      } else { res.ok++; SEL.ids.delete(p.id); }
    }
    document.body.classList.remove("r4tv-running");
    try { hideToast(); } catch (e) {}      // the bar says what happened; the page's last message (with Undo for one piece only) would mislead
    await load(true).catch(() => {});
    Object.assign(SEL, { phase: "", result: res });
    redraw();
  }
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !SEL.on || TV.card || SEL.phase === "run") return;
    const m = document.getElementById("modal"); if (m && !m.hidden) return;
    if (document.getElementById("wover") || document.getElementById("wmenu")) return;
    e.preventDefault(); if (SEL.phase === "ask") { SEL.phase = ""; redraw(); } else selEnd();
  });
  addEventListener("resize", () => { const b = document.querySelector(".r4tv-bar"); if (b) placeBar(b); });
  function placeBar(b) {
    const app = document.getElementById("app"); if (!app || !b) return;
    const r = app.getBoundingClientRect(); b.style.left = Math.round(r.left + 24) + "px"; b.style.width = Math.round(r.width - 48) + "px";
  }

  // the page's own redraws after a save (workRun -> workLoad -> drawWork) draw our page again
  const baseDraw = drawWork;
  drawWork = function () { if (teamOn() && (R4.page === "home" || R4.page === "content" || R4.page === "calendar")) { redraw(); return; } return baseDraw.apply(this, arguments); };
  // a tile's Open (r4_team.js) and the page's own "Open the card" open Release 4's card for us
  const baseOpenWork = openWork;
  openWork = function (i) { if (teamOn() && R4.page && i && byId(i.id) && !i.dropped_at && !TV.frame) return open(i.id); return baseOpenWork.apply(this, arguments); };
  // the Release 3 window closes (its Close, Escape, or the dimmed page): our card comes back on the same piece
  const baseCloseReview = closeReview;
  closeReview = function () {
    const back = TV.back; TV.back = null;
    const out = baseCloseReview.apply(this, arguments);
    if (back && teamOn()) setTimeout(() => { load(true).then(() => { if (byId(back.id)) open(back.id, { run: back.run, row: back.row, slide: back.slide }); }); }, 120);
    return out;
  };

  // ---------- the opened piece: Release 4's card with the team's tools ----------
  const SVG = {
    close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l10 10M15 5 5 15"/></svg>',
    left: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5 6.5 10l5.5 5.5"/></svg>',
    right: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4.5l5.5 5.5L8 15.5"/></svg>',
    check: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 10.5 3.2 3.2L15 6.8"/></svg>',
    draw: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16h3.2l8.4-8.4-3.2-3.2L4 12.8V16z"/></svg>',
    pin: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17.5s5-4.6 5-9a5 5 0 0 0-10 0c0 4.4 5 9 5 9z"/><circle cx="10" cy="8.5" r="1.8"/></svg>',
    caption: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h12M4 9h12M4 13h7"/><path d="m13 16 1.2-3.2 2.6-2.6 2 2-2.6 2.6z"/></svg>',
    fix: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M6.5 8h7M6.5 11.5h4.5"/></svg>',
    team: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="7" r="2.6"/><path d="M2.8 16a4.7 4.7 0 0 1 9.4 0"/><path d="M13 4.6a2.6 2.6 0 0 1 0 5M15 16a4.7 4.7 0 0 0-2.2-4"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 9v5M10 6.3v.2"/></svg>',
    link: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 11.5a3.6 3.6 0 0 0 5.1 0l2.4-2.4a3.6 3.6 0 0 0-5.1-5.1l-.8.8"/><path d="M11.5 8.5a3.6 3.6 0 0 0-5.1 0L4 10.9A3.6 3.6 0 0 0 9.1 16l.8-.8"/></svg>',
    figma: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M7.5 2.5h2.5v5H7.5a2.5 2.5 0 0 1 0-5zM10 2.5h2.5a2.5 2.5 0 0 1 0 5H10zM7.5 7.5H10v5H7.5a2.5 2.5 0 0 1 0-5zM10 10a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zM7.5 12.5H10V15a2.5 2.5 0 1 1-2.5-2.5z"/></svg>',
    told: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 4.5h13v9h-8l-5 3.5z"/><path d="m7.3 9 1.8 1.8L13 7"/></svg>',
  };
  const ic = (svg, cls) => E("span", { class: cls || "r4c-ic", "aria-hidden": "true", html: svg });
  function open(id, o) {
    o = o || {};
    if (!teamOn()) return false;
    const i = byId(id); if (!i) return false;
    try { if (window.R4T) R4T.close(); } catch (e) {}
    let run = o.run;
    if (!run || !run.includes(id)) {
      const t = document.querySelector('#work .wt[data-id="' + id + '"]'), sec = t && t.closest(".r4p-row");
      run = sec ? [...sec.querySelectorAll(".wt[data-id]")].map((x) => x.dataset.id) : [id];
      o.row = o.row || (sec && sec.getAttribute("aria-label")) || "";
    }
    const was = TV.card;
    TV.card = { id, run, row: o.row || (was && was.row) || "", slide: o.slide || 0, flash: o.flash || null, mode: "", info: false, cap: null, capFor: null };
    if (!was) { TV.pushed = !o.fromHistory; try { R4.setUrl({ open: id.slice(0, 8) }, o.fromHistory ? "replace" : "push"); } catch (e) {} }
    else { try { R4.setUrl({ open: id.slice(0, 8) }, "replace"); } catch (e) {} }
    drawCard();
    readCaption(i);
    return true;
  }
  function closeCard(o) {
    o = o || {};
    const root = document.getElementById("r4tvc");
    if (root) root.remove();
    if (!TV.card) return;
    const id = TV.card.id; TV.card = null;
    document.documentElement.classList.remove("r4c-lock"); document.body.classList.remove("r4c-on");
    if (!o.fromHistory && !o.quiet) {
      if (TV.pushed && new URLSearchParams(location.search).get("open")) { TV.pushed = false; try { history.back(); } catch (e) {} }
      else { try { R4.setUrl({ open: null }, "replace"); } catch (e) {} }
    }
    TV.pushed = false;
    setTimeout(() => { const t = document.querySelector('#work .wt[data-id="' + id + '"] .r4tv-pic'); if (t) t.focus({ preventScroll: true }); }, 30);
  }
  // R4C (the client card) answers for us too: the shell's Back, Calendar items and Coming up all go through it
  const bOpen = R4C.open, bIsOpen = R4C.isOpen, bClose = R4C.close;
  // a link to one piece (?p=<id or its first 8 letters>, turned into &page=content&open=<id> before the page starts; see
  // patch_R4_load.py, PART R4-plink) opens that piece over Content; a piece this link cannot see says so (no silent Home)
  const NOTHERE = "This piece isn't available on this link.";
  const notHere = () => { try { showToast(NOTHERE); hideToastLater(6000); } catch (e) {} try { if (new URLSearchParams(location.search).get("open")) R4.setUrl({ open: null }, "replace"); } catch (e) {} };
  R4C.open = function (id, opts) {
    if (teamOn() && !loaded()) { const n = ((opts && opts._tries) || 0) + 1; if (n > 12) { notHere(); return false; } load().then(() => R4C.open(id, Object.assign({}, opts || {}, { _tries: n }))); return; }
    if (teamOn()) { let full = id; try { const x = W.items.concat(W.dropped || []).find((i) => i.id === id || i.id.startsWith(String(id))); if (x) full = x.id; } catch (e) {}
      if (byId(full)) { if (byId(full).dropped_at) { notHere(); return false; } return open(full, opts || {}); }
      if (/^[0-9a-f-]{4,}$/i.test(String(id)) && !/^pc-/.test(String(id))) { notHere(); return false; } }
    // the client's view: a short id is found among the client's own pieces (waiting and answered)
    if (!teamOn() && /^[0-9a-f]{4,35}$/i.test(String(id))) {
      // on our board the team's sign-in arrives a moment after the page: wait for it (up to 8 s) before deciding
      let board = false; try { board = (ON_BOARD || window.__r4TeamSoon) && !TEAM.on && !(opts && opts._waited); } catch (e) {}
      if (board) {
        const t0 = Date.now();
        return new Promise((done) => { const tick = () => { let on = false; try { on = teamOn(); } catch (e) {}
          if (on || Date.now() - t0 > 8000) done(R4C.open(id, Object.assign({}, opts || {}, { _waited: true }))); else setTimeout(tick, 200); }; tick(); });
      }
      return Promise.resolve().then(() => R4D.ready()).catch(() => null).then(() => {
        let hit = null; try { hit = R4D.pieces().find((x) => String(x.id).startsWith(String(id).toLowerCase())) || null; } catch (e) {}
        if (!hit) { notHere(); return false; }
        return bOpen.call(R4C, hit.id, Object.assign({}, opts || {}, { rowKey: (opts && opts.rowKey) || R4D.rowOf(hit.id) }));
      });
    }
    return bOpen.apply(this, arguments);
  };
  R4C.isOpen = function () { return !!TV.card || bIsOpen.apply(this, arguments); };
  R4C.close = function (o) { if (TV.card) return closeCard(o); return bClose.apply(this, arguments); };

  function readCaption(i) {          // the caption, read the way the team's grown tile reads an article's first line (r4_team.js)
    const c = TV.card; if (!c || c.capFor === i.id) return;
    c.capFor = i.id; c.cap = null;
    try { TEAM.sb.from("items").select("caption").eq("id", i.id).maybeSingle().then((r) => { if (TV.card && TV.card.id === i.id) { TV.card.cap = (r && r.data && r.data.caption) || ""; drawCard(); } }, () => {}); } catch (e) {}
    readNotes(i);
  }
  // the notes on this piece (ours and the client's), for the pins on the artwork: read as the team's sign-in reads them
  function readNotes(i) {
    const c = TV.card; if (!c) return;
    try { TEAM.sb.from("feedback").select("id,reviewer,decision,comment,marks,variant_id,item_version,created_at").eq("item_id", i.id).order("created_at").then((r) => {
      if (TV.card && TV.card.id === i.id) { const got = (r && r.data) || [], ids = new Set(got.map((f) => f.id));
        TV.card.fb = got.concat((TV.card.fb || []).filter((f) => f.local && !ids.has(f.id))); drawCard(); } }, () => {}); } catch (e) {}      // a note just saved stays until the read brings it
  }
  function pinsOf(i, media) {
    const c = TV.card; if (!c || !media) return [];
    return (c.fb || []).filter((f) => f.item_version === i.version && f.variant_id === media.id && f.marks && Array.isArray(f.marks.pins))
      .flatMap((f) => f.marks.pins.map((q) => ({ x: +q.x, y: +q.y, text: q.text || f.comment || "", who: f.reviewer || "", when: f.created_at })));
  }
  // Release 3's card calls rpc with the team's sign-in (inside the board); here the same call is made with that sign-in
  async function teamRpc(fn, args) {
    const headers = { apikey: CONFIG.key, "Content-Type": "application/json" };
    const t = await window.boardToken(); if (!t) throw new Error("not signed in"); headers.Authorization = "Bearer " + t;
    const r = await fetch(`${CONFIG.url}/rest/v1/rpc/${fn}`, { method: "POST", cache: "no-store", headers, body: JSON.stringify(args) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  // a note as Release 3's card saves it (send(): submit_feedback), then told to the session as that card tells it
  async function teamNote(i, variant, decision, comment, marks, told) {
    if (!canAct()) return false;
    const res = await teamRpc("submit_feedback", { p_code: S.code, p_passcode: S.pass, p_item_id: i.id, p_item_version: i.version, p_variant_id: variant, p_reviewer: TEAM.me || "Lee",
      p_decision: decision, p_comment: comment, p_marks: marks, p_choice: null });
    if (!res || !res.ok) throw new Error((res && res.error) || "not saved");
    if (told !== false) { try { window.boardFeedbackSent(Object.assign({ id: i.id, title: i.title, client: cname(), decision, comment }, told || {})); } catch (e) {} }
    return res;
  }
  // Edited in Figma, here in the card: Release 3's figmaTell (a "change" note "I edited this in Figma: <link>", then the
  // board's boardFigmaEdited, which tells the session to take the frames from Figma)
  async function figmaTold(i, b) {
    const lab = b && b.querySelector("span:last-child"); if (b) b.disabled = true; if (lab) lab.textContent = "Telling…";
    try {
      const m = (i.media || [])[0] || { id: "text" };
      await teamNote(i, m.id || "text", "change", "I edited this in Figma: " + i.figma_url, null, false);
      let ok = false; try { ok = await window.boardFigmaEdited({ title: i.title, link: i.figma_url, version: i.version }); } catch (e) {}
      if (lab) lab.textContent = ok ? "Told" : "Saved"; say(ok ? "Saved, and the session that made this piece has been told." : "Saved. No open session was found to tell.", ok ? "ok" : "");
    } catch (e) { if (b) b.disabled = false; if (lab) lab.textContent = "Edited in Figma"; say("That didn't save: " + e.message, "err"); }
  }
  async function pinSave(i, media, x, y, text) {
    try { const res = await teamNote(i, media.id, "comment", "", { strokes: [], pins: [{ x, y, text }] }, { drew: true, edited: false }); if (!res) return false;
      const c = TV.card; if (c && c.id === i.id) { c.fb = [...(c.fb || []), { local: true, id: res.id || "local-" + Date.now(), reviewer: TEAM.me || "Lee", decision: "comment", comment: "", marks: { strokes: [], pins: [{ x, y, text }] }, variant_id: media.id, item_version: i.version, created_at: new Date().toISOString() }]; c.flash = "Pinned. The session that made this piece will be told."; drawCard(); readNotes(i); }
      return true;
    } catch (e) { say("That didn't save: " + e.message, "err"); return false; }
  }
  const curPiece = () => (TV.card ? byId(TV.card.id) : null);
  function step(d) {
    const c = TV.card; if (!c) return;
    const k = c.run.indexOf(c.id), nx = c.run[k + d]; if (!nx || !byId(nx)) return;
    open(nx, { run: c.run, row: c.row });
  }
  function say(msg, kind) { document.querySelectorAll("#r4tvc .r4c-status").forEach((s) => { s.className = "r4c-status" + (kind ? " " + kind : ""); s.textContent = msg || ""; }); }
  function drawCard() {
    const c = TV.card; if (!c) return;
    const i = curPiece(); if (!i) { closeCard(); return; }
    let root = document.getElementById("r4tvc");
    if (!root) {
      root = E("div", { id: "r4tvc", class: "r4c-root r4c-m-card r4tv-root" }, E("div", { class: "r4c-dim", onclick: () => closeCard() }),
        E("div", { class: "r4c-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "r4tv-title", tabindex: "-1" }));
      document.body.append(root);
      document.documentElement.classList.add("r4c-lock"); document.body.classList.add("r4c-on");
      requestAnimationFrame(() => { try { root.querySelector(".r4c-card").focus({ preventScroll: true }); } catch (e) {} });
    }
    root.dataset.id = i.id;
    const card = root.querySelector(".r4c-card");
    const s = cs6(i), t = typeOfW(i), media = i.media || [];
    const two = media.length === 2 && media.some((m) => /tall|story|reel|9\s*[:x×]\s*16/i.test(m.label || m.id || "")) && media.some((m) => /portrait|feed|4\s*[:x×]\s*5/i.test(m.label || m.id || ""));
    card.className = "r4c-card r4tv-card " + (two ? "sz-two" : "sz-two");
    // header: type, stage, title | ‹ Previous · 2 of 12 · Next piece › | ×
    const k = c.run.indexOf(i.id);
    const nav = c.run.length > 1 ? E("nav", { class: "r4c-nav", "aria-label": "Pieces in " + (c.row || "this row") },
      E("button", { type: "button", class: "r4c-btn r4c-sm", disabled: k <= 0, onclick: () => step(-1), title: "Previous piece" }, "‹ Previous"),
      E("div", { class: "r4c-count" + (c.flash ? " lit" : ""), "aria-live": "polite" }, E("b", { text: `${k + 1} of ${c.run.length}` }), c.row ? E("span", { text: c.row, title: c.row }) : null),
      E("button", { type: "button", class: "r4c-btn r4c-sm r4c-main", disabled: k >= c.run.length - 1, onclick: () => step(1), title: "Next piece" }, "Next piece ›")) : null;
    const head = E("header", { class: "r4c-head" },
      E("div", { class: "r4c-hl" }, E("div", { class: "r4c-chips" }, E("span", { class: "r4c-chip c-type", text: t }), E("span", { class: "r4c-chip c-" + ({ internal: "wait", client: "rev", wip: "type", approved: "pub", scheduled: "sch", published: "pub", dropped: "chg" })[s], text: LABEL[s] }),
          null),      // Lee, 26 Nov: no "Team only" label (before a piece goes to the client it is ours anyway); the stored flag still allows only "Approve"
        E("h2", { class: "r4c-title", id: "r4tv-title", text: i.title })),
      E("div", { class: "r4c-hr" }, ...(nav ? [nav] : []), E("button", { type: "button", class: "r4c-x", "aria-label": "Close", title: "Close", onclick: () => closeCard() }, ic(SVG.close))));
    // the artwork
    const art = E("div", { class: "r4c-art" });
    const n = media.length, sl = Math.max(0, Math.min(c.slide, n - 1)), m = media[sl];
    let el;
    try {
      if (!m) el = i.thumb ? E("img", { src: mediaUrl(i.thumb), alt: i.title, decoding: "async" }) : E("div", { class: "r4c-nomedia", text: "No picture yet." });
      else if (m.type === "video") el = E("video", { src: mediaUrl(m.path), poster: m.poster ? mediaUrl(m.poster) : null, controls: true, playsinline: true, preload: "metadata", "aria-label": i.title });
      else if (m.type === "text" || !m.path) el = E("div", { class: "r4c-textart", text: c.cap || i.title });
      else el = E("img", { src: mediaUrl(m.path), alt: i.title + (n > 1 ? `, ${sl + 1} of ${n}` : ""), decoding: "async", draggable: "false" });
    } catch (e) { el = E("div", { class: "r4c-nomedia", text: "No picture yet." }); }
    const box = E("div", { class: "r4c-fit r4tv-fit" }, el);
    const rb = (dir, label, fn, dis) => E("button", { type: "button", class: "r4c-round r4c-" + dir, "aria-label": label, title: label, disabled: !!dis, onclick: fn }, ic(dir === "prev" ? SVG.left : SVG.right));
    if (n > 1) box.append(rb("prev", "Previous slide", () => { c.slide = sl - 1; drawCard(); }, sl <= 0), rb("next", "Next slide", () => { c.slide = sl + 1; drawCard(); }, sl >= n - 1));
    art.append(E("div", { class: "r4c-stage r4tv-stage" }, box));
    const hint = E("p", { class: "r4pin-hint", text: "Click the spot you want to pin a comment on. Press Esc to stop." }); hint.hidden = !(window.R4PIN && R4PIN.on()); art.append(hint);
    if (window.R4PIN && m && m.type === "image") R4PIN.attach(box, { pins: pinsOf(i, m), placeholder: "Write your comment on this spot", onPost: canAct() && !i.dropped_at ? (x, y, t) => pinSave(i, m, x, y, t) : null });
    if (n > 1) art.append(E("p", { class: "r4c-under", text: `${sl + 1} of ${n}` + (m && m.label ? " · " + String(m.label).replace(/^\s*\d+[\s.:)-]+/, "") : "") }));
    // the right column: the decision, a comment, the tools, the details, the caption
    const col = E("div", { class: "r4c-col" }, decisionBox(i), commentBox(i), toolsBox(i), pinsBox(i, m), c.info ? infoBox(i) : null, detailsBox(i), captionBox(i));
    const flash = c.flash ? E("div", { class: "r4c-flash", role: "status" }, ic(SVG.check, "r4c-tick"), E("p", {}, E("b", { text: c.flash }))) : null;
    const keepY = card.querySelector(".r4c-col")?.scrollTop || 0;
    card.replaceChildren(head, E("div", { class: "r4c-body" }, flash, E("div", { class: "r4c-split" }, art, col)));
    if (keepY) { const cc = card.querySelector(".r4c-col"); if (cc) cc.scrollTop = keepY; }
    // the picture's box takes the picture's own shape and fits the space (as the client's card does)
    let ratio = m && m.width && m.height ? m.height / m.width : m && m.type === "video" ? 16 / 9 : 1.25;
    const stage = art.querySelector(".r4tv-stage");
    const fit = () => { const W_ = stage.clientWidth, H_ = stage.clientHeight; if (W_ < 40 || H_ < 40) return; const hh = Math.max(60, Math.min(H_, W_ * ratio)); box.style.height = Math.floor(hh) + "px"; box.style.width = Math.floor(hh / ratio) + "px"; };
    if (el.tagName === "IMG") el.addEventListener("load", () => { if (el.naturalWidth) { ratio = el.naturalHeight / el.naturalWidth; fit(); } }, { once: true });
    if (TV.ro) TV.ro.disconnect();
    if ("ResizeObserver" in window) { TV.ro = new ResizeObserver(fit); TV.ro.observe(stage); }
    requestAnimationFrame(fit);
  }
  const canAct = () => { try { return teamCard() && !TEAM.client && !!TEAM.sb; } catch (e) { return false; } };      // only a signed-in editor (the database checks it again)
  function decisionBox(i) {
    const c = TV.card, s = cs6(i), who = cname();
    const btn = (kind, label, main, fn) => E("button", { type: "button", class: "r4c-btn" + (main ? " r4c-main" : ""), "data-act": kind, disabled: !canAct() || !!c.busy, onclick: fn || (() => run(kind)) }, label);
    if (c.mode === "move") {
      return E("section", { class: "r4c-box r4c-answer r4tv-ask", role: "alertdialog", "aria-label": "Move to client review" },
        E("p", { class: "r4c-lead" }, E("b", { text: `Move “${i.title}” to client review?` })),
        E("p", { class: "r4tv-asks", text: nw(`${who} will see it straight away and be asked to approve it. You can pull it back while they have not answered.`) }),
        E("div", { class: "r4c-row" }, btn("move-yes", "Yes, move it", true, () => run("move")), btn("move-no", "Cancel", false, () => { c.mode = ""; drawCard(); })),
        E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
    }
    const kids = [];
    let lead = "";
    if (s === "dropped") lead = "This piece was dropped. Put it back from its tile's ⋯ menu, under Dropped.";
    else if (WACT.move.can(i)) lead = `Waiting for you. Move it in front of ${who}, or approve it and keep it with us.`;
    else if (WACT.ok.can(i)) lead = "A team-only piece. Approve it, or comment to send it back to the team.";
    else if (WACT.pull.can(i)) lead = `With ${who}, waiting for their answer.`;
    else if (s === "wip") lead = "We're working on it. A comment goes to the session that made it.";
    else if (s === "approved") lead = i.noclient ? "Approved, and kept with us (the client was skipped)." : `Approved${i.stage === "approved" && i.audience !== "team" ? " by " + who : ""}. Ready to schedule.`;
    else if (s === "scheduled") lead = "Scheduled to go out.";
    else if (s === "published") lead = "Published.";
    if (s !== "dropped") {
      if (WACT.move.can(i)) kids.push(btn("move", "Move to client review", true, () => { c.mode = "move"; drawCard(); setTimeout(() => document.querySelector("#r4tvc [data-act=move-yes]")?.focus(), 30); }));
      if (WACT.skip.can(i)) kids.push(btn("skip", "Approve, skip client", !WACT.move.can(i)));
      if (WACT.ok.can(i)) kids.push(btn("ok", "Approve", true));
      if (WACT.pull.can(i)) kids.push(btn("pull", "Pull back from client review", false));
    }
    return E("section", { class: "r4c-box r4c-answer", "aria-label": "Your decision" },
      E("p", { class: "r4c-lead" }, E("b", { text: nw(lead) })),
      kids.length ? E("div", { class: "r4c-row r4tv-row" }, ...kids) : null,
      canAct() ? null : E("p", { class: "r4tv-asks", text: "Only a signed-in M7Alpha editor can do this." }),
      E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
  }
  function commentBox(i) {
    try { if (!WACT.comment.can(i) || i.dropped_at) return null; } catch (e) { return null; }
    const ta = E("textarea", { class: "r4c-ta", rows: "3", maxlength: "5000", placeholder: "Write a comment. It goes to the session that made this piece.", "aria-label": "Your comment on " + i.title });
    const send = E("button", { type: "button", class: "r4c-btn", "data-act": "comment", disabled: !canAct(), onclick: () => { const v = ta.value.trim(); if (!v) { say("Write the comment first."); ta.focus(); return; } run("comment", { comment: v.slice(0, 5000) }); } }, "Send the comment");
    return E("section", { class: "r4c-box r4tv-cmt", "aria-label": "Comment" }, E("h3", { text: "Comment" }), ta,
      E("div", { class: "r4c-row" }, send, E("span", { class: "r4tv-hint", text: nw("A comment counts as a change: the piece goes back to the team.") })));
  }
  function toolsBox(i) {
    const c = TV.card, team = i.audience === "team";
    const tool = (key, icon, label, title, fn, o) => E(o && o.href ? "a" : "button", Object.assign({ class: "r4tv-tool", "data-tool": key, title, "aria-label": title, onclick: fn },
      o && o.href ? { href: o.href, target: "_blank", rel: "noopener" } : { type: "button" }, o && o.pressed != null ? { "aria-pressed": String(o.pressed) } : {}, o && o.dis ? { disabled: true } : {}), ic(icon, "r4tv-ti"), E("span", { text: label }));
    const list = [
      // Lee, 26 Nov 2026: Draw and Fix caption are gone from our view; Pin and Edit caption work here, in this card
      tool("pin", SVG.pin, (window.R4PIN && R4PIN.on()) ? "Done pinning" : "Pin", "Pin a comment on the artwork (C)", () => { if (window.R4PIN) R4PIN.toggle(); }, { pressed: !!(window.R4PIN && R4PIN.on()), dis: !canAct() || !!i.dropped_at || !((i.media || []).some((x) => x.type === "image")) }),
      tool("caption", SVG.caption, c.capEdit != null ? "Editing" : "Edit caption", "Edit the caption here", () => { if (c.cap == null) return; c.capEdit = c.capEdit != null ? null : String(c.cap || ""); drawCard(); setTimeout(() => document.querySelector("#r4tvc .r4tv-capta")?.focus(), 30); }, { pressed: c.capEdit != null, dis: !canAct() || !!i.dropped_at || c.cap == null }),
      tool("info", SVG.info, "More info", "More info: the title, version and batch", () => { c.info = !c.info; drawCard(); }, { pressed: !!c.info }),
      tool("link", SVG.link, "Copy link", "Copy the client's link to this piece", (e) => copyLink(i, e.currentTarget)),
      i.figma_url ? tool("figma", SVG.figma, "Open in Figma", "Open in Figma", null, { href: i.figma_url }) : tool("figma", SVG.figma, "Figma", "No Figma link saved for this piece yet", () => say("No Figma link saved for this piece yet."), { dis: false }),
      i.figma_url ? tool("told", SVG.told, "Edited in Figma", "Edited in Figma: tell the session I edited it in Figma", (e) => figmaTold(i, e.currentTarget), { dis: !canAct() || !!i.dropped_at }) : null,
    ].filter(Boolean);
    return E("section", { class: "r4c-box r4tv-tools", "aria-label": "Tools" }, E("h3", { text: "Tools" }), E("div", { class: "r4tv-tgrid" }, ...list),
      );
  }
  function infoBox(i) {
    const rows = [["Title", i.title], ["Version", String(i.version || 1)], ["Batch", i.batch || ""], ["Uploaded", i.created_at ? dayLabel(i.created_at) : ""],
      ["Date", i.post_date ? dayLabel(i.post_date) + (i.date_confirmed === false ? " (to be confirmed)" : "") : ""], ["Subject", i.subject || ""],
      ["Our check", chk(i) ? "Yes, a proof or check we made for ourselves" : ""], ["Why dropped", i.dropped_why || ""]].filter((r) => r[1]);
    return E("section", { class: "r4c-box r4c-details r4tv-info", "aria-label": "More info" }, E("h3", { text: "More info" }), E("dl", { class: "r4c-dl" }, ...rows.flatMap(([a, b]) => [E("dt", { text: a }), E("dd", { text: b })])));
  }
  function detailsBox(i) {
    const s = cs6(i);
    const rows = [["Stage", LABEL[s] + (i.noclient ? " (skipped the client)" : "")], ["Goes out", dateOf(i) ? dayLabel(dateOf(i)) + (i.date_confirmed === false && !i.scheduled_for ? ", to be confirmed" : "") : ""],
      ["Type", typeOfW(i)], ["How it runs", PROMO[i.promo] || ""], ["Campaign", i.campaign || ""]].filter((r) => r[1]);
    return E("section", { class: "r4c-box r4c-details", "aria-label": "Details" }, E("dl", { class: "r4c-dl" }, ...rows.flatMap(([a, b]) => [E("dt", { text: a }), E("dd", { text: b })])));
  }
  function pinsBox(i, m) {
    if (!window.R4PIN || !m || m.type !== "image") return null;
    const list = pinsOf(i, m); if (!list.length) return null;
    return E("section", { class: "r4c-box r4pin-listbox", "aria-label": "Pins on the artwork" }, E("h3", { text: `Pins on this ${(i.media || []).length > 1 ? "slide" : "picture"} (${list.length})` }),
      E("ol", { class: "r4pin-list" }, ...list.map((q, k) => E("li", {}, E("button", { type: "button", class: "r4pin-li", onclick: () => R4PIN.highlight(k + 1) },
        E("i", { text: String(k + 1) }), E("span", {}, E("b", { text: q.text || "(no words)" }), E("small", { text: [q.who, q.when ? dayLabel(q.when) : ""].filter(Boolean).join(" · ") })))))));
  }
  // Edit caption, here in the card: saved as Release 3's Edit caption saves it (its send(): a "change" note whose marks
  // carry text_edit, the comment "I edited the caption."), so the session makes the new version
  async function capSave(i, btn) {
    const c = TV.card, ta = document.querySelector("#r4tvc .r4tv-capta"); if (!c || !ta) return;
    const v = ta.value; c.capEdit = v;
    if (v.trim() === String(c.cap || "").trim()) { c.capEdit = null; drawCard(); return; }
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      const m = (i.media || [])[Math.max(0, Math.min(c.slide, (i.media || []).length - 1))] || { id: "text" };
      await teamNote(i, m.id || "text", "change", "I edited the caption.", { text_edit: v }, { edited: true });
      c.capEdit = null; c.flash = "Caption change sent. The session will make the new version with your words."; c.capFor = null; readCaption(i); drawCard();
    } catch (e) { btn.disabled = false; btn.textContent = "Save"; say("That didn't save: " + e.message, "err"); }
  }
  function captionBox(i) {
    const c = TV.card;
    if (c.capEdit != null) {
      const ta = E("textarea", { class: "r4c-ta r4tv-capta", rows: "9", maxlength: "10000", "aria-label": "Caption" }); ta.value = c.capEdit;
      ta.addEventListener("input", () => { c.capEdit = ta.value; });
      ta.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); c.capEdit = null; drawCard(); } });
      const save = E("button", { type: "button", class: "r4c-btn r4c-sm r4c-main", "data-act": "cap-save", onclick: (e) => capSave(i, e.currentTarget) }, "Save");
      return E("section", { class: "r4c-box r4c-caption r4tv-capedit" }, E("h3", { text: "Edit the caption" }), ta,
        E("p", { class: "r4tv-hint", text: nw("Saving sends your words as a change, so the session makes the new version.") }),
        E("div", { class: "r4c-row" }, save, E("button", { type: "button", class: "r4c-btn r4c-sm", "data-act": "cap-cancel", onclick: () => { c.capEdit = null; drawCard(); } }, "Cancel")));
    }
    if (c.cap == null) return E("section", { class: "r4c-box r4c-caption" }, E("h3", { text: "Caption" }), E("p", { class: "r4c-captext r4tv-dim", text: "Loading the caption…" }));
    let t = String(c.cap || "");
    try { t = typeof mainCaption === "function" ? mainCaption(t) : t.trim(); } catch (e) {}
    t = String(t || "").replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/\[pic:[^\]]*\]/g, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\n{3,}/g, "\n\n").trim();
    const ad = /^(advert|ad|promo|promotional)$/i.test(String(i.promo || ""));
    if (!t) return E("section", { class: "r4c-box r4c-caption" }, E("h3", { text: ad ? "Advert text" : "Caption" }), E("p", { class: "r4c-captext r4tv-dim", text: "No caption on this piece." }));
    const txt = E("p", { class: "r4c-captext", text: t });
    const sec = E("section", { class: "r4c-box r4c-caption" }, E("h3", { text: ad ? "Advert text" : "Caption" }), txt);
    const more = E("button", { type: "button", class: "r4c-more", hidden: true, "aria-expanded": "false", onclick: () => { const on = sec.classList.toggle("open"); more.textContent = on ? "Show less" : "Read all"; more.setAttribute("aria-expanded", String(on)); } }, "Read all");
    sec.append(more);
    requestAnimationFrame(() => { if (txt.scrollHeight > txt.clientHeight + 4) more.hidden = false; else sec.classList.add("open"); });
    return sec;
  }
  // Copy link: the same address Release 3's card copies (the client's link to this piece), and the same warnings
  // Copy link: the client's own address for a piece the client can see; our board's address (behind our sign-in) for one
  // they cannot see yet (work in progress, Internal review, team-only, dropped), which their page could never open
  const BOARD_URL = "https://m7alpha-board.pages.dev/";
  const clientSees = (i) => !i.dropped_at && i.audience !== "team" && ["needs_client", "approved"].includes(i.stage);
  async function copyLink(i, b) {
    const theirs = clientSees(i);
    const u = `${theirs ? CLIENT_URL : BOARD_URL}?c=${encodeURIComponent(S.code)}&p=${i.id.slice(0, 8)}`;
    const lab = b && b.querySelector("span:last-child"); const was = lab ? lab.textContent : "";
    const ok = await copyText(u);
    if (lab) { lab.textContent = ok ? (theirs ? "Client link copied" : "Team link copied") : was; setTimeout(() => { if (lab.isConnected) lab.textContent = was; }, 2500); }
    say(!ok ? "" : theirs ? `Client link copied: ${cname()} can open it.` : "Team link copied: it opens on our board, behind the M7Alpha sign-in. The client can't see this piece yet.");
  }
  // a tool that lives in Release 3's own card: open that card on this piece (the page's own window) and press the tool there
  function inFrame(i, labels) {
    const c = TV.card; if (!c || !canAct()) return;
    const want = labels.split("|");
    TV.back = { id: i.id, run: c.run, row: c.row, slide: c.slide };
    closeCard({ quiet: true });
    TV.frame = true;
    try { baseOpenWork(i); } finally { TV.frame = false; }
    const t0 = Date.now();
    const press = () => {
      const fr = document.querySelector("#wover iframe"); if (!fr) return;
      let b = null;
      try { b = [...fr.contentDocument.querySelectorAll(".toolstrip .tsb")].find((x) => want.includes((x.querySelector(".tsl") || {}).textContent?.trim())); } catch (e) {}
      if (b) { if (b.getAttribute("aria-pressed") !== "true" || want[0] === "Team only") b.click(); return; }
      if (Date.now() - t0 < 20000) setTimeout(press, 250);
    };
    setTimeout(press, 600);
  }
  // one save, through the page's own function (workRun): the same stored note as the tile's buttons and its ⋯ menu
  async function run(kind, opt) {
    const c = TV.card, i = curPiece(); if (!c || !i || c.busy) return;
    if (!canAct()) { say("Only a signed-in M7Alpha editor can do this."); return; }
    if (kind === "move" && c.mode !== "move") { c.mode = "move"; drawCard(); return; }      // Move always asks first, naming the client
    c.busy = true; c.mode = ""; drawCard(); say("Saving…");
    const before = { stage: cs6(i) };
    try { await workRun(kind, [i], opt || {}); } catch (e) {}
    c.busy = false;
    if (!TV.card || TV.card !== c) return;      // another piece was opened meanwhile: stay on it
    // workRun says how it went in the page's own message at the bottom: "That stopped part-way…" or "Nothing to do…"
    // when nothing was saved (it saves nothing for a piece that moved on meanwhile)
    const told = (document.getElementById("toast")?.textContent || "").trim();
    const did = { move: "Moved to client review", skip: "Approved, skipped the client", ok: "Approved", pull: "Pulled back from client review", comment: "Comment saved" }[kind] || "Saved";
    if (/^(That stopped|Nothing to do)/.test(told)) { drawCard(); say(nw(told), "err"); return; }
    // on to the next piece in the row, as the client's card does
    const k = c.run.indexOf(i.id), next = c.run.slice(k + 1).concat(c.run.slice(0, k)).find((x) => x !== i.id && byId(x) && (TV.cs.stage === "all" || TV.cs.stage === "link" || TV.cs.stage === "ids" || cs6(byId(x)) === before.stage));
    if (kind !== "comment" && next) { open(next, { run: c.run, row: c.row, flash: `${did}: ${i.title}. You're now on the next piece, ${c.run.indexOf(next) + 1} of ${c.run.length}.` }); return; }
    TV.card.flash = kind === "comment" ? `${did}: ${i.title}.` : `${did}: ${i.title}. That was the last one in this row.`;
    drawCard();
  }
  addEventListener("keydown", (e) => {
    if (!TV.card || !document.getElementById("r4tvc")) return;
    if (e.target && e.target.closest && e.target.closest("textarea, input")) { if (e.key === "Escape") { e.target.blur(); e.preventDefault(); } return; }
    const m = document.getElementById("modal"); if (m && !m.hidden) return;
    if (e.key === "Escape") { if (TV.card.mode) { TV.card.mode = ""; drawCard(); } else closeCard(); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === "ArrowDown" || e.key === "PageDown") { step(1); e.preventDefault(); }
    else if (e.key === "ArrowUp" || e.key === "PageUp") { step(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { const i = curPiece(); if (i && (i.media || []).length > 1 && TV.card.slide < i.media.length - 1) { TV.card.slide++; drawCard(); } }
    else if (e.key === "ArrowLeft") { if (TV.card.slide > 0) { TV.card.slide--; drawCard(); } }
  }, true);

  // ---------- the menu (r4_shell.js draws it; for us it gets our pages, the Team group and Sessions | Client Studio) ----------
  const SVGI = (inner) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  const MICON = {
    reports: SVGI('<path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/><path d="M14 3v4.5h5"/><path d="M9 12.5h6M9 16h6M9 9h2"/>'),
    tasks: SVGI('<path d="m3.5 6.5 1.8 1.8 3.2-3.3M3.5 16.5l1.8 1.8 3.2-3.3"/><path d="M12.5 7h8M12.5 12h8M12.5 17h8"/>'),
    leads: SVGI('<path d="M21 12.5h-5l-1.8 2.8h-4.4L8 12.5H3"/><path d="M6 5.5h12l3 7V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5.5Z"/>'),
    brand: SVGI('<path d="M12 3a9 9 0 0 0 0 18c1 0 1.6-.7 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6h2A4.6 4.6 0 0 0 21 11c0-4.4-4-8-9-8Z"/><path d="M7.5 12h.01M9.5 7.8h.01M14.2 7.2h.01M17 10.8h.01" stroke-width="2.6"/>'),
    docs: SVGI('<path d="M14.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/><path d="M14 3v4.5h5"/>'),
    link: SVGI('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
    ask: SVGI('<path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.1-4.4A8.5 8.5 0 1 1 20.5 12z"/><path d="M12 8.5v7M8.5 12h7"/>'),
  };
  function mItem(key, label, pressed, onclick, n) {
    return E("button", { type: "button", class: "r4-item r4tv-mi", "data-key": key, "aria-pressed": String(!!pressed), "aria-current": pressed ? "page" : null, onclick },
      E("i", { class: "r4-ico", "aria-hidden": "true", html: MICON[key] || MICON.docs }), E("span", { class: "r4-l", text: label }), n ? E("em", { class: "r4-n", text: String(n), "aria-label": n + " waiting" }) : null);
  }
  function menu() {
    const nav = document.getElementById("sidenav"); if (!nav || !nav.classList.contains("r4-menu")) return;
    const list = nav.querySelector(".r4-nav"); if (!list) return;
    list.querySelectorAll(".r4tv-mi, .r4tv-glab").forEach((x) => x.remove());
    // Content's number: what waits for Lee (Internal review), not the client's count
    const ci = [...list.querySelectorAll(".r4-item")].find((b) => /^Content$/.test(b.querySelector(".r4-l")?.textContent || ""));
    if (ci) { ci.querySelector(".r4-n")?.remove(); const n = loaded() ? counts().internal : 0; if (n) ci.append(E("em", { class: "r4-n", text: String(n), "aria-label": n + " in Internal review" })); }
    const has = (n) => { try { return PANELS.some((x) => x.name === n); } catch (e) { return false; } };
    const onR3 = (tab) => !R4.page && S.tab === tab;
    const items = [];
    if (has("reports")) items.push(mItem("reports", "Reports", onR3("reports"), () => go("reports")));
    items.push(mItem("tasks", "Tasks", onR3("jobs"), () => go("tasks")));
    if (has("leads")) items.push(mItem("leads", "Leads", onR3("leads"), () => go("leads")));
    if (has("brand")) items.push(mItem("brand", "Brand", onR3("brand"), () => go("brand")));
    if (has("docs")) items.push(mItem("docs", "Documents", onR3("docs"), () => go("docs")));
    list.append(...items);
    // the Team group: Copy client link, Ask a question (the page's own teamAsk)
    const copy = mItem("link", "Copy client link", false, async () => {
      if (await copyText(CLIENT_URL + "?c=" + encodeURIComponent(S.code))) { const l = copy.querySelector(".r4-l"); l.textContent = "Link copied"; setTimeout(() => { if (l.isConnected) l.textContent = "Copy client link"; }, 2500); }
    });
    copy.removeAttribute("aria-pressed");
    const ask = mItem("ask", "Ask a question", false, () => { try { teamAsk(); } catch (e) {} }); ask.removeAttribute("aria-pressed");
    list.append(E("div", { class: "r4tv-glab", text: "Team" }), copy, ask);
    // "How it works" walks the client's own pages: not ours
    [...nav.querySelectorAll(".r4-foot .r4-foot-b")].forEach((x) => { if (/How it works/.test(x.textContent)) x.remove(); });
    // Sessions | Client Studio, under the logo
    if (!nav.querySelector(".r4tv-sw")) {
      const logo = nav.querySelector(".r4-logo");
      const sw = E("div", { class: "r4tv-sw", role: "group", "aria-label": "Switch page" }, E("a", { href: "sessions", text: "Sessions" }), E("a", { href: location.search, "aria-current": "page", text: "Client Studio" }));
      if (logo) logo.after(sw); else nav.prepend(sw);
    }
  }
  const baseSN = renderSideNav;
  renderSideNav = function () { const out = baseSN.apply(this, arguments); try { if (teamOn()) menu(); } catch (e) { console.warn("R4-tv menu", e); } return out; };

  // our Client view: leave our card and grown tile behind
  try { if (typeof setClientView === "function") { const b = setClientView; setClientView = function (on) { if (on) { closeCard({ quiet: true }); document.body.classList.remove("r4tv"); } return b.apply(this, arguments); }; } } catch (e) {}

  // ---------- the cover photo on Home's "Next for you" card (Lee, 26 Nov 2026: "a cover photo like the cards in the
  // content page (but very wide landscape)"), for clients and for us, laptops and phones. One picture per client, at a
  // fixed address next to the page: covers/<client slug>.jpg (2400 x 750). No file, or it fails: the card stays as it
  // was (black). The picture is fetched first and faded in only once it has loaded, so nothing broken ever shows. ----------
  const COV = new Map();          // slug -> true | false, once known
  function coverFor(slug) {
    if (COV.has(slug)) return Promise.resolve(COV.get(slug));
    return new Promise((done) => { const im = new Image(); im.onload = () => done(im.naturalWidth > 0); im.onerror = () => done(false); im.src = "covers/" + encodeURIComponent(slug) + ".jpg"; })
      .then((ok) => { COV.set(slug, ok); return ok; });
  }
  function coverHeroes() {
    const list = document.querySelectorAll("#app .r4p-hero:not([data-cov])"); if (!list.length) return;
    let slug = ""; try { slug = String((S.data && S.data.client && S.data.client.slug) || "").trim(); } catch (e) {}
    list.forEach((hero) => {
      hero.dataset.cov = slug || "-"; if (!slug || !/^[\w-]+$/.test(slug)) return;
      const known = COV.get(slug) === true;
      coverFor(slug).then((ok) => {
        if (!ok || !hero.isConnected || hero.querySelector(".r4cov-img")) return;
        const img = document.createElement("img"); img.className = "r4cov-img"; img.alt = ""; img.decoding = "async"; img.src = "covers/" + encodeURIComponent(slug) + ".jpg";
        const shade = document.createElement("span"); shade.className = "r4cov-shade"; shade.setAttribute("aria-hidden", "true");
        hero.prepend(img, shade); hero.classList.add("r4cov");
        if (known) hero.classList.add("r4cov-in"); else requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add("r4cov-in")));      // a redraw shows it at once; the first time it fades in
      });
    });
  }
  try { new MutationObserver(coverHeroes).observe(document.body, { childList: true, subtree: true }); } catch (e) {}

  window.R4TV = {
    on: teamOn, go, content, isCheck: (i) => chk(i), select: () => ({ on: SEL.on, ids: [...SEL.ids], phase: SEL.phase, k: SEL.k, n: SEL.n, result: SEL.result }), open: (id, o) => open(id, o), close: () => closeCard(),
    state: () => ({ page: R4.page, tab: S.tab, cs: Object.assign({}, TV.cs), card: TV.card ? { id: TV.card.id, run: TV.card.run.length, mode: TV.card.mode, flash: TV.card.flash } : null, loaded: loaded() }),
  };
  // the page may already be drawn as the team (a reload): draw once more now that this file is here
  setTimeout(() => { try { if (teamOn()) { renderApp(); renderSideNav(); } } catch (e) {} }, 0);
})();
