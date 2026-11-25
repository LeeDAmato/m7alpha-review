/* Client Studio: Leads (builder 3, 25 Nov 2026; BRIEF_Claude_four_new_pages_2026-11-25.md, Page 3;
   HELPERS_CONTRACT_new_pages_2026-11-25.md). The page that is to replace the clients' lead sheets.
   - Enquiries newest first, with search, filters (outcome, source, course or ad, date), sortable columns; cards on a phone.
   - The client's own fields edited in place (Outcome from the sheet's list, Notes, Last contacted where the sheet has it),
     each change recorded with who and when; an undo history; add by hand; mark a duplicate.
   - Older enquiries (Haven & Keys) and Archive, with the sheets' rules and a way back.
   - Summary and Courses / Year groups figures, as the sheets give them, with the client's typed boxes.
   - Download as Excel in the sheet's layout; Copy phone, Call and WhatsApp.
   - Reminders: "Waiting over 3 days", "No outcome yet".
   Every read and write goes through database functions that check the link first (setup_34_leads.sql, gate setup_32).
   One global: window.M7Leads (count(ctx) for the Dashboard). Classes start with ld-. Browser keys start with m7r-ld:. */
(function () {
  "use strict";
  const st = { data: null, ctx: null, el: null, tab: "open", q: "", f: { outcome: "", source: "", topic: "", date: "", from: "", to: "" },
    sort: { key: "@date", dir: -1 }, limit: 100, open: new Set(), history: null, adding: false, undo: null, remind: "", allCols: false };

  // ---------- small helpers ----------
  const skey = (k) => "m7r-ld:" + k;
  const sget = (k, d) => { try { const v = localStorage.getItem(skey(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const sset = (k, v) => { try { localStorage.setItem(skey(k), JSON.stringify(v)); } catch (e) {} };
  const say = (t) => { try { st.ctx.toast(t); } catch (e) {} };
  async function call(fn, args) {
    const ctx = st.ctx;
    const r = await ctx.rpc(fn, Object.assign({ p_token: ctx.token || null, p_client_code: ctx.code }, args || {}));
    if (r && r.error) { const e = new Error(r.error); e.code = r.error; throw e; }
    return r;
  }
  const sorry = (e) => say(e && e.code === "not_allowed" ? "This link no longer opens your leads. Please ask M7Alpha."
    : e && e.code === "bad_value" ? "That value isn't on the list." : "That didn't save. Please check your connection and try again.");
  const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  const dayOf = (iso) => { if (!iso) return null; const d = new Date(iso); return isNaN(d) ? null : d; };
  const daysSince = (iso) => { const d = dayOf(iso); if (!d) return null; const x = new Date(d); x.setHours(0, 0, 0, 0); return Math.round((today() - x) / 864e5); };
  const fmtDate = (iso, withYear) => { const d = dayOf(iso); if (!d) return ""; return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...((withYear || d.getFullYear() !== new Date().getFullYear()) ? { year: "numeric" } : {}) }); };
  const fmtWhen = (iso) => { const d = dayOf(iso); return d ? d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""; };
  const whenOrDay = (iso) => { const d = dayOf(iso); if (!d) return ""; return d.getHours() || d.getMinutes() ? fmtWhen(iso) : fmtDate(iso, true); };
  const money = (n) => (n == null || n === "" || isNaN(n) ? "" : "€" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const num = (v) => { const n = Number(v); return v === null || v === undefined || v === "" || isNaN(n) ? null : n; };
  const monthKey = (iso) => { const d = dayOf(iso); return d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") : null; };
  const monthName = (k) => { if (!k) return ""; const [y, m] = k.split("-"); return new Date(+y, +m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }); };
  const phoneDigits = (p) => { let d = String(p || "").replace(/^p:/i, "").replace(/[^0-9]/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.length === 8 && /^[279]/.test(d)) d = "356" + d; return d.length >= 8 && d.length <= 15 ? d : ""; };
  const isTest = (l) => /m7alpha test/i.test(l.name || "");
  const S = () => st.data.setup;
  const pending = (l) => !l.outcome || l.outcome === "Pending";
  const isFinal = (l) => (S().final_outcomes || []).includes(l.outcome);
  const val = (l, key) => {
    switch (key) {
      case "@outcome": return l.outcome || ""; case "@notes": return l.notes || ""; case "@last_contacted": return l.last_contacted || "";
      case "@name": return l.name || ""; case "@phone": return l.phone || ""; case "@email": return l.email || "";
      case "@contact": return l.phone || l.email || "";
      case "@date": return l.at || ""; case "@latest": return l.latest || ""; case "@id": return l.sid || "";
      case "@days": { const d = daysSince(l.at); return d == null ? "" : d; }
      case "@attention": return attention(l);
      default: { const v = (l.sys || {})[key]; return v == null ? "" : v; }
    }
  };
  // The sheet's "Needs attention", plus the two reminders
  function attention(l) {
    if (l.dup_of) return "Duplicate";
    if (l.place === "archive") return "";
    const d = daysSince(l.at);
    if (pending(l) && d != null && d >= 3) return "Waiting " + d + " days";
    if (!l.outcome) return "No outcome yet";
    return "";
  }
  const ICON = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 10c0 2.5 2.5 5 5 5l1.2-1.2 2 1-.5 1.4c-3.6.6-8.5-4.3-7.9-7.9L10.2 8l1 2z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  };

  // ---------- loading ----------
  async function load() {
    const r = await call("leads_get", {});
    st.data = r;
    (r.leads || []).forEach((l) => { l.subs = (r.subs || {})[l.id] || 0; });
    return r;
  }
  function render(el, ctx) {
    st.el = el; st.ctx = ctx; const h = ctx.h;
    st.tab = sget("tab:" + ctx.code, "open");
    if (!ctx.code) { el.replaceChildren(h("div", { class: "ld-page" }, h("p", { class: "ld-gatep", text: "Open your personal link to see this. Lost it? Ask M7Alpha." }))); return; }
    el.replaceChildren(h("div", { class: "ld-page" }, h("p", { class: "ld-hint", text: "Loading your enquiries…" })));
    load().then(() => draw(), (e) => {
      el.replaceChildren(h("div", { class: "ld-page" }, h("div", { class: "ld-box ld-gate" },
        h("p", { class: "ld-gatep", text: e.code === "not_allowed" ? "Leads isn't switched on for this link. Please ask M7Alpha." : "Your enquiries didn't load. Please check your connection and try again." }),
        e.code === "not_allowed" ? null : h("button", { type: "button", class: "ld-btn ld-primary", text: "Try again", onclick: () => render(el, ctx) }))));
    });
  }

  // ---------- the page ----------
  function lists() {
    const all = st.data.leads || [];
    return { open: all.filter((l) => l.place === "open"), older: all.filter((l) => l.place === "older"), archive: all.filter((l) => l.place === "archive"), all };
  }
  function draw() {
    const ctx = st.ctx, h = ctx.h, d = st.data;
    if (!d.setup) {
      st.el.replaceChildren(h("div", { class: "ld-page" }, head(), h("div", { class: "ld-box" }, h("p", { class: "ld-gatep", text: "No lead sheet has been moved here yet for this client." }))));
      return;
    }
    const L = lists(), s = S();
    const counted = L.all.filter((l) => !l.dup_of && !isTest(l));
    const waiting = counted.filter((l) => l.place !== "archive" && pending(l) && (daysSince(l.at) ?? 0) >= 3).length;
    const noOut = counted.filter((l) => l.place !== "archive" && pending(l)).length;
    const newWeek = counted.filter((l) => (daysSince(l.at) ?? 99) < 7).length;
    const tabs = [["open", s.open_label, L.open.length]];
    if (s.older_label) tabs.push(["older", s.older_label, L.older.length]);
    tabs.push(["archive", "Archive", L.archive.length], ["summary", "Summary"]);
    if (s.summary_kind === "ff") tabs.push(["courses", "Courses"]);
    if (s.summary_kind === "newark") tabs.push(["courses", "Year groups"]);
    tabs.push(["changes", "Changes"]);
    if (!tabs.some((t) => t[0] === st.tab)) st.tab = "open";
    const tabbar = h("div", { class: "ld-tabs", role: "tablist" }, tabs.map(([k, label, n]) => h("button", { type: "button", role: "tab", class: "ld-tab",
      "aria-selected": String(st.tab === k), onclick: () => { st.tab = k; sset("tab:" + ctx.code, k); st.limit = 100; draw(); } }, label, n != null ? h("span", { class: "ld-n", text: String(n) }) : null)));
    const remind = h("div", { class: "ld-remind" },
      chip("waiting", "Waiting over 3 days", waiting, "Pending, and came in 3 or more days ago"),
      chip("noout", "No outcome yet", noOut, "Pending or blank, on the open lists"),
      h("span", { class: "ld-newweek" }, h("b", { text: String(newWeek) }), " new in the last 7 days"));
    let body;
    if (st.tab === "summary") body = summary();
    else if (st.tab === "courses") body = courses();
    else if (st.tab === "changes") body = changes();
    else body = listView(L[st.tab] || []);
    const page = h("div", { class: "ld-page" }, head(), remind, tabbar, body, st.ctx.team ? teamNote() : null);
    st.el.replaceChildren(page);
    if (st.undo) undoBar();
  }
  function chip(k, label, n, title) {
    return st.ctx.h("button", { type: "button", class: "ld-chip" + (n ? " ld-warm" : ""), "aria-pressed": String(st.remind === k), title,
      onclick: () => { st.remind = st.remind === k ? "" : k; if (st.tab !== "open" && st.tab !== "older") st.tab = "open"; st.limit = 100; draw(); } },
      st.ctx.h("b", { text: String(n) }), " " + label);
  }
  function head() {
    const ctx = st.ctx, h = ctx.h, s = st.data.setup;
    const name = ctx.clientName || (ctx.clients || []).find((c) => (c.code || c.link_code) === ctx.code)?.name || "";
    return h("div", { class: "ld-head" },
      h("div", {}, h("h1", { class: "ld-h1", text: "Leads" }),
        h("p", { class: "ld-lede", text: s ? "Your enquiries, newest first. Pick an Outcome and add Notes here; we add new enquiries as they come in." : (name ? name + ": " : "") + "enquiries from your ads." })),
      s ? h("div", { class: "ld-row" },
        h("button", { type: "button", class: "ld-btn", onclick: () => addForm() }, h("i", { class: "ld-ic", html: ICON.plus }), "Add an enquiry"),
        h("button", { type: "button", class: "ld-btn", onclick: () => download() }, h("i", { class: "ld-ic", html: ICON.down }), h("span", { class: "ld-long", text: "Download as Excel" }), h("span", { class: "ld-short", text: "Excel" }))) : null);
  }
  function teamNote() {
    const h = st.ctx.h, s = st.data.setup;
    return h("div", { class: "ld-team" },
      h("p", {}, h("b", { text: "Only M7Alpha sees this box. " }), "Copied from the client's sheet: ",
        s.sheet_url ? h("a", { href: s.sheet_url, target: "_blank", rel: "noopener", text: "open the sheet" }) : "no sheet link", ". ",
        "Delete after: ", h("b", { text: s.delete_after_days ? s.delete_after_days + " days" : "not set" }), " (", s.delete_after_note || "", ")"),
      s.copy_note ? h("p", { class: "ld-copynote" }, h("b", { text: s.copy_note })) : null);
  }

  // ---------- the list ----------
  function filtered(rows) {
    const s = S(), q = st.q.trim().toLowerCase(), f = st.f;
    const now = today();
    return rows.filter((l) => {
      if (st.remind === "waiting" && !(pending(l) && (daysSince(l.at) ?? 0) >= 3 && !l.dup_of)) return false;
      if (st.remind === "noout" && !(pending(l) && !l.dup_of)) return false;
      if (f.outcome) { if (f.outcome === "(blank)" ? l.outcome : (l.outcome || "") !== f.outcome) return false; }
      if (f.source && String(val(l, s.source_key)) !== f.source) return false;
      if (f.topic && !String(val(l, s.topic_key)).split("\n").includes(f.topic)) return false;
      if (f.date) {
        const d = dayOf(l.at); if (!d) return false;
        const x = new Date(d); x.setHours(0, 0, 0, 0);
        if (f.date === "7" && (now - x) / 864e5 > 6) return false;
        if (f.date === "30" && (now - x) / 864e5 > 29) return false;
        if (f.date === "month" && (x.getMonth() !== now.getMonth() || x.getFullYear() !== now.getFullYear())) return false;
        if (f.date === "lastmonth") { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); if (x.getMonth() !== lm.getMonth() || x.getFullYear() !== lm.getFullYear()) return false; }
        if (f.date === "range") { if (f.from && x < new Date(f.from + "T00:00:00")) return false; if (f.to && x > new Date(f.to + "T00:00:00")) return false; }
      }
      if (q) {
        const hay = [l.name, l.phone, l.email, l.notes, l.sid, ...Object.values(l.sys || {})].join(" ").toLowerCase();
        if (!hay.includes(q) && !(phoneDigits(q) && phoneDigits(l.phone).includes(phoneDigits(q)))) return false;
      }
      return true;
    });
  }
  function sorted(rows) {
    const { key, dir } = st.sort;
    const v = (l) => { const x = val(l, key); if (key === "@date" || key === "@latest" || key === "@last_contacted") return x ? new Date(x).getTime() : -Infinity; return typeof x === "number" ? x : String(x).toLowerCase(); };
    return rows.slice().sort((a, b) => { const A = v(a), B = v(b); if (A === B) return (new Date(b.at || 0) - new Date(a.at || 0)); return (A > B ? 1 : -1) * dir; });
  }
  function shownCols() {
    const s = S();
    let cols = (s.columns || []).filter((c) => c.show || st.allCols);
    if (!cols.some((c) => c.key === "@attention")) cols = cols.concat([{ key: "@attention", label: "Needs attention", group: "auto", show: true }]);
    // on screen, phone and email share one column (phone with its buttons, email under it); the download keeps both
    const pi = cols.findIndex((c) => c.key === "@phone"), ei = cols.findIndex((c) => c.key === "@email");
    if (pi >= 0 && ei >= 0) { cols = cols.filter((c) => c.key !== "@email"); cols[cols.findIndex((c) => c.key === "@phone")] = { key: "@contact", label: "Phone and email", group: "ours", show: true }; }
    return cols;
  }
  function filterBar(rows) {
    const h = st.ctx.h, s = S(), f = st.f;
    const opts = (key) => { const set = new Set(); rows.forEach((l) => String(val(l, key)).split("\n").forEach((x) => { x = x.trim(); if (x) set.add(x); })); return [...set].sort(); };
    const sel = (label, k, options) => h("label", { class: "ld-flab" }, h("span", { text: label }),
      h("select", { class: "ld-sel", onchange: (e) => { f[k] = e.target.value; st.limit = 100; draw(); } },
        h("option", { value: "", text: "All" }), options.map((o) => h("option", { value: Array.isArray(o) ? o[0] : o, text: Array.isArray(o) ? o[1] : o, selected: f[k] === (Array.isArray(o) ? o[0] : o) || null }))));
    const search = h("input", { type: "search", class: "ld-input ld-search", placeholder: "Search name, phone, email or notes", "aria-label": "Search", value: st.q,
      oninput: (e) => { st.q = e.target.value; st.limit = 100; clearTimeout(st.qt); st.qt = setTimeout(() => { draw(); const n = st.el.querySelector(".ld-search"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); } });
    const outcomes = (s.outcomes || []).concat(["(blank)"]);
    const topicLabel = s.summary_kind === "ff" ? "Course" : s.summary_kind === "newark" ? "Year group" : "Ad";
    const bar = h("div", { class: "ld-filters" }, search,
      sel("Outcome", "outcome", outcomes.map((o) => o === "(blank)" ? ["(blank)", "No outcome (blank)"] : o)),
      s.source_key ? sel("Source", "source", opts(s.source_key)) : null,
      s.topic_key ? sel(topicLabel, "topic", opts(s.topic_key)) : null,
      sel("Came in", "date", [["7", "Last 7 days"], ["30", "Last 30 days"], ["month", "This month"], ["lastmonth", "Last month"], ["range", "Between dates…"]]),
      f.date === "range" ? h("span", { class: "ld-range" },
        h("input", { type: "date", class: "ld-input ld-date", value: f.from, "aria-label": "From", onchange: (e) => { f.from = e.target.value; draw(); } }),
        h("span", { text: "to" }),
        h("input", { type: "date", class: "ld-input ld-date", value: f.to, "aria-label": "To", onchange: (e) => { f.to = e.target.value; draw(); } })) : null,
      (st.q || f.outcome || f.source || f.topic || f.date || st.remind) ? h("button", { type: "button", class: "ld-link", text: "Clear", onclick: () => { st.q = ""; st.remind = ""; Object.keys(f).forEach((k) => (f[k] = "")); draw(); } }) : null);
    return bar;
  }
  function listView(rows) {
    const ctx = st.ctx, h = ctx.h, s = S();
    const out = sorted(filtered(rows)), shown = out.slice(0, st.limit);
    const intro = st.tab === "older" ? "Enquiries that came in before Monday of last week and still have no outcome. They move here every Monday, as on the sheet. They still count."
      : st.tab === "archive" ? "Enquiries with a final outcome (" + (s.final_outcomes || []).join(" or ") + ") move here by themselves. Use “Put back” to bring one back." : null;
    const wrap = h("section", { class: "ld-list" }, filterBar(rows), intro ? h("p", { class: "ld-sub", text: intro }) : null,
      h("p", { class: "ld-count", "aria-live": "polite", text: out.length === rows.length ? `${rows.length} ${rows.length === 1 ? "enquiry" : "enquiries"}` : `${out.length} of ${rows.length} enquiries` }));
    if (!out.length) { wrap.append(h("p", { class: "ld-empty", text: rows.length ? "Nothing matches. Try clearing the search or filters." : "Nothing here yet." })); return wrap; }
    if (ctx.phone()) wrap.append(h("div", { class: "ld-cards" }, shown.map((l) => card(l))));
    else wrap.append(table(shown));
    if (out.length > shown.length) wrap.append(h("button", { type: "button", class: "ld-btn ld-more", text: `Show ${Math.min(100, out.length - shown.length)} more`, onclick: () => { st.limit += 100; draw(); } }));
    if (!ctx.phone()) wrap.append(h("button", { type: "button", class: "ld-link ld-allcols", text: st.allCols ? "Show only the usual columns" : "Show all columns (as on the sheet, hidden ones too)", onclick: () => { st.allCols = !st.allCols; draw(); } }));
    return wrap;
  }
  function table(rows) {
    const h = st.ctx.h, cols = shownCols();
    const th = (c) => h("th", { class: "ld-th ld-g-" + c.group + " ld-c-" + c.key.replace(/[^a-z_]/gi, ""), scope: "col", "aria-sort": st.sort.key === c.key ? (st.sort.dir > 0 ? "ascending" : "descending") : "none" },
      h("button", { type: "button", class: "ld-sortbtn", onclick: () => { st.sort = { key: c.key, dir: st.sort.key === c.key ? -st.sort.dir : (c.key === "@date" ? -1 : 1) }; draw(); } },
        c.label, h("span", { class: "ld-arrow", text: st.sort.key === c.key ? (st.sort.dir > 0 ? "▲" : "▼") : "" })));
    const tbody = h("tbody", {});
    rows.forEach((l) => {
      const tr = h("tr", { class: "ld-tr" + (l.dup_of ? " ld-dup" : "") + (st.open.has(l.id) ? " ld-opened" : ""), "data-id": l.id });
      cols.forEach((c) => tr.append(h("td", { class: "ld-td ld-c-" + c.key.replace(/[^a-z_]/gi, "") }, cellFor(l, c))));
      tr.append(h("td", { class: "ld-td ld-act" }, h("button", { type: "button", class: "ld-iconbtn", "aria-label": "More about " + (l.name || "this enquiry"), "aria-expanded": String(st.open.has(l.id)),
        html: ICON.more, onclick: () => { st.open.has(l.id) ? st.open.delete(l.id) : st.open.add(l.id); draw(); } })));
      tbody.append(tr);
      if (st.open.has(l.id)) tbody.append(h("tr", { class: "ld-detailrow" }, h("td", { colspan: String(cols.length + 1) }, detail(l))));
    });
    const tw = h("div", { class: "ld-tablewrap" }, h("table", { class: "ld-table" }, h("thead", {}, h("tr", {}, cols.map(th), h("th", { class: "ld-th", scope: "col" }, h("span", { class: "ld-vh", text: "More" })))), tbody));
    // [25 Nov 2026] when the table is wider than its frame it scrolls sideways inside it; say so, once, above it
    const hint = h("p", { class: "ld-scrollhint", hidden: true, text: "Scroll the table sideways to see every column. Outcome and Notes stay in place." });
    const fit = () => { if (tw.isConnected) hint.hidden = !(tw.scrollWidth > tw.clientWidth + 1); };
    requestAnimationFrame(fit); addEventListener("resize", fit);
    return h("div", { class: "ld-tablebox" }, hint, tw);
  }
  function cellFor(l, c) {
    const h = st.ctx.h, k = c.key;
    if (k === "@outcome") return outcomeSel(l);
    if (k === "@notes") return notesEd(l);
    if (k === "@last_contacted") return lcEd(l);
    if (k === "@name") return h("span", { class: "ld-name" }, l.name || "", l.came_from === "hand" ? h("small", { class: "ld-tag", text: "added by hand" }) : null, l.dup_of ? h("small", { class: "ld-tag ld-tag-dup", text: "duplicate" }) : null,
      /^Waiting/.test(attention(l)) ? h("small", { class: "ld-tag ld-tag-dup", text: attention(l).toLowerCase() }) : null);
    if (k === "@phone") return phoneCell(l);
    if (k === "@contact") return h("span", { class: "ld-contact" }, phoneCell(l), l.email ? h("a", { class: "ld-email", href: "mailto:" + l.email, title: l.email, text: l.email }) : null);
    if (k === "@date" || k === "@latest") return h("span", { class: "ld-nowrap", text: fmtDate(val(l, k), true) });
    if (k === "@days") { const d = val(l, k); return h("span", { class: "ld-num", text: d === "" ? "" : String(d) }); }
    if (k === "@attention") { const a = attention(l); return a ? h("span", { class: "ld-att" + (/^Waiting/.test(a) ? " ld-att-wait" : a === "Duplicate" ? " ld-att-dup" : ""), text: a }) : ""; }
    const v = val(l, k); return h("span", { class: "ld-cell", text: String(v) });
  }
  function phoneCell(l) {
    const h = st.ctx.h, d = phoneDigits(l.phone);
    if (!l.phone) return "";
    return h("span", { class: "ld-phone" }, h("span", { class: "ld-nowrap", text: l.phone }),
      h("button", { type: "button", class: "ld-mini", title: "Copy phone", "aria-label": "Copy phone " + l.phone, html: ICON.copy, onclick: () => copyPhone(l) }),
      d ? h("a", { class: "ld-mini", href: "tel:+" + d, title: "Call", "aria-label": "Call " + (l.name || ""), html: ICON.phone }) : null,
      d ? h("a", { class: "ld-mini", href: "https://wa.me/" + d, target: "_blank", rel: "noopener", title: "WhatsApp", "aria-label": "WhatsApp " + (l.name || ""), html: ICON.wa }) : null);
  }
  async function copyPhone(l) {
    try { await navigator.clipboard.writeText(l.phone); say("Phone copied: " + l.phone); }
    catch (e) { say("Couldn't copy. The number is " + l.phone); }
  }
  function outcomeSel(l) {
    const h = st.ctx.h, s = S();
    const list = (s.outcomes || []).slice();
    if (l.outcome && !list.includes(l.outcome)) list.push(l.outcome);     // an old value from the sheet stays visible
    const cls = !l.outcome ? "ld-o-blank" : l.outcome === s.positive ? "ld-o-good" : isFinal(l) ? "ld-o-no" : "ld-o-wait";
    return h("select", { class: "ld-out " + cls, "aria-label": "Outcome for " + (l.name || "this enquiry"), title: l.outcome_by ? "Set by " + l.outcome_by + ", " + fmtWhen(l.outcome_at) : "",
      onchange: (e) => setField(l, "outcome", e.target.value) },
      h("option", { value: "", text: "No outcome", selected: !l.outcome || null }), list.map((o) => h("option", { value: o, text: o, selected: l.outcome === o || null })));
  }
  function notesEd(l) {
    const h = st.ctx.h;
    const ta = h("textarea", { class: "ld-notes", rows: "1", maxlength: "4000", "aria-label": "Notes for " + (l.name || "this enquiry"), placeholder: "Add a note",
      title: l.notes_by ? "Last changed by " + l.notes_by + ", " + fmtWhen(l.notes_at) : "" });
    ta.value = l.notes || "";
    const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 220) + "px"; };
    ta.addEventListener("focus", grow); ta.addEventListener("input", grow);
    ta.addEventListener("blur", () => { ta.style.height = ""; if ((ta.value.trim() || "") !== (l.notes || "")) setField(l, "notes", ta.value); });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) ta.blur(); if (e.key === "Escape") { ta.value = l.notes || ""; ta.blur(); } });
    return ta;
  }
  function lcEd(l) {
    const h = st.ctx.h;
    return h("input", { type: "date", class: "ld-input ld-date ld-lc", value: l.last_contacted || "", "aria-label": "Last contacted, " + (l.name || ""),
      title: l.lc_by ? "Set by " + l.lc_by + ", " + fmtWhen(l.lc_at) : "", onchange: (e) => setField(l, "last_contacted", e.target.value) });
  }
  async function setField(l, field, value) {
    const before = { outcome: l.outcome, notes: l.notes, last_contacted: l.last_contacted, place: l.place };
    try {
      const r = await call("leads_set", { p_lead: l.id, p_field: field, p_value: value || null });
      Object.assign(l, r.lead);
      const label = field === "outcome" ? "Outcome" : field === "notes" ? "Notes" : "Last contacted";
      let msg = label + " saved for " + (l.name || "this enquiry") + ".";
      if (before.place !== "archive" && l.place === "archive") msg = "Saved. " + (l.name || "It") + " moved to Archive (" + l.outcome + ").";
      st.undo = r.history_id ? { id: r.history_id, msg } : null;
      st.history = null; draw();
      if (!st.undo) say(msg);
    } catch (e) { sorry(e); draw(); }
  }
  function undoBar() {
    const h = st.ctx.h, u = st.undo;
    const bar = h("div", { class: "ld-undo", role: "status" }, h("span", { text: u.msg }),
      h("button", { type: "button", class: "ld-undobtn", text: "Undo", onclick: () => undo(u.id) }),
      h("button", { type: "button", class: "ld-undox", "aria-label": "Close", text: "×", onclick: () => { st.undo = null; bar.remove(); } }));
    st.el.querySelector(".ld-page").append(bar);
    clearTimeout(st.ut); st.ut = setTimeout(() => { if (st.undo === u) { st.undo = null; bar.remove(); } }, 9000);
  }
  async function undo(hid) {
    try {
      const r = await call("leads_undo", { p_history_id: hid });
      if (r.lead) { const l = st.data.leads.find((x) => x.id === r.lead.id); if (l) Object.assign(l, r.lead); }
      st.undo = null; st.history = null;
      if (!r.lead) await load();         // a typed box: reload the figures
      draw(); say("Put back.");
    } catch (e) { sorry(e); }
  }
  function card(l) {
    const h = st.ctx.h, s = S(), d = phoneDigits(l.phone), a = attention(l);
    const topic = s.topic_key && s.summary_kind !== "hk" ? val(l, s.topic_key) : "";      // H&K's "Ad" is an internal ad name: kept for More details
    const where = s.summary_kind === "hk" ? val(l, "Where is the property") : "";
    return h("article", { class: "ld-card" + (l.dup_of ? " ld-dup" : ""), "data-id": l.id },
      h("div", { class: "ld-chead" }, h("div", {}, h("h3", { class: "ld-cname", text: l.name || "(no name)" }),
        h("p", { class: "ld-cmeta", text: [fmtDate(l.at, true), where, topic && topic !== where ? String(topic).split("\n").join(", ") : ""].filter(Boolean).join(" · ") })),
        a ? h("span", { class: "ld-att" + (/^Waiting/.test(a) ? " ld-att-wait" : a === "Duplicate" ? " ld-att-dup" : ""), text: a }) : null),
      l.phone || l.email ? h("div", { class: "ld-cact" },
        d ? h("a", { class: "ld-pbtn", href: "tel:+" + d }, h("i", { class: "ld-ic", html: ICON.phone }), "Call") : null,
        d ? h("a", { class: "ld-pbtn", href: "https://wa.me/" + d, target: "_blank", rel: "noopener" }, h("i", { class: "ld-ic", html: ICON.wa }), "WhatsApp") : null,
        l.phone ? h("button", { type: "button", class: "ld-pbtn", onclick: () => copyPhone(l) }, h("i", { class: "ld-ic", html: ICON.copy }), "Copy") : null) : null,
      h("label", { class: "ld-clab" }, h("span", { text: "Outcome" }), outcomeSel(l)),
      h("label", { class: "ld-clab" }, h("span", { text: "Notes" }), notesEd(l)),
      (s.client_fields || []).includes("last_contacted") ? h("label", { class: "ld-clab" }, h("span", { text: "Last contacted" }), lcEd(l)) : null,
      h("button", { type: "button", class: "ld-link", "aria-expanded": String(st.open.has(l.id)), text: st.open.has(l.id) ? "Fewer details" : "More details",
        onclick: () => { st.open.has(l.id) ? st.open.delete(l.id) : st.open.add(l.id); draw(); } }),
      st.open.has(l.id) ? detail(l) : null);
  }
  function detail(l) {
    const h = st.ctx.h, s = S();
    const skip = new Set(["@outcome", "@notes", "@last_contacted", "@days", "@attention"]);
    const facts = (s.columns || []).filter((c) => !skip.has(c.key)).map((c) => [c.label, c.key === "@date" || c.key === "@latest" ? whenOrDay(val(l, c.key)) : String(val(l, c.key))]).filter(([, v]) => v !== "");
    if (l.subs > 1) facts.push(["Submissions kept", String(l.subs)]);
    if (l.place === "archive") facts.push(["Archived on", fmtDate(l.archived_on, true)], ["Why archived", l.why || ""], ["Outcome recorded on", fmtDate(l.recorded_on, true)]);
    const who = [l.outcome_by && ["Outcome", l.outcome_by, l.outcome_at], l.notes_by && ["Notes", l.notes_by, l.notes_at], l.lc_by && ["Last contacted", l.lc_by, l.lc_at]].filter(Boolean);
    const box = h("div", { class: "ld-detail" },
      h("dl", { class: "ld-facts" }, facts.map(([k, v]) => h("div", { class: "ld-fact" }, h("dt", { text: k }), h("dd", { text: v })))),
      who.length ? h("p", { class: "ld-whos" }, who.map(([f, b, at]) => h("span", { text: `${f}: ${b}${at ? ", " + fmtWhen(at) : ""}` }))) : null,
      h("div", { class: "ld-row" },
        l.place !== "open" ? h("button", { type: "button", class: "ld-btn ld-sm", text: "Put back on " + s.open_label, onclick: () => putBack(l) }) : null,
        h("button", { type: "button", class: "ld-btn ld-sm", text: l.dup_of ? "Not a duplicate" : "Mark as duplicate", onclick: () => markDup(l) }),
        h("button", { type: "button", class: "ld-btn ld-sm", text: "Changes to this enquiry", onclick: async (e) => {
          const at = e.target.closest(".ld-detail"); const list = await historyList(l.id); at.querySelector(".ld-lh")?.remove(); at.append(h("div", { class: "ld-lh" }, list)); } })));
    return box;
  }
  async function putBack(l) {
    const s = S();
    if (isFinal(l) && !(await st.ctx.confirm(`Put ${l.name || "this enquiry"} back on ${s.open_label}? Its outcome goes back to Pending.`, "Put back"))) return;
    try { const r = await call("leads_put_back", { p_lead: l.id }); Object.assign(l, r.lead); st.history = null; draw(); say((l.name || "It") + " is back on " + s.open_label + "."); }
    catch (e) { sorry(e); }
  }
  async function markDup(l) {
    try { const r = await call("leads_mark_duplicate", { p_lead: l.id, p_on: !l.dup_of, p_of: null }); Object.assign(l, r.lead); st.history = null; draw();
      say(l.dup_of ? "Marked as a duplicate. It stays here but no longer counts." : "No longer marked as a duplicate."); }
    catch (e) { sorry(e); }
  }

  // ---------- add by hand ----------
  function addForm() {
    const ctx = st.ctx, h = ctx.h, s = S();
    const ours = (s.columns || []).filter((c) => c.group === "ours" && c.show && !String(c.key).startsWith("@") && !/check before|form answers|^ad$/i.test(c.label));
    const f = {};
    const field = (label, key, attrs) => { const i = h("input", Object.assign({ class: "ld-input", "aria-label": label }, attrs || {})); f[key] = i; return h("label", { class: "ld-flab ld-full" }, h("span", { text: label }), i); };
    const msg = h("p", { class: "ld-hint", "aria-live": "polite" });
    const dlg = h("div", { class: "ld-modal", role: "dialog", "aria-modal": "true", "aria-label": "Add an enquiry" },
      h("form", { class: "ld-box ld-addbox", onsubmit: async (e) => {
        e.preventDefault();
        const row = { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), at: f.at.value ? f.at.value + "T12:00:00+01:00" : null };
        ours.forEach((c) => { if (f[c.key].value.trim()) row[c.key] = f[c.key].value.trim(); });
        if (!row.name) { msg.textContent = "Please type a name."; f.name.focus(); return; }
        try { const r = await call("leads_add", { p_row: row }); r.lead.subs = 0; st.data.leads.unshift(r.lead); dlg.remove(); st.tab = "open"; st.history = null;
          st.undo = null; draw(); say(row.name + " added to " + s.open_label + "."); }
        catch (err) { msg.textContent = "That didn't save. Please try again."; }
      } },
        h("h2", { class: "ld-h2", text: "Add an enquiry" }),
        h("p", { class: "ld-sub", text: "For someone who phoned, wrote or walked in. It starts as Pending." }),
        field(s.name_label || "Name", "name", { required: true, maxlength: "200", autocomplete: "off" }),
        h("div", { class: "ld-two" }, field("Phone", "phone", { type: "tel", maxlength: "40" }), field("Email", "email", { type: "email", maxlength: "200" })),
        field("Date it came in", "at", { type: "date", value: new Date().toISOString().slice(0, 10) }),
        ours.map((c) => field(c.label, c.key, { maxlength: "500" })),
        msg,
        h("div", { class: "ld-row" }, h("button", { type: "submit", class: "ld-btn ld-primary", text: "Add" }),
          h("button", { type: "button", class: "ld-btn", text: "Cancel", onclick: () => dlg.remove() }))));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.remove(); });
    dlg.addEventListener("keydown", (e) => { if (e.key === "Escape") dlg.remove(); });
    st.el.querySelector(".ld-page").append(dlg); f.name.focus();
  }

  // ---------- changes (undo history) ----------
  const FIELD = { outcome: "Outcome", notes: "Notes", last_contacted: "Last contacted", place: "Moved", duplicate: "Duplicate", added: "Added", input: "Summary box" };
  const PLACE = (v) => v === "open" ? S().open_label : v === "older" ? S().older_label : v === "archive" ? "Archive" : v;
  async function historyList(leadId) {
    const h = st.ctx.h;
    let r; try { r = await call("leads_history", { p_lead: leadId || null, p_limit: leadId ? 50 : 300 }); } catch (e) { return h("p", { class: "ld-empty", text: "The changes didn't load." }); }
    const rows = r.history || [];
    if (!rows.length) return h("p", { class: "ld-empty", text: "No changes yet." });
    const show = (f, v) => v == null || v === "" ? "(blank)" : f === "place" ? PLACE(v) : f === "last_contacted" ? fmtDate(v, true) : String(v);
    const inputName = (k) => { if (!k) return ""; const [rk, fk] = k.split("|"); const rr = (st.data.report || []).find((x) => x.key === rk); const fl = (S().input_fields || []).find((x) => x.key === fk); return (rr?.label || rk) + ": " + (fl?.label || fk); };
    return h("ol", { class: "ld-hist" }, rows.map((x) => h("li", { class: "ld-hitem" },
      h("div", { class: "ld-hwhat" }, h("b", { text: x.field === "input" ? inputName(x.input) : (x.name || "") }), " ",
        h("span", { text: (FIELD[x.field] || x.field) + (x.field === "added" ? "" : ": " + show(x.field, x.old) + " → " + show(x.field, x.new)) }),
        x.undo_of ? h("small", { class: "ld-tag", text: "undo" }) : null),
      h("div", { class: "ld-hwho", text: (x.by || "") + ", " + fmtWhen(x.at) }),
      x.undone ? h("span", { class: "ld-hdone", text: "Undone" }) : h("button", { type: "button", class: "ld-btn ld-sm", text: "Undo this", onclick: () => undo(x.id) }))));
  }
  function changes() {
    const h = st.ctx.h;
    const box = h("section", { class: "ld-box ld-changes" }, h("h2", { class: "ld-h2", text: "Every change" }),
      h("p", { class: "ld-sub", text: "Who changed what, and when. “Undo this” puts the earlier value back (and that is recorded too)." }),
      h("p", { class: "ld-hint", text: "Loading…" }));
    historyList(null).then((list) => { box.querySelector(".ld-hint")?.replaceWith(list); });
    return box;
  }

  // ---------- summary (the sheets' Summary tab) ----------
  function people() { return (st.data.leads || []).filter((l) => !l.dup_of && !isTest(l)); }
  function reportRows(kind) { return (st.data.report || []).filter((r) => r.kind === kind); }
  function inputVal(key, field) { const i = (st.data.inputs || []).find((x) => x.key === key && x.field === field); return i ? i.value : ""; }
  const tbl = (heads, rows, cls) => st.ctx.h("div", { class: "ld-tablewrap" }, st.ctx.h("table", { class: "ld-table ld-sum " + (cls || "") },
    st.ctx.h("thead", {}, st.ctx.h("tr", {}, heads.map((x) => st.ctx.h("th", { class: "ld-th", scope: "col", text: x })))),
    st.ctx.h("tbody", {}, rows.map((r) => st.ctx.h("tr", { class: r._total ? "ld-totalrow" : "" }, r.map((c, i) => st.ctx.h(i ? "td" : "th", { class: i ? "ld-td ld-numcell" : "ld-td", scope: i ? null : "row" }, c == null ? "" : c)))))));
  function summary() {
    const s = S();
    if (s.summary_kind === "hk") return summaryHK();
    return summaryCourses();
  }
  function summaryHK() {
    const h = st.ctx.h, P = people(), s = S();
    const adMonth = reportRows("ad_month"), ads = reportRows("ad");
    const spendAll = adMonth.reduce((a, r) => a + (num(r.data.spend) || 0), 0);
    const followed = (l) => l.outcome && l.outcome !== "Pending";
    const signed = (l) => l.outcome === s.positive;
    const cpl = (sp, n) => (sp && n ? money(Math.round(sp / n * 100) / 100) : "");
    const cps = (sp, n) => (!sp ? "" : n ? money(Math.round(sp / n)) : "none signed yet");
    const waiting = P.filter((l) => l.place !== "archive" && pending(l) && (daysSince(l.at) ?? 0) >= 3).length;
    const total = [["Total", P.length, P.filter(followed).length, P.filter(signed).length, money(spendAll), cpl(spendAll, P.length), cps(spendAll, P.filter(signed).length)]];
    // by ad: leads carry the Ad ID; the ad list gives the name used in the Summary
    const adName = (id, meta) => (ads.find((a) => a.key === String(id))?.label) || meta || "Unknown ad";
    const byAd = new Map();
    P.forEach((l) => { const id = String(val(l, "Ad ID") || ""); const k = id || "?"; const e = byAd.get(k) || { name: adName(id, val(l, "Ad")), n: 0, f: 0, s: 0, sp: 0 }; e.n++; if (followed(l)) e.f++; if (signed(l)) e.s++; byAd.set(k, e); });
    adMonth.forEach((r) => { const k = String(r.data.ad_id); const e = byAd.get(k) || { name: adName(k, r.label), n: 0, f: 0, s: 0, sp: 0 }; e.sp += num(r.data.spend) || 0; byAd.set(k, e); });
    const adRows = [...byAd.values()].sort((a, b) => b.n - a.n || b.sp - a.sp).map((e) => [e.name, e.n, e.f, e.s, money(e.sp), cpl(e.sp, e.n), cps(e.sp, e.s)]);
    // by month: leads by Date in, signed by Outcome recorded on, spend by month
    const months = new Map(); const m = (k) => { if (!months.has(k)) months.set(k, { n: 0, s: 0, sp: 0 }); return months.get(k); };
    P.forEach((l) => { const k = monthKey(l.at); if (k) m(k).n++; if (signed(l)) { const r = monthKey(l.recorded_on || l.outcome_at); if (r) m(r).s++; } });
    adMonth.forEach((r) => { m(r.data.month).sp += num(r.data.spend) || 0; });
    const monthRows = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, e]) => [monthName(k), e.n, e.s, money(e.sp), cpl(e.sp, e.n), cps(e.sp, e.s)]);
    return h("section", { class: "ld-summary" },
      h("div", { class: "ld-figs" }, fig("Leads", P.length), fig("Followed up", P.filter(followed).length), fig("Signed", P.filter(signed).length),
        fig("Ad spend", money(spendAll)), fig("Cost per signed landlord", cps(spendAll, P.filter(signed).length) || "–"), fig("Waiting over 3 days", waiting, waiting ? "warm" : "")),
      h("h2", { class: "ld-h2", text: "All landlord ads, all time" }), tbl(["", "Leads", "Followed up", "Signed", "Ad spend", "Cost per lead", "Cost per signed landlord"], total),
      h("h2", { class: "ld-h2", text: "By ad" }), tbl(["Ad", "Leads", "Followed up", "Signed", "Ad spend", "Cost per lead", "Cost per signed landlord"], adRows),
      h("h2", { class: "ld-h2", text: "By month" }), h("p", { class: "ld-sub", text: "Leads count in the month they came in. Signings count in the month the outcome was first recorded, so the newest month looks weaker at first." }),
      tbl(["Month", "Leads", "Signed", "Ad spend", "Cost per lead", "Cost per signed landlord"], monthRows),
      h("p", { class: "ld-sub", text: "“Followed up” means any outcome other than Pending. Marked duplicates and our test enquiries are left out. Leads, " + (s.older_label || "") + " and Archive all count." }));
  }
  function fig(label, value, tone) { const h = st.ctx.h; return h("div", { class: "ld-fig" + (tone ? " ld-" + tone : "") }, h("b", { text: String(value) }), h("span", { text: label })); }
  function courseCodes(l) { return String(val(l, "course code") || val(l, "Ref") || "").split(/\n|,/).map((x) => x.trim()).filter(Boolean); }
  function summaryCourses() {
    const h = st.ctx.h, s = S(), P = people(), kindMain = s.summary_kind === "ff" ? "course" : "year_group";
    const reg = (l) => l.outcome === s.positive;
    const noReg = (l) => l.outcome && isFinal(l) && !reg(l);
    const rows = reportRows(kindMain).concat(s.summary_kind === "ff" ? reportRows("past_course") : []);
    // person-level outcomes (Enquiries + Archive), and the 29 Oct rule for registrations by course
    const regPeople = P.filter(reg), oneCode = regPeople.filter((l) => courseCodes(l).length === 1), many = regPeople.filter((l) => courseCodes(l).length >= 2);
    const groups = new Map();
    rows.forEach((r) => {
      const g = r.grp || r.label || r.key; const e = groups.get(g) || { enq: 0, sp: 0, regTyped: 0, newTo: 0, regOut: 0 };
      e.enq += (num(r.data.enquiries_meta) || 0) + (num(r.data.enquiries_google) || 0); e.sp += num(r.data.spend) || 0;
      e.regTyped += num(inputVal(r.key, "registrations")) || 0; e.newTo += num(inputVal(r.key, s.summary_kind === "ff" ? "new_to_us" : "from_kg")) || 0;
      e.regOut += oneCode.filter((l) => courseCodes(l)[0] === r.key).length; groups.set(g, e);
    });
    const ratio = (a, b, d) => (b ? (Math.round(a / b * Math.pow(10, d)) / Math.pow(10, d)) : "");
    const gRows = [...groups.entries()].map(([g, e]) => [g, e.enq, money(e.sp), e.regTyped, e.newTo, ratio(e.enq, e.regTyped, 1), e.regTyped ? money(Math.round(e.sp / e.regTyped)) : ""]);
    const T = [...groups.values()].reduce((a, e) => ({ enq: a.enq + e.enq, sp: a.sp + e.sp, regTyped: a.regTyped + e.regTyped, newTo: a.newTo + e.newTo }), { enq: 0, sp: 0, regTyped: 0, newTo: 0 });
    const tot = [s.summary_kind === "ff" ? "All courses" : "All year groups", T.enq, money(T.sp), T.regTyped, T.newTo, ratio(T.enq, T.regTyped, 1), T.regTyped ? money(Math.round(T.sp / T.regTyped)) : ""]; tot._total = true;
    const months = new Map(); const m = (k) => { if (!months.has(k)) months.set(k, { n: 0, r: 0, d: 0 }); return months.get(k); };
    P.forEach((l) => { const k = monthKey(l.at); if (k) m(k).n++; if (reg(l)) { const r = monthKey(l.recorded_on || l.outcome_at); if (r) m(r).r++; } if (noReg(l)) { const r = monthKey(l.recorded_on || l.outcome_at); if (r) m(r).d++; } });
    const monthRows = [...months.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, e]) => [monthName(k), e.n, e.r, e.d]);
    const who = s.summary_kind === "ff" ? "people" : "families";
    return h("section", { class: "ld-summary" },
      h("div", { class: "ld-figs" }, fig(s.summary_kind === "ff" ? "People who enquired" : "Families who enquired", P.length), fig("Registered", regPeople.length),
        fig("Did not register", P.filter(noReg).length), fig("Still no outcome", P.filter((l) => l.place !== "archive" && pending(l)).length),
        fig("Enquiries from ads (all)", T.enq), fig("Ad spend so far", money(T.sp))),
      h("h2", { class: "ld-h2", text: s.summary_kind === "ff" ? "By course group" : "By year group" }),
      h("p", { class: "ld-sub", text: "Enquiries and spend come from us; registrations and the other boxes are what your team types on the " + (s.summary_kind === "ff" ? "Courses" : "Year groups") + " tab." }),
      tbl([s.summary_kind === "ff" ? "Course group" : "Group", "Total enquiries", "Ad spend so far", "Registrations so far", s.summary_kind === "ff" ? "New to Future Focus" : "From Newark Kindergarten", "Enquiries per registration", "Ad cost per registration"], gRows.concat([tot])),
      s.summary_kind === "ff" ? [h("h2", { class: "ld-h2", text: "Registrations by course" }),
        tbl(["", "People"], [["Registered (from the Outcome column)", regPeople.length], ["…with one course: counted on that course", oneCode.length], ["…Registered, course not known (two or more courses)", many.length]])] : null,
      h("h2", { class: "ld-h2", text: "By month" }), h("p", { class: "ld-sub", text: `New ${who} count in the month they first enquired; outcomes in the month they were first recorded.` }),
      tbl(["Month", s.summary_kind === "ff" ? "People who enquired" : "Families who enquired", "Registered", "Did not register"], monthRows),
      h("p", { class: "ld-sub", text: s.summary_kind === "ff" ? "One person can ask about several courses, so “Registered” counts people. A person with one course counts on that course; two or more count once as “Registered, course not known”, never split or guessed." : "Marked duplicates and our test enquiries are left out." }));
  }

  // ---------- Courses / Year groups (typed boxes) ----------
  function courses() {
    const h = st.ctx.h, s = S();
    const sections = s.summary_kind === "ff" ? [["course", "Courses"], ["past_course", "Past courses"]] : [["year_group", "Year groups"], ["y1_month", "Year 1, month by month"]];
    const fields = s.input_fields || [];
    const out = h("section", { class: "ld-summary" }, h("p", { class: "ld-sub", text: "The yellow boxes are yours to fill in, as on the sheet. They save when you leave the box. We fill in the enquiries and spend twice a week." }));
    sections.forEach(([kind, title]) => {
      const rows = reportRows(kind); if (!rows.length) return;
      const monthly = kind === "y1_month";
      const myFields = monthly ? fields.filter((f) => ["visited", "registrations", "notes"].includes(f.key)) : fields;
      // [25 Nov 2026] the columns as one list, so their order is one setting (setup.course_order): "sheet" keeps the
      // client's Google Sheet order (Course, Starts, our four figures, their boxes, the three that work themselves out);
      // "client_first" puts their three number boxes first, then our four, the three, and Notes last. Notes is widest.
      // a long heading word may break at a marked point (a soft hyphen: invisible unless the word breaks there), so the
      // narrow number columns stay narrow; the download takes the marks out again
      const soft = (x) => String(x).replace(/(Regis)(trations?)/g, "$1­$2").replace(/(regis)(trations?)/g, "$1­$2").replace(/(Kinder)(garten)/g, "$1­$2").replace(/(Enqui)(ries)/g, "$1­$2");
      const fLab = (f) => monthly && f.key === "visited" ? "Families who visited that month" : monthly && f.key === "registrations" ? "Registrations that month" : f.label;
      const C = {};
      const col = (k, head, cls, cell) => (C[k] = { head, cls, cell });
      col("starts", "Starts", "ld-nowrap", (r) => r.starts && /^\d{4}-\d{2}-\d{2}/.test(r.starts) ? fmtDate(r.starts, true) : (r.starts || ""));
      col("fb", "Enquiries (Facebook, Instagram)", "ld-numcell", (r, x) => x.fb ?? "");
      col("go", "Enquiries (Google)", "ld-numcell", (r, x) => x.go ?? "");
      col("tot", "Total", "ld-numcell", (r, x) => String(x.t));
      col("sp", "Ad spend", "ld-numcell", (r, x) => money(x.sp));
      myFields.forEach((f) => col("f:" + f.key, fLab(f), "ld-inputcell" + (f.key === "notes" ? " ld-notecol" : ""), (r) => inputBox(r, f)));
      col("left", "Places left", "ld-numcell", (r, x) => x.places != null && x.regs != null ? String(x.places - x.regs) : "");
      col("per", "Enquiries per registration", "ld-numcell", (r, x) => x.t !== "" && x.regs ? String(Math.round(x.t / x.regs * 10) / 10) : "");
      col("cost", "Ad cost per registration", "ld-numcell", (r, x) => x.sp != null && x.regs ? money(Math.round(x.sp / x.regs)) : "");
      const ours = ["fb", "go", "tot", "sp"], boxes = myFields.filter((f) => f.key !== "notes").map((f) => "f:" + f.key), notes = myFields.some((f) => f.key === "notes") ? ["f:notes"] : [];
      const order = monthly ? [...ours, ...myFields.map((f) => "f:" + f.key)]
        : s.course_order === "client_first" ? ["starts", ...boxes, ...ours, "left", "per", "cost", ...notes]
        : ["starts", ...ours, ...boxes, ...notes, "left", "per", "cost"];
      const heads = [monthly ? "Month" : title === "Courses" || title === "Past courses" ? "Course" : "Year group"];
      const tr = rows.map((r) => {
        const fb = num(r.data.enquiries_meta), go = num(r.data.enquiries_google), sp = num(r.data.spend);
        const x = { fb, go, sp, t: fb == null && go == null ? "" : (fb || 0) + (go || 0), regs: num(inputVal(r.key, "registrations")), places: num(inputVal(r.key, "places")) };
        return h("tr", {}, h("th", { class: "ld-td", scope: "row" }, r.label || r.key, r.grp && r.grp !== r.label ? h("small", { class: "ld-grp", text: r.grp }) : null),
          order.map((k) => { const v = C[k].cell(r, x); return h("td", { class: "ld-td " + C[k].cls }, typeof v === "object" && v ? v : String(v)); }));
      });
      out.append(h("h2", { class: "ld-h2", text: title }), h("div", { class: "ld-tablewrap" }, h("table", { lang: "en", class: "ld-table ld-sum ld-courses" + (s.course_order === "client_first" && !monthly ? " ld-clientfirst" : "") },
        h("thead", {}, h("tr", {}, heads.concat(order.map((k) => C[k].head)).map((t, j) => h("th", { class: "ld-th" + (j && order[j - 1] === "f:notes" ? " ld-notecol" : ""), scope: "col", text: soft(t) })))), h("tbody", {}, tr))));
    });
    if (out.children.length === 1) out.append(h("p", { class: "ld-empty", text: "No rows yet." }));
    return out;
  }
  function inputBox(r, f) {
    const h = st.ctx.h, v = inputVal(r.key, f.key);
    const i = h(f.key === "notes" ? "textarea" : "input", Object.assign({ class: "ld-box-in" + (f.key === "notes" ? " ld-box-notes" : ""), "aria-label": f.label + ", " + (r.label || r.key) },
      f.key === "notes" ? { rows: "1", maxlength: "1000" } : { inputmode: "numeric", pattern: "[0-9]*", maxlength: "5" }));
    i.value = v || "";
    i.addEventListener("change", async () => {
      const nv = i.value.trim();
      if (f.key !== "notes" && nv && !/^\d{1,5}$/.test(nv)) { say("Please type a whole number."); i.value = v || ""; return; }
      try { await call("leads_set_input", { p_row_key: r.key, p_field: f.key, p_value: nv || null });
        const ex = st.data.inputs.find((x) => x.key === r.key && x.field === f.key);
        if (ex) ex.value = nv; else st.data.inputs.push({ key: r.key, field: f.key, value: nv });
        st.history = null; say("Saved."); draw(); }
      catch (e) { sorry(e); i.value = v || ""; }
    });
    return i;
  }

  // ---------- Download as Excel (the sheet's layout) ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const colName = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const excelDate = (iso) => { const d = dayOf(iso); if (!d) return null; return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) - Date.UTC(1899, 11, 30)) / 864e5; };
  // a sheet: { name, rows: [[{v, s}]], widths: [], freeze: rowCount, filter: [r1, r2] }
  function sheetXml(sh) {
    const rows = sh.rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((c, ci) => {
      if (c == null || c.v == null || c.v === "") return c && c.s ? `<c r="${colName(ci)}${ri + 1}" s="${c.s}"/>` : "";
      const ref = colName(ci) + (ri + 1), s = c.s ? ` s="${c.s}"` : "";
      if (typeof c.v === "number") return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
    }).join("") + "</row>").join("");
    const cols = sh.widths ? "<cols>" + sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("") + "</cols>" : "";
    const pane = sh.freeze ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : "";
    const af = sh.filter && sh.rows.length > sh.filter[0] ? `<autoFilter ref="A${sh.filter[0]}:${colName(sh.filter[1] - 1)}${sh.rows.length}"/>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${pane}${cols}<sheetData>${rows}</sheetData>${af}</worksheet>`;
  }
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="d mmm yyyy"/><numFmt numFmtId="165" formatCode="&quot;€&quot;#,##0.00"/></numFmts>
<fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFE699"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD6E8F5"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4F1EC"/></patternFill></fill></fills>
<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="10"><xf/><xf fontId="1" applyFont="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/>
<xf fontId="1" fillId="3" applyFont="1" applyFill="1"/><xf fontId="1" fillId="4" applyFont="1" applyFill="1"/><xf fontId="2" applyFont="1"/>
<xf numFmtId="165" applyNumberFormat="1"/><xf fillId="2" applyFill="1"/><xf fontId="1" fillId="5" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
  // styles: 1 bold, 2 date, 3 yellow head, 4 blue head, 5 grey head, 6 title, 7 euro, 8 yellow cell, 9 cream head
  function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
  function zip(files) {          // stored (no compression) zip: enough for a spreadsheet
    const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
    files.forEach(({ name, data }) => {
      const nb = enc.encode(name), db = enc.encode(data), crc = crc32(db);
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 0, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, db.length, true); lh.setUint32(22, db.length, true); lh.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(lh.buffer), nb, db);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, db.length, true); ch.setUint32(24, db.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nb); offset += 30 + nb.length + db.length;
    });
    const csize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function workbook(sheets) {
    const files = [
      { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") + `</Types>` },
      { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` + sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") + `</sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", data: STYLES },
    ];
    sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }));
    return zip(files);
  }
  function buildSheets() {
    const s = S(), L = lists(), clientName = st.ctx.clientName || s.sheet_name || "Client";
    const cols = s.columns || [];
    const cellOf = (l, c) => {
      const v = val(l, c.key);
      if (c.key === "@date" || c.key === "@latest" || c.key === "@last_contacted") { const n = excelDate(v); return n == null ? null : { v: n, s: 2 }; }
      if (c.key === "@days") return v === "" ? null : { v: Number(v) };
      if (c.key === "@outcome" || c.key === "@notes" || c.key === "@last_contacted") return { v: v, s: 8 };
      return { v: typeof v === "number" ? v : String(v) };
    };
    const headStyle = (c) => (c.group === "client" ? 3 : c.group === "auto" ? 5 : 4);
    const listSheet = (name, rows, banner, archive) => {
      const out = [];
      if (banner) {
        out.push([{ v: clientName + ": " + name, s: 6 }]);
        out.push([{ v: "Downloaded from Client Studio:", s: 1 }, { v: excelDate(new Date().toISOString()), s: 2 }]);
        out.push([]);
        const labels = cols.map((c) => ({ v: "", s: headStyle(c) }));
        const first = (g) => cols.findIndex((c) => c.group === g);
        if (first("client") >= 0) labels[first("client")] = { v: "FILLED IN BY " + clientName.toUpperCase() + ", please", s: 3 };
        if (first("ours") >= 0) labels[first("ours")] = { v: "FILLED IN BY M7ALPHA", s: 4 };
        if (first("auto") >= 0) labels[first("auto")] = { v: "WORKS ITSELF OUT", s: 5 };
        out.push(labels);
      }
      const heads = cols.map((c) => ({ v: c.label, s: headStyle(c) }));
      if (archive) heads.push({ v: "Archived on", s: 9 }, { v: "Why archived", s: 9 }, { v: "Outcome recorded on", s: 9 });
      out.push(heads);
      const hr = out.length;
      sorted(rows).forEach((l) => {
        const r = cols.map((c) => cellOf(l, c));
        if (archive) r.push(l.archived_on ? { v: excelDate(l.archived_on), s: 2 } : null, { v: l.why || "" }, l.recorded_on ? { v: excelDate(l.recorded_on), s: 2 } : null);
        out.push(r);
      });
      const widths = cols.map((c) => (c.key === "@notes" ? 40 : c.key === "@name" || c.key === "@email" ? 26 : /course|ad$|where|form/i.test(c.label) ? 30 : 15));
      if (archive) widths.push(14, 22, 18);
      return { name, rows: out, widths, freeze: hr, filter: [hr, heads.length] };
    };
    const sheets = [listSheet(s.open_label, L.open, s.summary_kind === "hk", false)];
    if (s.older_label) sheets.push(listSheet(s.older_label, L.older, false, false));
    sheets.push(listSheet("Archive", L.archive, false, true));
    // Summary tab: the figures as shown on the page
    const sumEl = summary(); const sumRows = [[{ v: "Summary", s: 6 }], []];
    sumEl.querySelectorAll("h2, table").forEach((n) => {
      if (n.tagName === "H2") { sumRows.push([]); sumRows.push([{ v: n.textContent, s: 1 }]); return; }
      n.querySelectorAll("tr").forEach((tr) => sumRows.push([...tr.children].map((td) => { const t = td.textContent; const m = /^€([\d,]+(\.\d+)?)$/.exec(t); return m ? { v: Number(m[1].replace(/,/g, "")), s: 7 } : (t !== "" && !isNaN(t) ? { v: Number(t) } : { v: t, s: td.tagName === "TH" ? 1 : 0 }); })));
    });
    sheets.push({ name: "Summary", rows: sumRows, widths: [34, 16, 16, 16, 16, 18, 22] });
    if (s.summary_kind !== "hk") {
      const cEl = courses(); const cRows = [];
      cEl.querySelectorAll("h2, table").forEach((n) => {
        if (n.tagName === "H2") { cRows.push([]); cRows.push([{ v: n.textContent, s: 6 }]); return; }
        n.querySelectorAll("tr").forEach((tr) => cRows.push([...tr.children].map((td) => {
          const inp = td.querySelector("input, textarea"); const t = (inp ? inp.value : td.textContent).replace(/­/g, "");
          const m = /^€([\d,]+(\.\d+)?)$/.exec(t); return m ? { v: Number(m[1].replace(/,/g, "")), s: 7 } : (t !== "" && !isNaN(t) ? { v: Number(t), s: inp ? 8 : 0 } : { v: t, s: td.tagName === "TH" ? 1 : inp ? 8 : 0 }); })));
      });
      const nh = [...(cEl.querySelector("thead tr")?.children || [])].findIndex((th) => th.textContent === "Notes");
      sheets.push({ name: s.summary_kind === "ff" ? "Courses" : "Year groups", rows: cRows, widths: [...(cEl.querySelector("thead tr")?.children || [])].map((th, j) => j === 0 ? 34 : j === nh ? 40 : 14) });
    }
    return sheets;
  }
  function download() {
    try {
      const sheets = buildSheets(), blob = workbook(sheets);
      const name = (st.ctx.clientName || S().sheet_name || "Leads").replace(/[^\w &-]+/g, "") + " leads " + new Date().toISOString().slice(0, 10) + ".xlsx";
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      say("Downloading " + name);
    } catch (e) { say("The download didn't work. Please try again."); }
  }

  // ---------- for the Dashboard ----------
  async function counts(ctx) {
    try { const r = await ctx.rpc("leads_count", { p_token: ctx.token || null, p_client_code: ctx.code }); return r && !r.error ? r : null; } catch (e) { return null; }
  }
  window.M7Leads = {
    count: async (ctx) => { const r = await counts(ctx); return r ? r.new_7d : null; },     // new enquiries in the last 7 days
    counts,                                                                               // { new_today, new_7d, no_outcome, waiting_3d }
    _test: { buildSheets: () => buildSheets(), workbook, state: () => st },
  };
  (window.StudioPanelsQueue ||= []).push({ name: "leads", type: "Leads", page: { label: "Leads", needsPerson: true, teamOnly: true, render } });
})();
