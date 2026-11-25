/* Client Studio: Reports (builder 2, 25 Nov 2026; BRIEF_Claude_four_new_pages_2026-11-25.md, Page 2;
   HELPERS_CONTRACT_new_pages_2026-11-25.md).
   What's active (each live campaign and ad set), Performance (last 14 days against the 14 before, one small chart per
   campaign, its ads), Results (the month so far, the best ad with its picture, our written note) and Posts (Facebook and
   Instagram figures from Metricool). The page only reads one summary per client per day through get_report
   (setup_33_reports.sql), behind the setup_32 gate: a signed-in editor, or a personal link with Reports switched on.
   Money (paid to Meta, budgets, cost per result) arrives only when the database allows it; the page never works it out.
   Figures are never made up here: no row means "no figures yet".
   One global: window.M7Reports (summary(ctx) for the Dashboard). Classes start with rp-. Browser keys start with m7r-rp:. */
(function () {
  "use strict";
  const cache = new Map();             // client code -> { at, data }
  const FRESH_MS = 60000;

  // ---------- small helpers ----------
  const nf = (n) => (n == null ? "–" : Math.round(n).toLocaleString("en-GB"));
  const eur = (n, cur) => (n == null ? "–" : new Intl.NumberFormat("en-GB", { style: "currency", currency: cur || "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n));
  const dshort = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
  const dlong = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "");
  const stamp = (iso) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const monthName = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { month: "long" });
  // Meta's result types in plain words: [many, one]
  const LABELS = {
    lead: ["enquiries", "enquiry"], "onsite_conversion.lead_grouped": ["enquiries", "enquiry"], "offsite_conversion.fb_pixel_lead": ["enquiries", "enquiry"],
    onsite_web_lead: ["enquiries", "enquiry"], "onsite_conversion.messaging_conversation_started_7d": ["conversations started", "conversation"],
    link_click: ["link clicks", "click"], landing_page_view: ["website visits", "visit"], omni_landing_page_view: ["website visits", "visit"],
    post_engagement: ["likes, comments and shares", "like, comment or share"], post_interaction_gross: ["likes, comments and shares", "like, comment or share"],
    video_thruplay_watched_actions: ["video views", "video view"], complete_registration: ["sign-ups", "sign-up"],
    "offsite_conversion.fb_pixel_complete_registration": ["sign-ups", "sign-up"], purchase: ["sales", "sale"], "offsite_conversion.fb_pixel_purchase": ["sales", "sale"],
    like: ["page likes", "page like"], page_like: ["page likes", "page like"],
  };
  // a custom conversion counts by its name: anything with "lead" in it is an enquiry (as reports_fetch.py does)
  const lab = (k) => LABELS[k] || (/lead/i.test(k || "") ? ["enquiries", "enquiry"] : /purchase/i.test(k || "") ? ["sales", "sale"] : ["results", "result"]);
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  // campaign and ad set names as people would say them: underscores and bars become spaces and dots
  let NAMES = {};      // plain names set by the client's session (Meta id -> our words), shown instead of Meta's
  const nm = (o) => (o && NAMES[o.id]) || plain(o && o.name);
  const plain = (s) => String(s || "").replace(/_/g, " ").replace(/\s*\|\s*/g, " · ").replace(/\s{2,}/g, " ").trim();
  // against the 14 days before (the section says so once): "up 45%", "down 24%". better: "up" | "down" | null (neutral)
  function change(now, prev, better = "up") {
    if (now == null) return null;
    if (prev == null || prev === 0) return prev === 0 && now > 0 ? { t: "none the 14 days before", dir: 0 } : null;
    const p = Math.round(((now - prev) / prev) * 100);
    if (p === 0) return { t: "no change", dir: 0 };
    const tone = better == null ? null : (better === "up" ? p > 0 : p < 0);
    return { t: `${p > 0 ? "up" : "down"} ${Math.abs(p)}%`, dir: p > 0 ? 1 : -1, tone };
  }
  async function getReport(ctx, force) {
    const k = ctx.code + "|" + (ctx.token || "") + "|" + (ctx.team ? "t" : "c");
    const c = cache.get(k);
    if (!force && c && Date.now() - c.at < FRESH_MS) return c.data;
    const data = await ctx.rpc("get_report", { p_token: ctx.token || null, p_client_code: ctx.code });
    cache.set(k, { at: Date.now(), data });
    return data;
  }
  const say = (ctx, t) => { try { ctx.toast(t); } catch (e) {} };

  // ---------- pieces ----------
  function fresh(h, r) {
    return h("p", { class: "rp-fresh", text: `Updated ${stamp(r.fetched_at)}. Figures can still change for a day or two.` });
  }
  function fig(h, label, value, sub, chg) {
    return h("div", { class: "rp-fig" },
      h("div", { class: "rp-fig-v", text: value }),
      h("div", { class: "rp-fig-l", text: label }),
      chg ? h("div", { class: "rp-fig-c" + (chg.dir && chg.tone != null ? (chg.tone ? " rp-good" : " rp-bad") : ""), text: (chg.dir > 0 ? "▲ " : chg.dir < 0 ? "▼ " : "") + chg.t }) : null,
      sub ? h("div", { class: "rp-fig-s", text: sub }) : null);
  }
  function section(h, id, title, lede, ...kids) {
    return h("section", { class: "rp-sec", id: "rp-" + id, "data-sec": id },
      h("h2", { class: "rp-h2", text: title }), lede ? h("p", { class: "rp-lede", text: lede }) : null, ...kids);
  }

  // one small column chart: what happened each day, last 28 days. Hover or tap a column for the day's figure.
  function chart(h, c) {
    const days = c.chart?.days || [];
    if (!days.length || !days.some((d) => d.v > 0)) return null;
    const what = c.chart.what === "reach" ? ["people reached", "person reached"] : lab(c.now.result_key);
    const max = Math.max(...days.map((d) => d.v));
    const tip = h("div", { class: "rp-tip", hidden: true });
    const box = h("div", { class: "rp-chart-box", role: "img",
      "aria-label": `${cap(what[0])} each day, ${dshort(days[0].d)} to ${dshort(days[days.length - 1].d)}. Highest: ${nf(max)}.` });
    const cols = days.map((d, i) => {
      const col = h("div", { class: "rp-col", "data-v": d.v },
        h("div", { class: "rp-bar", style: `height:${d.v ? Math.max(3, (d.v / max) * 100) : 0}%` }));
      const show = () => {
        tip.textContent = `${dlong(d.d)}: ${nf(d.v)} ${d.v === 1 ? what[1] || what[0] : what[0]}`;
        tip.hidden = false; tip.style.left = Math.min(Math.max(((i + 0.5) / days.length) * 100, 14), 86) + "%";
        box.querySelectorAll(".rp-on").forEach((n) => n.classList.remove("rp-on")); col.classList.add("rp-on");
      };
      col.addEventListener("mouseenter", show); col.addEventListener("click", show);
      return col;
    });
    box.append(h("div", { class: "rp-cols" }, ...cols), tip);
    box.addEventListener("mouseleave", () => { tip.hidden = true; box.querySelectorAll(".rp-on").forEach((n) => n.classList.remove("rp-on")); });
    return h("figure", { class: "rp-chart" },
      h("figcaption", { class: "rp-chart-t" }, h("b", { text: cap(what[0]) + " each day" }), h("span", { text: ` · last 28 days · highest ${nf(max)}` })),
      box,
      h("div", { class: "rp-chart-x" }, h("span", { text: dshort(days[0].d) }), h("span", { text: dshort(days[days.length - 1].d) })));
  }

  // ---------- the sections ----------
  function active(h, r, money, cur) {
    const list = r.figures.active || [];
    if (!list.length) return section(h, "active", "What's running now", null, h("div", { class: "rp-card rp-empty", text: "No ads are running right now." }), fresh(h, r));
    const cards = list.map((c) => {
      const soon = c.adsets.filter((a) => a.ends_soon && a.days_left != null).sort((a, b) => a.days_left - b.days_left)[0];
      const rows = c.adsets.map((a) => {
        const m = money?.adsets?.[a.id];
        const budget = m && m.budget != null ? (m.budget_kind === "daily" ? `${eur(m.budget, cur)} a day` : `${eur(m.budget, cur)} in total`) + (m.budget_on === "campaign" ? " (shared across the campaign)" : "") : null;
        const left = a.days_left == null ? "No end date" : a.days_left === 0 ? "Ends today" : a.days_left === 1 ? "Ends tomorrow" : `Ends in ${a.days_left} days`;
        return h("div", { class: "rp-set" + (a.ends_soon ? " rp-soon" : "") },
          h("div", { class: "rp-set-n", text: nm(a) }),
          h("dl", { class: "rp-dl" },
            h("div", {}, h("dt", { text: a.started ? "Started" : "Starts" }), h("dd", { text: dlong(a.start) })),
            h("div", {}, h("dt", { text: "Ends" }), h("dd", { text: a.end ? dlong(a.end) : "No end date" })),
            budget ? h("div", {}, h("dt", { text: "Budget" }), h("dd", { text: budget })) : null,
            m ? h("div", {}, h("dt", { text: "Paid to Meta so far" }), h("dd", { text: eur(m.paid_so_far, cur) })) : null,
            h("div", {}, h("dt", { text: "Time left" }), h("dd", {}, a.ends_soon ? h("span", { class: "rp-flag", text: left }) : left))));
      });
      return h("article", { class: "rp-card rp-camp" },
        h("div", { class: "rp-camp-top" }, h("h3", { class: "rp-h3", text: nm(c) }),
          soon ? h("span", { class: "rp-flag", text: soon.days_left === 0 ? "Ends today" : soon.days_left === 1 ? "Ends tomorrow" : `Ends in ${soon.days_left} days` }) : null),
        h("p", { class: "rp-meta", text: `${c.adsets.length} ${c.adsets.length === 1 ? "ad set" : "ad sets"} running · since ${dlong(c.start)}` + (c.end ? ` · until ${dlong(c.end)}` : "") }),
        ...rows);
    });
    return section(h, "active", "What's running now", "Each campaign is split into ad sets: a group of ads shown to one audience.", h("div", { class: "rp-stack" }, ...cards), fresh(h, r));
  }

  function performance(h, r, money, cur, phone) {
    const list = r.figures.campaigns || [];
    const p = r.figures.period;
    const lede = p ? `The last 14 days (${dshort(p.from)} to ${dshort(p.to)}). "Up" and "down" compare with the 14 days before.` : null;
    if (!list.length) return section(h, "perf", "How the ads are doing", lede, h("div", { class: "rp-card rp-empty", text: "No ads have run in the last 14 days." }), fresh(h, r));
    const cards = list.map((c) => {
      const L = lab(c.now.result_key), m = money?.campaigns?.[c.id];
      const hasResult = c.now.result_key && c.now.result_key !== "reach";
      const figs = [fig(h, "people reached", nf(c.now.reach), null, change(c.now.reach, c.prev?.reach)),
        fig(h, "clicks", nf(c.now.clicks), null, change(c.now.clicks, c.prev?.clicks))];
      if (hasResult) figs.push(fig(h, L[0], nf(c.now.results), null, change(c.now.results, c.prev?.results)));
      if (hasResult && m) figs.push(fig(h, "cost per " + L[1], eur(m.now.cost_per_result, cur), null, change(m.now.cost_per_result, m.prev?.cost_per_result, "down")));
      if (m) figs.push(fig(h, "paid to Meta", eur(m.now.spend, cur), null, change(m.now.spend, m.prev?.spend, null)));
      const ads = c.ads || [];
      let adsBox = null;
      if (ads.length) {
        const mo = (a) => money?.ads?.[a.id];
        const body = phone
          ? h("div", { class: "rp-adcards" }, ...ads.map((a) => h("div", { class: "rp-adcard" }, h("b", { text: nm(a) }),
              h("span", { text: `${nf(a.reach)} people reached · ${nf(a.clicks)} clicks` + (a.result_key && a.result_key !== "reach" ? ` · ${nf(a.results)} ${lab(a.result_key)[0]}` : "") + (mo(a)?.cost_per_result != null ? ` · ${eur(mo(a).cost_per_result, cur)} each` : "") }))))
          : h("table", { class: "rp-table" },
              h("thead", {}, h("tr", {}, h("th", { text: "Ad" }), h("th", { text: "People reached" }), h("th", { text: "Clicks" }), h("th", { text: cap(L[0]) }),
                money ? h("th", { text: "Cost per " + L[1] }) : null, money ? h("th", { text: "Paid to Meta" }) : null)),
              h("tbody", {}, ...ads.map((a) => h("tr", {}, h("td", { text: nm(a) }), h("td", { text: nf(a.reach) }), h("td", { text: nf(a.clicks) }),
                h("td", { text: a.result_key && a.result_key !== "reach" ? nf(a.results) : "–" }),
                money ? h("td", { text: eur(mo(a)?.cost_per_result, cur) }) : null, money ? h("td", { text: eur(mo(a)?.spend, cur) }) : null))));
        adsBox = h("details", { class: "rp-ads" }, h("summary", { text: `See the ${ads.length} ${ads.length === 1 ? "ad" : "ads"} (last 14 days)` }), body);
      }
      return h("article", { class: "rp-card rp-camp" },
        h("h3", { class: "rp-h3", text: nm(c) }),
        hasResult ? null : h("p", { class: "rp-meta", text: "This campaign is paid to reach people, so people reached is its result." }),
        h("div", { class: "rp-figs" }, ...figs), chart(h, c), adsBox);
    });
    return section(h, "perf", "How the ads are doing", lede, h("div", { class: "rp-stack" }, ...cards), fresh(h, r));
  }

  function results(h, r, money, cur, ctx, team) {
    const mo = r.figures.month, best = r.figures.best_ad, kids = [];
    if (mo) {
      const mm = money?.month;
      const figs = [fig(h, "people reached", (mo.accounts_added ? "about " : "") + nf(mo.reach)), fig(h, "clicks", nf(mo.clicks))];
      for (const [k, n] of Object.entries(mo.results || {})) figs.push(fig(h, k, nf(n), mm?.cost_per?.[k] != null ? `${eur(mm.cost_per[k], cur)} each` : null));
      if (mm) figs.push(fig(h, "paid to Meta", eur(mm.spend, cur)));
      kids.push(h("div", { class: "rp-card" }, h("h3", { class: "rp-h3", text: `${monthName(mo.from)} so far` }),
        h("p", { class: "rp-meta", text: `${dshort(mo.from)} to ${dshort(mo.to)}, all ads together` }), h("div", { class: "rp-figs" }, ...figs)));
    } else kids.push(h("div", { class: "rp-card rp-empty", text: "The month's totals start from the 2nd of the month." }));
    if (best) {
      const L = lab(best.result_key), bm = money?.best_ad;
      const pic = best.picture ? h("img", { class: "rp-best-img", src: ctx.mediaUrl(best.picture), alt: "The best ad this month", loading: "lazy",
        onerror: (e) => { e.target.dataset.bad = "1"; bestBox?.classList.remove("rp-haspic"); e.target.remove(); } }) : null;      // no picture: the gap closes
      let bestBox = null;
      kids.push(h("article", { class: "rp-card rp-best" + (pic ? " rp-haspic" : "") }, pic,
        h("div", { class: "rp-best-t" }, h("span", { class: "rp-kicker", text: "Best ad this month" }), h("h3", { class: "rp-h3", text: nm(best) }),
          h("p", { class: "rp-meta", text: "In " + nm({ id: best.campaign_id, name: best.campaign }) }),
          h("div", { class: "rp-figs rp-figs-2" }, fig(h, L[0], nf(best.results)), fig(h, "people reached", nf(best.reach)),
            bm?.cost_per_result != null ? fig(h, "cost per " + L[1], eur(bm.cost_per_result, cur)) : null))));
      bestBox = kids[kids.length - 1];
      if (pic?.dataset.bad) bestBox.classList.remove("rp-haspic");      // it failed before the box existed
    }
    const note = r.note;
    if (note) kids.push(h("article", { class: "rp-card rp-note" }, h("span", { class: "rp-kicker", text: "A note from M7Alpha" }),
      h("p", { class: "rp-note-t", text: note.text }), note.at ? h("p", { class: "rp-meta", text: "Written " + stamp(note.at) }) : null));
    else if (team) kids.push(h("div", { class: "rp-card rp-teamonly", text: "No note yet. The client's session writes it with panel_reports_admin.py note (only our team sees this line)." }));
    return section(h, "results", "Results", null, h("div", { class: "rp-stack" }, ...kids), fresh(h, r));
  }

  function organic(h, r) {
    const o = r.figures.organic;
    if (!o || !o.count) return null;
    const posts = (o.posts || []).slice(0, 6).map((p) => h("a", { class: "rp-post", href: p.link || undefined, target: "_blank", rel: "noopener" },
      p.picture ? h("img", { class: "rp-post-img", src: p.picture, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: (e) => e.target.remove() }) : null,
      h("div", { class: "rp-post-b" },
        h("span", { class: "rp-meta", text: `${p.network}${p.reel ? " reel" : ""} · ${dshort(p.date)}` }),
        h("p", { class: "rp-post-t", text: p.text || "(no words)" }),
        h("span", { class: "rp-post-n", text: `${nf(p.reach)} ${p.reach === 1 ? "person" : "people"} reached · ${nf(p.reactions)} ${p.reactions === 1 ? "like, comment or share" : "likes, comments and shares"}` }))));
    return section(h, "posts", "Your posts", `Facebook and Instagram, ${dshort(o.from)} to ${dshort(o.to)}. Figures from Metricool.`,
      h("div", { class: "rp-card" }, h("div", { class: "rp-figs" }, fig(h, "posts", nf(o.count)), fig(h, "people reached (added up)", nf(o.reach)), fig(h, "likes, comments and shares", nf(o.reactions)))),
      h("div", { class: "rp-posts" }, ...posts), fresh(h, r));
  }

  function teamBar(h, r, ctx, el) {
    const accts = (r.figures?.accounts || []).map((a) => a.name).join(", ") || "none mapped";
    const btn = h("button", { type: "button", class: "rp-btn", "aria-pressed": String(!!r.show_spend),
      onclick: async () => {
        const on = !r.show_spend;
        const ok = await ctx.confirm(on ? `Show what was paid to Meta, budgets and cost per result to ${ctx.clientName || "this client"}'s people?` : `Hide money figures from ${ctx.clientName || "this client"}'s people?`, on ? "Show" : "Hide");
        if (!ok) return;
        try { const x = await ctx.rpc("report_set_show_spend", { p_client_code: ctx.code, p_on: on }); if (x?.error) throw new Error(x.error);
          say(ctx, on ? "Money figures now show to the client." : "Money figures are hidden from the client."); render(el, ctx, true);
        } catch (e) { say(ctx, "That didn't save. Please try again."); }
      } }, r.show_spend ? "Client sees money: yes" : "Client sees money: no");
    return h("div", { class: "rp-team" },
      h("p", { class: "rp-team-t" }, h("b", { text: "Only our team sees this box. " }), `Meta accounts read: ${accts}. LinkedIn and Google ads: not connected yet.`),
      btn);
  }

  // ---------- the page ----------
  async function render(el, ctx, force) {
    const h = ctx.h;
    el.classList.add("rp-page");
    el.replaceChildren(h("p", { class: "rp-loading", text: "Loading the report…" }));
    let r;
    try { r = await getReport(ctx, force); } catch (e) { el.replaceChildren(h("p", { class: "rp-locked", text: "The report can't load right now. Please try again." })); return; }
    if (!r || r.error) {
      el.replaceChildren(h("div", { class: "rp-locked" }, h("h1", { class: "rp-h1", text: "Reports" }),
        h("p", { text: "Reports isn't switched on for this link yet. Ask M7Alpha if you'd like to see it." })));
      return;
    }
    NAMES = (r.names && typeof r.names === "object") ? r.names : {};
    const team = !!(ctx.team && r.team);
    const head = h("header", { class: "rp-head" }, h("h1", { class: "rp-h1", text: "Reports" }),
      h("p", { class: "rp-lede", text: (ctx.clientName ? ctx.clientName + ": " : "") + "what's running, how it's doing, and what it brought in." }));
    if (!r.figures) {
      el.replaceChildren(...[head, team ? teamBar(h, { figures: null, show_spend: r.show_spend }, ctx, el) : null,
        h("div", { class: "rp-card rp-empty", text: "No figures yet. The first report arrives after the next morning update." })].filter(Boolean));
      return;
    }
    const money = r.money || null, cur = r.figures.currency || "EUR", phone = ctx.phone ? ctx.phone() : false;
    const secs = [active(h, r, money, cur), performance(h, r, money, cur, phone), results(h, r, money, cur, ctx, team), organic(h, r)].filter(Boolean);
    const nav = h("nav", { class: "rp-nav", "aria-label": "Sections" }, ...secs.map((s) => h("button", { type: "button", class: "rp-chip",
      onclick: () => s.scrollIntoView({ behavior: "smooth", block: "start" }) }, s.querySelector(".rp-h2").textContent)));
    // [25 Nov 2026] the frost only while the buttons are stuck to the top of a scrolled page
    const stuck = () => { if (!nav.isConnected) return removeEventListener("scroll", stuck); nav.classList.toggle("rp-stuck", scrollY > 0 && nav.getBoundingClientRect().top <= 1); };
    addEventListener("scroll", stuck, { passive: true }); requestAnimationFrame(stuck);
    el.replaceChildren(...[head, team ? teamBar(h, r, ctx, el) : null, nav, ...secs].filter(Boolean));
  }

  // ---------- three or four headline figures for the Dashboard (builder 1) ----------
  // Resolves to null when this visitor may not see Reports (the Dashboard then leaves its box out), else
  // { updated, note, figures: [{ label, value, sub }] }. Money appears only when the database sent it.
  async function summary(ctx) {
    let r;
    try { r = await getReport(ctx); } catch (e) { return null; }
    if (!r || r.error || !r.figures) return r && !r.error ? { updated: null, figures: [], note: "No figures yet." } : null;
    const f = r.figures, m = r.money, cur = f.currency || "EUR", out = [];
    const mo = f.month;
    if (mo) {
      const top = Object.entries(mo.results || {}).sort((a, b) => b[1] - a[1])[0];
      if (top) out.push({ label: top[0] + ` in ${monthName(mo.from)}`, value: nf(top[1]), sub: m?.month?.cost_per?.[top[0]] != null ? `${eur(m.month.cost_per[top[0]], cur)} each` : null });
      out.push({ label: `people reached in ${monthName(mo.from)}`, value: nf(mo.reach), sub: null });
    }
    const live = (f.active || []).length;
    out.push({ label: live === 1 ? "campaign running now" : "campaigns running now", value: String(live), sub: null });
    if (m?.month) out.push({ label: `paid to Meta in ${monthName(mo.from)}`, value: eur(m.month.spend, cur), sub: null });
    return { updated: r.fetched_at, note: "Figures can still change for a day or two.", figures: out.slice(0, 4) };
  }

  window.M7Reports = { summary, render: (el, ctx) => render(el, ctx, true) };
  (window.StudioPanelsQueue ||= []).push({ name: "reports", type: "Reports", page: { label: "Reports", needsPerson: true, teamOnly: true, render: (el, ctx) => render(el, ctx) } });
})();
