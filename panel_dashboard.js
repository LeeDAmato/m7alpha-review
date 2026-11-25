/* Client Studio: Dashboard (builder 1 of 4, 25 Nov 2026; BRIEF_Claude_four_new_pages_2026-11-25.md, Page 1, and
   HELPERS_CONTRACT_new_pages_2026-11-25.md).
   - For a client (a personal link with the Dashboard switched on): what waits on them, each a number that opens the
     right page (pieces to review, questions and walk-throughs, tasks, documents); what goes out in the next two weeks
     with each piece's stage; the last few things published or approved; three or four results figures when the
     Reports page offers them (window.M7Reports.summary) and new enquiries when the Leads page does (window.M7Leads.count).
   - For the team (signed in): first, one line per client: how long things have waited on the client and what waits on
     us. Tap a client to see that client's dashboard underneath, as the client would, plus what waits on us.
   Reads only, through two database functions (setup_36_dashboard.sql): dashboard_get, which starts with the page gate
   from setup_32 (a shared link gets "not_allowed" and nothing else), and dashboard_team (signed-in editors only).
   One global: window.M7Dash. Classes start with dh-. Browser keys start with m7r-dh:. */
(function () {
  "use strict";
  const st = { one: null, team: null, pick: null, busy: 0, onlyBusy: false, allRows: false };

  // ---------- small helpers ----------
  const skey = (k) => "m7r-dh:" + k;
  const sget = (k, d) => { try { const v = localStorage.getItem(skey(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const sset = (k, v) => { try { localStorage.setItem(skey(k), JSON.stringify(v)); } catch (e) {} };
  async function call(ctx, fn, args) {
    const r = await ctx.rpc(fn, args);
    if (r && r.error) { const e = new Error(r.error); e.code = r.error; throw e; }
    return r;
  }
  const say = (ctx, t) => { try { ctx.toast(t); } catch (e) {} };
  const go = (ctx, page) => { try { ctx.open(page); } catch (e) {} };
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  function today() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  const dayDiff = (d) => Math.round((new Date(d + "T00:00:00") - today()) / 864e5);
  function dayName(d) {
    const n = dayDiff(d), dt = new Date(d + "T12:00:00");
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    return dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  }
  // how long ago, in plain words: "today", "yesterday", "5 days", "3 weeks"
  function since(iso) {
    if (!iso) return "";
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
    if (days < 1) return "today";
    if (days === 1) return "1 day";
    if (days < 14) return days + " days";
    if (days < 61) return Math.round(days / 7) + " weeks";
    return Math.round(days / 30) + " months";
  }
  const sinceDays = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : 0);
  function ago(iso) {
    const s = since(iso);
    return s === "today" ? "today" : s === "1 day" ? "yesterday" : s + " ago";
  }
  const clock = (iso) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "";
  function hello(ctx) {
    const hr = new Date().getHours(), n = firstName(ctx.person?.name || (typeof ctx.visitorName === "function" ? ctx.visitorName() : ""));
    return (hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening") + (n ? ", " + n : "");
  }
  // a piece's stage in plain words. Visitors get All work's words (waiting / approved / changing); the team the full stage.
  const STAGE = {
    waiting: ["Waiting for your answer", "wait"], approved: ["Approved", "ok"], changing: ["Being changed", "chg"],
    needs_client: ["With the client", "wait"], needs_lee: ["With Lee to check", "lee"], with_team: ["Being changed", "chg"],
    lee_approved: ["Approved, kept with us", "ok"], dropped: ["Dropped", "off"],
  };
  const WHEN = { published: "Published", scheduled: "Scheduled", planned: "Date fixed", tentative: "Date not fixed yet" };
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';

  // ---------- the parts of one client's dashboard ----------
  function tile(ctx, n, label, sub, onclick, extra) {
    const h = ctx.h, zero = !n;
    return h("button", { type: "button", class: "dh-tile" + (zero ? " dh-zero" : "") + (extra || ""), onclick, "aria-label": `${n} ${label}. ${sub}` },
      h("span", { class: "dh-num", text: String(n) }),
      h("span", { class: "dh-tl" }, h("b", { text: label }), h("small", { text: sub })),
      h("i", { class: "dh-go", html: ARROW }));
  }
  function waitingSection(ctx, d, isTeam) {
    const h = ctx.h, w = d.waiting || {}, you = isTeam ? "the client" : "you";
    const qs = (w.questions || 0) + (w.walkthroughs || 0);
    const total = (w.pieces || 0) + qs + (w.tasks || 0) + (w.documents || 0);
    const tiles = [
      tile(ctx, w.pieces || 0, w.pieces === 1 ? "piece to review" : "pieces to review", w.pieces ? "Posts, adverts and videos" : "Nothing new to look at", () => go(ctx, "review")),
      tile(ctx, qs, qs === 1 ? "question to answer" : "questions to answer",
        w.walkthroughs ? plural(w.walkthroughs, "walk-through", "walk-throughs") + (w.questions ? " and " + plural(w.questions, "question", "questions") : "") : qs ? "Quick answers we need" : "No questions right now",
        () => go(ctx, w.walkthroughs && !w.questions ? "docs" : "review")),
      tile(ctx, w.tasks || 0, w.tasks === 1 ? "task on " + (isTeam ? "their" : "your") + " side" : "tasks on " + (isTeam ? "their" : "your") + " side",
        w.tasks_late ? plural(w.tasks_late, "is late", "are late") : w.tasks_yours ? plural(w.tasks_yours, "is for you", "are for you") : w.tasks ? "Things we need from " + you : "Nothing waits on " + you,
        () => go(ctx, "tasks"), w.tasks_late ? " dh-late" : ""),
      tile(ctx, w.documents || 0, w.documents === 1 ? "document to read" : "documents to read", w.documents ? "Plans, proposals and reports" : "Nothing to read", () => go(ctx, "docs")),
    ];
    const head = h("div", { class: "dh-sechead" }, h("h2", { text: isTeam ? "Waiting for the client" : "Waiting for you" }),
      total ? h("span", { class: "dh-n", text: String(total) }) : null);
    const line = total && w.since ? h("p", { class: "dh-sub" + (sinceDays(w.since) > 7 ? " dh-old" : ""), text: "The oldest has waited " + since(w.since) + "." })
      : !total ? h("p", { class: "dh-sub", text: isTeam ? "Nothing waits on the client right now." : "Nothing needs you right now. Thank you!" }) : null;
    return h("section", { class: "dh-sec", "data-part": "waiting" }, head, line, h("div", { class: "dh-tiles" }, tiles));
  }
  function comingSection(ctx, d, isTeam) {
    const h = ctx.h, list = d.coming || [];
    const byDay = new Map();
    list.forEach((p) => { if (!byDay.has(p.day)) byDay.set(p.day, []); byDay.get(p.day).push(p); });
    const rows = [...byDay.entries()].map(([day, ps]) => h("div", { class: "dh-day" },
      h("div", { class: "dh-dayname" + (dayDiff(day) === 0 ? " dh-today" : ""), text: dayName(day) }),
      h("div", { class: "dh-daylist" }, ps.map((p) => pieceRow(ctx, p, isTeam)))));
    const more = (d.coming_total || 0) > list.length ? h("p", { class: "dh-sub", text: `And ${d.coming_total - list.length} more.` }) : null;
    return h("section", { class: "dh-sec", "data-part": "coming" },
      h("div", { class: "dh-sechead" }, h("h2", { text: "Coming up" }), h("span", { class: "dh-quiet", text: "Next two weeks" })),
      h("div", { class: "dh-box" }, rows.length ? rows : h("p", { class: "dh-empty", text: "Nothing is planned to go out in the next two weeks yet." }), more),
      h("button", { type: "button", class: "dh-link", text: isTeam ? "See all their work" : "See all your work", onclick: () => go(ctx, "work") }));
  }
  function thumbOf(ctx, p) {
    const h = ctx.h;
    if (p.thumb) { try { return h("span", { class: "dh-th" }, h("img", { src: ctx.mediaUrl(p.thumb), alt: "", decoding: "async" })); } catch (e) {} }
    return h("span", { class: "dh-th dh-thnone", text: "Aa" });
  }
  function pieceRow(ctx, p, isTeam) {
    const h = ctx.h, sg = STAGE[p.stage] || [p.stage || "", "off"];
    const when = p.when === "scheduled" && p.time ? "Scheduled, " + p.time : p.when === "published" && p.time ? "Published, " + p.time : WHEN[p.when] || "";
    return h("div", { class: "dh-piece", "data-id": p.id },
      thumbOf(ctx, p),
      h("span", { class: "dh-pt" }, h("b", { text: p.title || "Untitled" }),
        h("small", {}, when, isTeam && p.audience === "team" ? h("span", { class: "dh-tag", text: "Team only" }) : null)),
      sg[0] ? h("span", { class: "dh-stage dh-s-" + sg[1], text: sg[0] }) : null);
  }
  function happenedSection(ctx, d) {
    const h = ctx.h, list = d.happened || [];
    return h("section", { class: "dh-sec", "data-part": "happened" },
      h("div", { class: "dh-sechead" }, h("h2", { text: "Just happened" })),
      h("div", { class: "dh-box" }, list.length ? list.map((p) => h("div", { class: "dh-piece", "data-id": p.id }, thumbOf(ctx, p),
        h("span", { class: "dh-pt" }, h("b", { text: p.title || "Untitled" }), h("small", { text: (p.what === "published" ? "Published " : "Approved ") + ago(p.at) })),
        h("span", { class: "dh-stage dh-s-" + (p.what === "published" ? "pub" : "ok"), text: p.what === "published" ? "Published" : "Approved" })))
        : h("p", { class: "dh-empty", text: "Nothing published or approved in the last 30 days." })));
  }
  function oursSection(ctx, d) {
    const h = ctx.h, o = d.ours; if (!o) return null;
    const cell = (n, label, sub, cls) => h("div", { class: "dh-mini" + (cls || "") }, h("span", { class: "dh-num", text: String(n) }), h("span", { class: "dh-tl" }, h("b", { text: label }), sub ? h("small", { text: sub }) : null));
    return h("section", { class: "dh-sec", "data-part": "ours" },
      h("div", { class: "dh-sechead" }, h("h2", { text: "Waiting on us" }), h("span", { class: "dh-quiet", text: "Only the team sees this" })),
      h("div", { class: "dh-minis" },
        cell(o.needs_lee || 0, "for Lee to check", o.needs_lee_since && o.needs_lee ? "oldest " + since(o.needs_lee_since) : ""),
        cell(o.changing || 0, "being changed", "the client asked for changes"),
        cell(o.held || 0, "approved, kept with us", "not sent to the client"),
        cell(o.tasks || 0, o.tasks === 1 ? "task for us" : "tasks for us", o.tasks_late ? plural(o.tasks_late, "is late", "are late") : "", o.tasks_late ? " dh-late" : "")));
  }
  // Results and enquiries come from the Reports and Leads pages, only when they are there and say this person may see them
  async function extras(ctx) {
    const out = { results: null, leads: null };
    try { if (window.M7Reports && typeof window.M7Reports.summary === "function") out.results = await window.M7Reports.summary(ctx); } catch (e) { out.results = null; }
    try { if (window.M7Leads && typeof window.M7Leads.count === "function") out.leads = await window.M7Leads.count(ctx); } catch (e) { out.leads = null; }
    return out;
  }
  function figuresOf(r) {
    if (!r) return [];
    const list = Array.isArray(r) ? r : Array.isArray(r.figures) ? r.figures : [];
    return list.filter((f) => f && f.label != null && f.value != null).slice(0, 4);
  }
  function resultsSection(ctx, r) {
    const h = ctx.h, figs = figuresOf(r);
    if (!figs.length) return null;
    const upd = r && !Array.isArray(r) && r.updated_at ? "Updated " + clock(r.updated_at) + ". Figures can still change for a day or two." : "";
    return h("section", { class: "dh-sec", "data-part": "results" },
      h("div", { class: "dh-sechead" }, h("h2", { text: "Results at a glance" }), r && r.period ? h("span", { class: "dh-quiet", text: String(r.period) }) : null),
      h("div", { class: "dh-figs" }, figs.map((f) => h("div", { class: "dh-fig" }, h("span", { class: "dh-fv", text: String(f.value) }), h("b", { text: String(f.label) }), f.note ? h("small", { text: String(f.note) }) : null))),
      upd ? h("p", { class: "dh-small", text: upd }) : null,
      h("button", { type: "button", class: "dh-link", text: "See the full report", onclick: () => go(ctx, "reports") }));
  }
  function leadsTile(ctx, l) {
    if (l == null) return null;
    const n = typeof l === "number" ? l : Number(l.new ?? l.count ?? NaN);
    if (!Number.isFinite(n)) return null;
    const sub = typeof l === "object" && l.label ? String(l.label) : n ? "Since you last looked" : "No new enquiries";
    return ctx.h("section", { class: "dh-sec", "data-part": "leads" },
      tile(ctx, n, n === 1 ? "new enquiry" : "new enquiries", sub, () => go(ctx, "leads"), " dh-wide"));
  }
  function drawOne(host, ctx, d, ex, isTeam) {
    const h = ctx.h;
    const res = resultsSection(ctx, ex.results), leads = leadsTile(ctx, ex.leads);
    // replaceChildren() would print a missing part as the word "null", so the parts left out are dropped first
    host.replaceChildren(...[
      waitingSection(ctx, d, isTeam),
      leads,
      isTeam ? oursSection(ctx, d) : null,
      h("div", { class: "dh-cols" }, comingSection(ctx, d, isTeam), h("div", { class: "dh-stack" }, ...[res, happenedSection(ctx, d)].filter(Boolean))),
      h("p", { class: "dh-small dh-upd", text: "Updated " + clock(d.updated_at || new Date().toISOString()) + "." })].filter(Boolean));
  }

  // ---------- the client's page ----------
  function locked(el, ctx, msg) {
    const h = ctx.h;
    el.replaceChildren(h("div", { class: "dh-page" }, h("div", { class: "dh-box dh-gate" }, h("p", { class: "dh-gatep", text: msg }))));
  }
  async function renderClient(el, ctx) {
    const h = ctx.h;
    if (!ctx.code) return locked(el, ctx, "Open your personal link to see this. Lost it? Ask M7Alpha.");
    el.replaceChildren(h("div", { class: "dh-page" }, h("p", { class: "dh-sub", text: "Loading your dashboard…" })));
    let d;
    try { d = await call(ctx, "dashboard_get", { p_token: ctx.token || null, p_client_code: ctx.code }); }
    catch (e) {
      st.one = null;
      if (e.code === "not_allowed") return locked(el, ctx, "This page isn't open on this link. Ask M7Alpha if you'd like it.");
      el.replaceChildren(h("div", { class: "dh-page" }, h("div", { class: "dh-box dh-gate" },
        h("p", { class: "dh-gatep", text: "Your dashboard didn't load. Please check your connection and try again." }),
        h("button", { type: "button", class: "dh-btn dh-primary", text: "Try again", onclick: () => renderClient(el, ctx) }))));
      return;
    }
    st.one = d;
    const ex = await extras(ctx);
    const body = h("div", { class: "dh-body" });
    el.replaceChildren(h("div", { class: "dh-page" },
      h("div", { class: "dh-head" }, h("div", {}, h("p", { class: "dh-hi", text: hello(ctx) }), h("h1", { class: "dh-h1", text: "Your dashboard" }),
        h("p", { class: "dh-lede", text: "What needs you, and what's happening for " + (d.client?.name || ctx.clientName || "you") + "." }))),
      body));
    drawOne(body, ctx, d, ex, false);
  }

  // ---------- our side: every client, then one ----------
  function waitWords(c) {
    if (!c.waiting_client) return "Nothing";
    return plural(c.waiting_client, "piece", "pieces") + (c.docs_waiting ? ` (${c.docs_waiting} doc${c.docs_waiting === 1 ? "" : "s"})` : "");
  }
  function teamTable(ctx, d, onPick) {
    const h = ctx.h, all = d.clients || [];
    const busy = (c) => c.waiting_client || c.client_tasks || c.needs_lee || c.changing || c.held || c.our_tasks;
    const open = st.onlyBusy ? all.filter(busy) : all;
    // on a phone the first five (longest wait first), so the chosen client's dashboard isn't 17 cards down
    const cut = !st.allRows && ctx.phone() && open.length > 6, list = cut ? open.slice(0, 5) : open;
    const age = (iso) => { const n = sinceDays(iso); return h("span", { class: "dh-age" + (n > 14 ? " dh-a3" : n > 7 ? " dh-a2" : ""), text: iso ? since(iso) : "" }); };
    const ourBits = (c) => [c.needs_lee ? `${c.needs_lee} for Lee` : null, c.changing ? `${c.changing} being changed` : null, c.held ? `${c.held} kept with us` : null].filter(Boolean).join(" · ") || "Nothing";
    const row = (c) => h("button", { type: "button", class: "dh-trow" + (st.pick === c.code ? " dh-on" : ""), "data-code": c.code, onclick: () => onPick(c.code, false, true),
        "aria-pressed": String(st.pick === c.code) },
      h("span", { class: "dh-tc dh-cn" }, h("b", { text: c.name })),
      h("span", { class: "dh-tc", "data-h": "Waiting on them" }, h("span", { class: "dh-tv", text: waitWords(c) }), c.waiting_client ? age(c.client_since) : null),
      h("span", { class: "dh-tc", "data-h": "Their tasks" }, h("span", { class: "dh-tv", text: c.client_tasks ? String(c.client_tasks) : "None" }), c.client_tasks_late ? h("span", { class: "dh-age dh-a3", text: c.client_tasks_late + " late" }) : null),
      h("span", { class: "dh-tc", "data-h": "Waiting on us" }, h("span", { class: "dh-tv", text: ourBits(c) }), c.needs_lee ? age(c.needs_lee_since) : null),
      h("span", { class: "dh-tc", "data-h": "Our tasks" }, h("span", { class: "dh-tv", text: c.our_tasks ? String(c.our_tasks) : "None" }), c.our_tasks_late ? h("span", { class: "dh-age dh-a3", text: c.our_tasks_late + " late" }) : null),
      h("span", { class: "dh-tc", "data-h": "Next 2 weeks" }, h("span", { class: "dh-tv", text: c.next_two_weeks ? plural(c.next_two_weeks, "piece", "pieces") : "Nothing" })));
    const tot = all.reduce((a, c) => ({ w: a.w + (c.waiting_client || 0), l: a.l + (c.needs_lee || 0), t: a.t + (c.our_tasks_late || 0) }), { w: 0, l: 0, t: 0 });
    const old = all.filter((c) => c.waiting_client && sinceDays(c.client_since) > 7).length;
    return h("section", { class: "dh-sec", "data-part": "team" },
      h("div", { class: "dh-sechead" }, h("h2", { text: "Every client" }),
        h("label", { class: "dh-check" }, h("input", { type: "checkbox", checked: st.onlyBusy, onchange: (e) => { st.onlyBusy = e.target.checked; sset("busy", st.onlyBusy); onPick(st.pick, true); } }), " Only clients with something open")),
      h("p", { class: "dh-sub", text: `${plural(tot.w, "piece waits", "pieces wait")} on clients${old ? `, ${old} ${old === 1 ? "client" : "clients"} for more than a week` : ""}. ${plural(tot.l, "piece waits", "pieces wait")} for Lee${tot.t ? `, ${plural(tot.t, "task of ours is", "tasks of ours are")} late` : ""}.` }),
      h("div", { class: "dh-table", role: "table" },
        h("div", { class: "dh-thead", role: "row" }, ["Client", "Waiting on them", "Their tasks", "Waiting on us", "Our tasks", "Next 2 weeks"].map((t) => h("span", { class: "dh-tc", text: t }))),
        list.length ? list.map(row) : h("p", { class: "dh-empty", text: "No client has anything open." }),
        cut ? h("button", { type: "button", class: "dh-more", text: `Show all ${open.length} clients`, onclick: () => { st.allRows = true; onPick(st.pick, true); } }) : null));
  }
  async function renderTeam(el, ctx) {
    const h = ctx.h;
    st.onlyBusy = sget("busy", false);
    el.replaceChildren(h("div", { class: "dh-page dh-teamside" }, h("p", { class: "dh-sub", text: "Loading every client…" })));
    try { st.team = await call(ctx, "dashboard_team", {}); }
    catch (e) {
      el.replaceChildren(h("div", { class: "dh-page" }, h("div", { class: "dh-box dh-gate" },
        h("p", { class: "dh-gatep", text: e.code === "not_allowed" ? "Only the M7Alpha team can see this page." : "The dashboard didn't load: " + (e.message || e) }),
        e.code === "not_allowed" ? null : h("button", { type: "button", class: "dh-btn dh-primary", text: "Try again", onclick: () => renderTeam(el, ctx) }))));
      return;
    }
    const clients = st.team.clients || [];
    if (!st.pick || !clients.some((c) => c.code === st.pick)) st.pick = (clients.find((c) => c.code === ctx.code) || clients.find((c) => c.waiting_client) || clients[0] || {}).code || null;
    const tableSlot = h("div"), oneHead = h("div", { class: "dh-onehead" }), oneBody = h("div", { class: "dh-body" });
    const pick = async (code, redrawOnly, tapped) => {
      st.pick = code;
      tableSlot.replaceChildren(teamTable(ctx, st.team, pick));
      if (redrawOnly) return;
      const c = clients.find((x) => x.code === code);
      if (!c) { oneHead.replaceChildren(); oneBody.replaceChildren(); return; }
      oneHead.replaceChildren(h("h2", { class: "dh-h2", text: c.name }), h("p", { class: "dh-sub", text: "As " + c.name + " sees it, plus what waits on us." }));
      oneBody.replaceChildren(h("p", { class: "dh-sub", text: "Loading " + c.name + "…" }));
      if (tapped && ctx.phone()) { try { oneHead.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {} }
      const n = ++st.busy;
      try {
        const d = await call(ctx, "dashboard_get", { p_token: null, p_client_code: code });
        if (n !== st.busy) return;
        st.one = d;
        const cctx = Object.create(ctx, { code: { value: code }, clientName: { value: c.name } });     // ctx's own code and name are read-only getters
        drawOne(oneBody, cctx, d, await extras(cctx), true);
      } catch (e) { if (n === st.busy) oneBody.replaceChildren(h("p", { class: "dh-sub", text: c.name + " didn't load: " + (e.message || e) })); }
    };
    el.replaceChildren(h("div", { class: "dh-page dh-teamside" },
      h("div", { class: "dh-head" }, h("div", {}, h("h1", { class: "dh-h1", text: "Dashboard" }),
        h("p", { class: "dh-lede", text: "What waits on each client and what waits on us. Clients don't see this page yet." }))),
      tableSlot,
      h("section", { class: "dh-one" }, oneHead, oneBody)));
    await pick(st.pick);
  }

  // ---------- the page, and the registration ----------
  function renderPage(el, ctx) {
    if (ctx.team && !ctx.clientView) return renderTeam(el, ctx);
    return renderClient(el, ctx);
  }
  window.M7Dash = { _state: st, since };
  (window.StudioPanelsQueue ||= []).push({
    name: "dashboard",
    type: "Dashboard",
    page: { label: "Dashboard", needsPerson: true, teamOnly: true, render: renderPage },
  });
})();
