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
     function: workRun ("move" | "skip" | "ok" | "pull" | "comment"). The tools that live in Release 3's own card (Draw, Pin,
     Edit caption, Fix caption, Team only, Edited in Figma) open that card (openWork, the page's own window with the
     team's sign-in) and press that tool in it, so they run exactly the code they run today. No new database call.
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
  const pool = () => { try { return W.items.filter((i) => W.checks || !isCheck(i)); } catch (e) { return []; } };
  const checksN = () => { try { return W.items.concat(W.dropped || []).filter(isCheck).length; } catch (e) { return 0; } };
  const byId = (id) => { try { return W.items.find((x) => x.id === id) || (W.dropped || []).find((x) => x.id === id) || null; } catch (e) { return null; } };
  const typeOfW = (i) => { try { return tileKind(i.kind, i.group_name, i.media || [], i.title) || workType(i) || "Post"; } catch (e) { return "Post"; } };
  const isArt = (i) => typeOfW(i) === "Article";
  const dateOf = (i) => (i.scheduled_for || i.post_date || "").slice(0, 10) || null;
  const PROMO = { organic: "Timeline post", promotional: "Advert", advert: "Advert", ad: "Advert", both: "Timeline post and advert" };

  const TV = { page: null, cs: { stage: "internal", type: null, link: null, ids: null, idsLabel: "" }, card: null, loading: null, started: false, linkDone: false,
    pend: (() => { const p = new URLSearchParams(location.search).get("page"); return p && /^(library|reports|tasks|leads|brand|docs|documents)$/i.test(p) ? p : null; })() };
  function load(force) {
    if (!force && loaded()) return Promise.resolve();
    if (TV.loading) return TV.loading;
    TV.loading = workLoad().catch((e) => { TV.err = e && e.message; }).finally(() => { TV.loading = null; });
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
        E("button", { type: "button", class: "r4p-go", onclick: act }, label || "Open", E("i", { "aria-hidden": "true", text: "›" }))));
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
    else if (cs.stage === "dropped") list = (W.dropped || []).filter((i) => W.checks || !isCheck(i));
    else if (cs.stage !== "all") list = list.filter((i) => six(i) === cs.stage);
    return list;
  }
  function contentPage() {
    const cs = TV.cs, c = counts(), nChecks = checksN();
    if (cs.stage === "link" && !(cs.link || []).length) cs.stage = "internal";
    const base = shownPool();
    const types = [...new Set(base.map(typeOfW))].sort();
    if (cs.type && !types.includes(cs.type)) cs.type = null;
    const list = base.filter((i) => !cs.type || typeOfW(i) === cs.type);
    const root = E("div", { class: "r4p r4tv-content work", id: "work", "data-page": "content" });      // not "r4p-content": the client's search and tour (r4_merge.js, r4_tour.js) look for that
    const redo = () => redraw();
    const chip = (key, label, n) => E("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(cs.stage === key),
      onclick: () => { Object.assign(cs, { stage: key, ids: key === "ids" ? cs.ids : null, link: key === "link" ? cs.link : null, type: null }); redo(); } }, n == null ? label : `${label} · ${n}`);
    const checksBtn = nChecks || W.checks ? E("button", { type: "button", class: "r4p-fchip r4tv-checks", "aria-pressed": String(!!W.checks), title: "Proof screenshots and checks we made for ourselves",
      onclick: () => { W.checks = !W.checks; redo(); } }, W.checks ? `Hide our checks · ${nChecks}` : `Show our checks · ${nChecks}`) : null;
    root.append(E("div", { class: "r4p-top" }, E("div", {}, E("h1", { class: "r4p-h1", text: "Content" }),
      E("p", { class: "r4p-sub", text: nw(`Every piece for ${cname()}, at every stage. Only the M7Alpha team sees this view.`) })), checksBtn));
    const dropped = (W.dropped || []).filter((i) => W.checks || !isCheck(i)).length;
    root.append(E("div", { class: "r4p-filters", role: "group", "aria-label": "Stage" },
      ...(cs.stage === "link" ? [chip("link", "From your link", (cs.link || []).length)] : []),
      ...(cs.stage === "ids" ? [chip("ids", cs.idsLabel || "Chosen pieces", (cs.ids || []).length)] : []),
      ...ORDER.map((k) => chip(k, LABEL[k], c[k])), chip("all", "All stages", pool().length), dropped ? chip("dropped", "Dropped", dropped) : null));
    if (types.length > 1) root.append(E("div", { class: "r4p-filters r4tv-types", role: "group", "aria-label": "Type" },
      E("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(!cs.type), onclick: () => { cs.type = null; redo(); } }, "All types"),
      ...types.map((t) => E("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(cs.type === t), onclick: () => { cs.type = cs.type === t ? null : t; redo(); } }, t))));
    if (!list.length) {
      root.append(E("div", { class: "r4p-card r4p-empty" }, E("b", { text: cs.stage === "internal" ? "Nothing waits for you in Internal review." : "Nothing here right now." }),
        E("span", { text: nw(cs.stage === "internal" && nChecks && !W.checks ? "Some of our own checks may wait too: “Show our checks” brings them in." : "Pieces show up here as soon as they are uploaded.") }),
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
    const lab = `${t}: ${short(i.title) || t}. ${LABEL[s]}${i.audience === "team" ? ", team only" : ""}`;
    const pic = E("button", { type: "button", class: "r4tv-pic", style: `width:${w}px;height:${hgt}px`, "aria-label": "Open " + lab, onclick: () => open(i.id, { run: r.list.map((x) => x.id), row: r.title }) },
      thumb, E("span", { class: "r4tv-tl" }, E("span", { class: "r4p-chip r4p-c-" + CHIP[s], text: LABEL[s] })),
      n > 1 && !art ? E("span", { class: "r4tv-n", text: "1/" + n }) : null,
      i.audience === "team" ? E("span", { class: "r4tv-team", text: "Team only" }) : null);
    return E("div", { class: "wt st-" + (({ internal: "need", client: "cli", wip: "wip", approved: "ok", scheduled: "sched", published: "pub", dropped: "gone" })[s] || "need") + " r4tv-t" + (art ? " r4tv-wide" : "") + (gone ? " gone" : ""),
      "data-id": i.id, title: [i.title, LABEL[s] + (i.noclient ? " (skipped the client)" : ""), i.audience === "team" ? "team only" : null, isCheck(i) ? "our own check" : null].filter(Boolean).join("\n"),
      oncontextmenu: (e) => { e.preventDefault(); try { workMenu(i, e.currentTarget); } catch (x) {} } },
      pic, E("span", { class: "r4p-meta" }, E("b", { text: t }), bits.length ? " · " + bits.join(" · ") : ""));
  }
  const cs6 = (i) => (i.dropped_at ? "dropped" : six(i));

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
  R4C.open = function (id, opts) {
    if (teamOn() && !loaded()) { load().then(() => R4C.open(id, opts)); return; }
    if (teamOn()) { let full = id; try { const x = W.items.concat(W.dropped || []).find((i) => i.id === id || i.id.startsWith(String(id))); if (x) full = x.id; } catch (e) {}
      if (byId(full)) return open(full, opts || {}); }
    return bOpen.apply(this, arguments);
  };
  R4C.isOpen = function () { return !!TV.card || bIsOpen.apply(this, arguments); };
  R4C.close = function (o) { if (TV.card) return closeCard(o); return bClose.apply(this, arguments); };

  function readCaption(i) {          // the caption, read the way the team's grown tile reads an article's first line (r4_team.js)
    const c = TV.card; if (!c || c.capFor === i.id) return;
    c.capFor = i.id; c.cap = null;
    try { TEAM.sb.from("items").select("caption").eq("id", i.id).maybeSingle().then((r) => { if (TV.card && TV.card.id === i.id) { TV.card.cap = (r && r.data && r.data.caption) || ""; drawCard(); } }, () => {}); } catch (e) {}
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
          i.audience === "team" ? E("span", { class: "r4c-chip c-type", text: "Team only" }) : null),
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
    if (n > 1) art.append(E("p", { class: "r4c-under", text: `${sl + 1} of ${n}` + (m && m.label ? " · " + String(m.label).replace(/^\s*\d+[\s.:)-]+/, "") : "") }));
    // the right column: the decision, a comment, the tools, the details, the caption
    const col = E("div", { class: "r4c-col" }, decisionBox(i), commentBox(i), toolsBox(i), c.info ? infoBox(i) : null, detailsBox(i), captionBox(i));
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
    const frame = (label) => () => inFrame(i, label);
    const list = [
      tool("draw", SVG.draw, "Draw", "Draw on the artwork (opens the full card)", frame("Draw"), { dis: !canAct() || !!i.dropped_at }),
      tool("pin", SVG.pin, "Pin", "Pin a comment (opens the full card)", frame("Pin"), { dis: !canAct() || !!i.dropped_at }),
      tool("caption", SVG.caption, "Edit caption", "Edit the caption in the preview (opens the full card)", frame("Edit caption"), { dis: !canAct() || !!i.dropped_at }),
      tool("fixcap", SVG.fix, "Fix caption", "Fix caption: edit it directly, it saves straight to the piece (opens the full card)", frame("Fix caption|Add caption"), { dis: !canAct() || !!i.dropped_at }),
      tool("team", SVG.team, team ? "Team only" : "For client", team ? "Team only. Make it for the client (opens the full card)" : "For the client. Make it team only (opens the full card)", frame("Team only|For client"), { pressed: team, dis: !canAct() || !!i.dropped_at }),
      tool("info", SVG.info, "More info", "More info: the title, version and batch", () => { c.info = !c.info; drawCard(); }, { pressed: !!c.info }),
      tool("link", SVG.link, "Copy link", "Copy the client's link to this piece", (e) => copyLink(i, e.currentTarget)),
      i.figma_url ? tool("figma", SVG.figma, "Open in Figma", "Open in Figma", null, { href: i.figma_url }) : tool("figma", SVG.figma, "Figma", "No Figma link saved for this piece yet", () => say("No Figma link saved for this piece yet."), { dis: false }),
      i.figma_url ? tool("told", SVG.told, "Edited in Figma", "Edited in Figma: tell the session I edited it in Figma (opens the full card)", frame("Edited in Figma"), { dis: !canAct() || !!i.dropped_at }) : null,
    ].filter(Boolean);
    return E("section", { class: "r4c-box r4tv-tools", "aria-label": "Tools" }, E("h3", { text: "Tools" }), E("div", { class: "r4tv-tgrid" }, ...list),
      E("p", { class: "r4tv-hint", text: nw("Draw, Pin, Edit caption, Fix caption, Team only and Edited in Figma open the full editing card on this piece. Close it to come back here.") }));
  }
  function infoBox(i) {
    const rows = [["Title", i.title], ["Version", String(i.version || 1)], ["Batch", i.batch || ""], ["Uploaded", i.created_at ? dayLabel(i.created_at) : ""],
      ["Date", i.post_date ? dayLabel(i.post_date) + (i.date_confirmed === false ? " (to be confirmed)" : "") : ""], ["Subject", i.subject || ""],
      ["Our check", isCheck(i) ? "Yes, a proof or check we made for ourselves" : ""], ["Why dropped", i.dropped_why || ""]].filter((r) => r[1]);
    return E("section", { class: "r4c-box r4c-details r4tv-info", "aria-label": "More info" }, E("h3", { text: "More info" }), E("dl", { class: "r4c-dl" }, ...rows.flatMap(([a, b]) => [E("dt", { text: a }), E("dd", { text: b })])));
  }
  function detailsBox(i) {
    const s = cs6(i);
    const rows = [["Stage", LABEL[s] + (i.noclient ? " (skipped the client)" : "")], ["Goes out", dateOf(i) ? dayLabel(dateOf(i)) + (i.date_confirmed === false && !i.scheduled_for ? ", to be confirmed" : "") : ""],
      ["Type", typeOfW(i)], ["How it runs", PROMO[i.promo] || ""], ["Campaign", i.campaign || ""], ["For", i.audience === "team" ? "Team only" : "The client"]].filter((r) => r[1]);
    return E("section", { class: "r4c-box r4c-details", "aria-label": "Details" }, E("dl", { class: "r4c-dl" }, ...rows.flatMap(([a, b]) => [E("dt", { text: a }), E("dd", { text: b })])));
  }
  function captionBox(i) {
    const c = TV.card;
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
  async function copyLink(i, b) {
    const u = `${CLIENT_URL}?c=${encodeURIComponent(S.code)}&p=${i.id.slice(0, 8)}`;
    const lab = b && b.querySelector("span:last-child"); const was = lab ? lab.textContent : "";
    const ok = await copyText(u);
    if (lab) { lab.textContent = ok ? "Copied" : was; setTimeout(() => { if (lab.isConnected) lab.textContent = was; }, 2500); }
    if (i.audience === "team") say("Copied, but this is a team-only piece: the client will never see it.");
    else if (!["needs_client", "approved"].includes(i.stage)) say("Copied, but the client won't see this piece until you move it to client review.");
    else say(ok ? "Link copied." : "");
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

  window.R4TV = {
    on: teamOn, go, content, open: (id, o) => open(id, o), close: () => closeCard(),
    state: () => ({ page: R4.page, tab: S.tab, cs: Object.assign({}, TV.cs), card: TV.card ? { id: TV.card.id, run: TV.card.run.length, mode: TV.card.mode, flash: TV.card.flash } : null, loaded: loaded() }),
  };
  // the page may already be drawn as the team (a reload): draw once more now that this file is here
  setTimeout(() => { try { if (teamOn()) { renderApp(); renderSideNav(); } } catch (e) {} }, 0);
})();
