/* [PART R4-pages, 26 Nov 2026] Release 4: the client's Home, Content and Calendar pages (laptop). Owner: Builder B.
   window.R4P = { render(page, el, opts), channelIcon(name), channelIcons(list), closePop(), shortTitle(t), typeName(piece),
                  dayLabel("YYYY-MM-DD") }
     render("home" | "content" | "calendar", el, opts)  draws the page into el (the page's #app, inside the shell's frame).
       opts.row (Content only): the row key to bring into view and highlight ("From your task on Home").
   Reads only: R4D (src\r4_data.js) and the page's own globals (S, h, PCTX, r3Docs, r3Fig, isArticle, mediaUrl).
   Every piece opens through window.R4C.open(id, { rowKey }); moving between pages goes through window.R4.go(page, opts).
   It never writes anything, never sends anything. */
(function () {
  "use strict";
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toDate = (s) => new Date(String(s).slice(0, 10) + "T12:00:00");
  const today = () => iso(new Date());
  const dayLabel = (s) => { if (!s) return ""; const d = toDate(s); return isNaN(d) ? String(s) : `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };      // "Mon 1 Dec"
  const shortDay = (s) => { if (!s) return ""; const d = toDate(s); return isNaN(d) ? String(s) : `${d.getDate()} ${MON[d.getMonth()]}`; };      // "1 Dec"
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const monday = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); const k = (x.getDay() + 6) % 7; return addDays(x, -k); };
  // no word alone on the last line of a sentence: the last two words are joined with a no-break space
  const nw = (s) => { s = String(s || "").trim().replace(/(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/g, "$1 $2"); const i = s.lastIndexOf(" "); return i > 0 && s.split(" ").length > 2 ? s.slice(0, i) + " " + s.slice(i + 1) : s; };      // [main session] a day and its month never split; the last two words stay together
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // ---------- channel icons (shared: R4P.channelIcon, also used by the opened card) ----------
  const CH = {
    instagram: { cls: "ig", name: "Instagram", html: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="4.2"/><circle cx="12" cy="12" r="3.3"/><circle cx="16.4" cy="7.6" r=".9" class="f"/></svg>' },
    facebook: { cls: "fb", name: "Facebook", txt: "f" },
    linkedin: { cls: "li", name: "LinkedIn", txt: "in" },
    tiktok: { cls: "tt", name: "TikTok", html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5v9.2a2.9 2.9 0 1 1-2.4-2.85"/><path d="M13.5 5.2c.6 2 2 3.2 4 3.4"/></svg>' },
    google: { cls: "gg", name: "Google", txt: "G" },
    youtube: { cls: "yt", name: "YouTube", html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="f" d="M10 8.5v7l6-3.5z"/></svg>' },
  };
  const CH_ORDER = ["instagram", "facebook", "linkedin", "tiktok", "google", "youtube"];
  const chKey = (n) => { const k = String(n || "").toLowerCase().replace(/[^a-z]/g, ""); return k === "ig" ? "instagram" : k === "fb" ? "facebook" : k === "li" ? "linkedin" : k; };
  const chName = (n) => (CH[chKey(n)] || {}).name || (String(n || "").slice(0, 1).toUpperCase() + String(n || "").slice(1));
  function channelIcon(name) {
    const k = chKey(name), c = CH[k] || { cls: "xx", name: chName(name), txt: String(name || "?").slice(0, 1).toUpperCase() };
    const el = h("span", { class: "r4p-ch r4p-ch-" + c.cls, title: c.name, role: "img", "aria-label": c.name });
    if (c.html) el.innerHTML = c.html; else el.append(h("span", { "aria-hidden": "true", text: c.txt }));
    return el;
  }
  const channelIcons = (list) => h("span", { class: "r4p-chs" }, ...sortCh(list).map(channelIcon));
  const sortCh = (list) => [...new Set((list || []).map(chKey))].sort((a, b) => (CH_ORDER.indexOf(a) + 99) % 99 - (CH_ORDER.indexOf(b) + 99) % 99);

  // ---------- words for a piece ----------
  const DATE_PART = /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s+\d{1,2}\s+[a-z]{3,}/i;
  function shortTitle(t) {          // "Post 2 · Thu 3 Dec · Two partners, on every file" -> "Two partners, on every file"
    const parts = String(t || "").split(/\s+·\s+/).map((s) => s.trim()).filter(Boolean);
    const keep = parts.filter((s) => !/^(post|ad|advert|story|reel|carousel|video|article)\s*\d+$/i.test(s) && !DATE_PART.test(s) && !/^(pick one|lead form)$/i.test(s));
    return keep.length ? keep[keep.length - 1] : parts[parts.length - 1] || "";
  }
  function typeName(p) {
    if (!p) return "";
    if (p.choice) return "Pick one";
    if (p.panel) return /report/i.test(p.title) ? "Report" : p.kindLabel || "Document";
    try { if (p.it && typeof isArticle === "function" && isArticle(p.it)) return "Article"; } catch (e) {}
    if (p.lib && /article/i.test(p.lib.group || "")) return "Article";
    if (/^lead form\b/i.test(p.title) || (p.lib && /lead form/i.test(p.lib.group || ""))) return "Lead form";
    return p.kindLabel || "Post";
  }
  const MANY = { Post: "posts", Advert: "adverts", Article: "articles", Story: "Stories", Carousel: "carousels", "Lead form": "lead forms", Video: "videos", Reel: "reels", "Photo set": "photo sets", "Pick one": "choices" };
  const countWords = (ps) => { const ts = [...new Set(ps.map((p) => p.choice ? p.kindLabel || "Post" : typeName(p)))]; const n = ps.length; return ts.length === 1 && MANY[ts[0]] ? `${n} ${n === 1 ? ts[0].toLowerCase().replace(/^story$/, "Story") : MANY[ts[0]]}` : plural(n, "piece", "pieces"); };
  const ST_CLS = { wait: "wait", change: "chg", approve: "pub", choose: "pub", scheduled: "sch", published: "pub", done: "plan" };
  const stChip = (p, short) => h("span", { class: "r4p-chip r4p-c-" + (ST_CLS[p.status] || "plan"), text: short && p.status === "wait" ? "Waiting" : p.statusLabel || "Planned" });
  const docLen = (p) => { const c = p.panel && p.panel.c, d = (c && c.data) || {}; const n = +(d.page_count || (Array.isArray(d.pages) ? d.pages.length : 0)); return n ? plural(n, "page", "pages") : ""; };
  const docBy = (p) => { const c = p.panel && p.panel.c; return (c && (c.answer_by || (c.data && c.data.answer_by))) || null; };
  const GRAD = ["#2b6c73,#163a40", "#4a5a78,#1e2638", "#7aa35a,#2d4a1e", "#b8574a,#5a2219", "#5d6b70,#262d30", "#a8742a,#5e3d0c"];
  const gradOf = (id) => { let s = 0; for (const c of String(id || "")) s = (s * 31 + c.charCodeAt(0)) >>> 0; return `linear-gradient(160deg,${GRAD[s % GRAD.length]})`; };
  const isTall = (p) => { if (p.kind === "story" || p.kind === "reel") return true; const m = p.media && p.media[0]; return !!(m && m.width && m.height && m.height / m.width >= 1.6); };
  const thumbFor = (m) => { try { return m ? mediaUrl(m.type === "video" ? (m.poster || m.path) : m.path) : null; } catch (e) { return null; } };

  // ---------- moving around ----------
  function openPiece(id, rowKey) { closePop(); try { if (window.R4C && R4C.open) R4C.open(id, { rowKey: rowKey || (window.R4D && R4D.rowOf(id)) || null }); } catch (e) { console.warn("R4P open", e); } }
  function go(page, opts) { closePop(); try { if (window.R4 && R4.go) R4.go(page, opts || {}); } catch (e) { console.warn("R4P go", e); } }
  function goReports() { closePop(); try { if (window.R4 && R4.go) R4.go(null, { r3: "reports" }); } catch (e) {} try { if (typeof r3Go === "function") r3Go("reports"); } catch (e) { console.warn("R4P reports", e); } }

  // ---------- small parts ----------
  const ICON = {
    content: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4M9.5 12h5M9.5 15.5h5"/></svg>',
    report: '<svg viewBox="0 0 24 24"><path d="M5 19.5h14M7.5 16v-4M12 16V7.5M16.5 16v-6"/></svg>',
    pickone: '<svg viewBox="0 0 24 24"><path d="M5 8.5h13l-3.5-3.5M19 15.5H6l3.5 3.5"/></svg>',
    article: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/></svg>',
    story: '<svg viewBox="0 0 24 24"><rect x="7.5" y="3.5" width="9" height="17" rx="2"/></svg>',
  };
  const ico = (k) => h("span", { class: "r4p-ico", "aria-hidden": "true", html: ICON[k] || ICON.content });
  function taskIcon(t) {
    if (t.kind === "pickone") return "pickone";
    if (t.kind === "doc") return /report/i.test(t.name) ? "report" : "doc";
    const ts = [...new Set(t.pieces.map(typeName))];
    return ts.length === 1 ? ({ Article: "article", Story: "story" }[ts[0]] || "content") : "content";
  }
  function taskType(t) {
    if (t.kind === "pickone") return "Pick one";
    if (t.kind === "doc") return typeName(t.pieces[0]) || "Document";
    const ts = [...new Set(t.pieces.map(typeName))];
    return ts.length === 1 && ts[0] === "Article" ? "Articles" : "Content";
  }
  function figures() {          // "This month": leads and cost per lead (cost per lead rounded, "around"); never lead quality
    const L = S.data && S.data.client && S.data.client.dash_leads, fs = (L && Array.isArray(L.figures)) ? L.figures : [];
    const out = [];
    for (const f of fs) {
      const k = String(f.key || ""), lab = String(f.label || "");
      if (/quality/i.test(k + " " + lab)) continue;
      let big = null; try { const r = typeof r3Fig === "function" ? r3Fig(f) : null; big = r && r.big; } catch (e) {}
      if (k === "new_month") out.push({ o: 0, label: "Leads", big: big || String(f.value), small: "New this month" });
      else if (k === "cpl" || /cost per lead/i.test(lab)) { if (big) out.push({ o: 1, label: "Cost per lead", big, small: "Opens Reports" }); }
      else if (k === "best_source" && f.value) { const v = String(f.value); out.push({ o: 2, label: "Best source", big: v.split(/[:,]/)[0], small: v.split(/[:,]/).slice(1).join(",").trim() || "Opens Reports" }); }
    }
    return { list: out.sort((a, b) => a.o - b.o).slice(0, 2), asOf: L && L.as_of };
  }
  function art(p, w, hgt, opts) {          // the picture of a tile (or a coloured stand-in with the words when there is none)
    const o = opts || {}, m = o.media || (p.media && p.media[0]), src = o.media ? thumbFor(o.media) : p.thumb || thumbFor(m);
    const box = h("div", { class: "r4p-art", style: `width:${w}px;height:${hgt}px;background:${gradOf(p.id + (o.k || ""))}` });
    if (src) box.append(h("img", { src, alt: "", loading: "lazy", decoding: "async", draggable: "false" }));
    else box.append(h("span", { class: "r4p-artw", text: nw(o.words || shortTitle(p.title)) }));
    if (m && m.type === "video") box.append(h("span", { class: "r4p-play", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24"><path d="M9 7v10l8-5z"/></svg>' }));
    return box;
  }

  // ---------- floating cards (Calendar) ----------
  let POP = null;
  function closePop() { if (POP) { POP.remove(); POP = null; } }
  function placePop(pop, anchor) {
    document.body.append(pop); POP = pop;
    const r = anchor.getBoundingClientRect(), W = innerWidth, H = innerHeight, pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.right + 10; if (x + pw > W - 12) x = r.left - 10 - pw; if (x < 12) x = Math.max(12, Math.min(W - pw - 12, r.left));
    let y = r.top - 8; if (y + ph > H - 12) y = H - ph - 12; if (y < 12) y = 12;
    pop.style.left = Math.round(x) + "px"; pop.style.top = Math.round(y) + "px";
    pop.querySelector("button")?.focus({ preventScroll: true });
  }
  document.addEventListener("mousedown", (e) => { if (POP && !POP.contains(e.target) && !e.target.closest(".r4p-ev, .r4p-more")) closePop(); }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && POP) { e.stopPropagation(); closePop(); } }, true);
  addEventListener("resize", closePop);
  document.addEventListener("scroll", (e) => { if (POP && !POP.contains(e.target)) closePop(); }, true);
  function pieceCard(p, anchor) {
    closePop();
    const rowKey = R4D.rowOf(p.id);
    const when = [p.date ? dayLabel(p.date) + (p.time ? ", " + p.time : "") : "", p.campaign].filter(Boolean).join(" · ");
    const pop = h("div", { class: "r4p r4p-pop", role: "dialog", "aria-label": shortTitle(p.title) || typeName(p) },
      h("div", { class: "r4p-poph" }, h("span", { class: "r4p-chip r4p-c-type", text: typeName(p) }), stChip(p), h("span", { class: "r4p-sp" }), channelIcons(p.platforms),
        h("button", { type: "button", class: "r4p-x", "aria-label": "Close", onclick: closePop, html: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>' })),
      h("div", { class: "r4p-popt", text: nw(shortTitle(p.title) || typeName(p)) }),
      when ? h("div", { class: "r4p-pops", text: when }) : null,
      art(p, 298, 150),
      h("div", { class: "r4p-popb" }, ...(p.waiting && p.choice ? [h("button", { type: "button", class: "r4p-btn r4p-dark", onclick: () => openPiece(p.id, rowKey) }, "Open to pick one")]
        : p.waiting ? [h("button", { type: "button", class: "r4p-btn r4p-dark", onclick: () => openPiece(p.id, rowKey) }, "Open to review")]      // [review 26 Nov] no Approve here: it could only open the card
        : [h("button", { type: "button", class: "r4p-btn r4p-dark", onclick: () => openPiece(p.id, rowKey) }, "Open")])));
    placePop(pop, anchor);
  }
  function dayCard(day, ps, anchor) {
    closePop();
    const pop = h("div", { class: "r4p r4p-pop r4p-dayp", role: "dialog", "aria-label": dayLabel(day) },
      h("div", { class: "r4p-poph" }, h("b", { class: "r4p-popd", text: dayLabel(day) }), h("span", { class: "r4p-sp" }),
        h("button", { type: "button", class: "r4p-x", "aria-label": "Close", onclick: closePop, html: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>' })),
      h("div", { class: "r4p-dayl" }, ...ps.map((p) => evBox(p, (b) => pieceCard(p, anchor)))));
    placePop(pop, anchor);
  }

  // ---------- HOME ----------
  function renderHome(root) {
    try { if (typeof r3Docs === "function") r3Docs(); } catch (e) {}
    const tasks = R4D.tasks(), [first, ...rest] = tasks, n = tasks.length;
    const hr = new Date().getHours(), hello = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
    let who = ""; try { who = String(S.me || PCTX.name || "").trim().split(/\s+/)[0] || ""; } catch (e) {}
    const td = new Date();
    const top = h("div", { class: "r4p-top" },
      h("div", {}, h("h1", { class: "r4p-h1", text: hello + (who ? ", " + who : "") }),
        h("p", { class: "r4p-sub", text: homeLine(n) })),
      h("span", { class: "r4p-datebox", text: `${WD[td.getDay()]} ${td.getDate()} ${MON[td.getMonth()]}` }));
    let hero;
    if (first) {
      const c = first.kind === "doc" && first.pieces[0] && first.pieces[0].panel ? first.pieces[0].panel.c : null;
      const q = c && c.data && c.data.walkthrough && c.data.walkthrough.question && c.data.walkthrough.question.text;
      const details = first.kind === "doc" ? [first.sub, q ? "1 question" : "", first.by ? "Answer by " + dayLabel(first.by) : ""]
        : first.kind === "pickone" ? ["Pick one", plural((first.pieces[0].choice.options || []).length || 2, "option", "options") + " side by side", first.by ? "Answer by " + dayLabel(first.by) : ""]
        : [countWords(first.pieces), first.ok ? `${first.ok} of ${first.total} approved` : "", first.by ? "Answer by " + dayLabel(first.by) : ""];
      // up to three small boxes, only when the task has useful parts
      let parts = [];
      if (first.kind === "content") parts = first.pieces.slice(0, 3).map((p) => [p.date ? dayLabel(p.date) : typeName(p), shortTitle(p.title)]);
      else if (first.kind === "pickone") parts = (first.pieces[0].choice.options || []).slice(0, 3).map((o, k) => ["Option " + String.fromCharCode(65 + k), String(o.label || "").replace(/^[A-Z]\s+/, "")]);
      else if (c && c.data && c.data.walkthrough && Array.isArray(c.data.walkthrough.slides)) parts = c.data.walkthrough.slides.map(slidePart).filter(Boolean).slice(0, 3);
      parts = parts.filter((x) => x[1]);
      hero = h("section", { class: "r4p-hero", "aria-label": "Next for you" },
        h("div", { class: "r4p-herot" }, h("div", { class: "r4p-k", text: "Next for you" }), h("h2", { class: "r4p-ask", text: nw(first.ask) }),
          h("div", { class: "r4p-herom", text: details.filter(Boolean).join(" · ") })),
        // [main session, 26 Nov 2026] Lee: the first card "a dimension more similar to the drawn red box": it sits in the
        // left column (beside This month and Coming up) and is taller, with the small boxes and Start along its foot
        h("div", { class: "r4p-herobot" },
          parts.length ? h("div", { class: "r4p-hw" }, ...parts.map(([b, t]) => h("div", {}, h("b", { text: b }), h("span", { text: t })))) : h("span", { class: "r4p-hw" }),
          h("button", { type: "button", class: "r4p-go", onclick: () => startTask(first) }, "Open", h("i", { "aria-hidden": "true" }))));      // Lee: "change 'start' to 'open'"
    } else {
      hero = h("section", { class: "r4p-hero r4p-calm", "aria-label": "Next for you" },
        h("span", { class: "r4p-tick", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24"><path d="M6 12.5 10.5 17 18.5 7.5"/></svg>' }),
        h("div", { class: "r4p-herot" }, h("div", { class: "r4p-k", text: "Next for you" }), h("h2", { class: "r4p-ask", text: "Nothing needs you right now." }),
          h("div", { class: "r4p-herom", text: nw("We'll tell you when something's ready.") })));
    }
    const taskCard = (t) => {
      const isC = t.kind === "content";
      const st = isC ? h("span", { class: "r4p-chip r4p-c-rev", text: `${t.pieces.length} to review` })
        : h("span", { class: "r4p-chip r4p-c-wait", text: t.by ? "Answer by " + shortDay(t.by) : "Waiting for you" });
      const sub = isC ? [countWords(t.pieces), t.by ? "answer by " + shortDay(t.by) : "", "opens Content at this row"]
        : [t.kind === "pickone" ? "2 options side by side" : t.sub, "opens here as a large card"];
      const act = () => startTask(t);
      return h("div", { class: "r4p-card r4p-task", onclick: (e) => { if (!e.target.closest("button")) act(); } },
        ico(taskIcon(t)),
        h("div", { class: "r4p-taskt" }, h("div", { class: "r4p-chips" }, h("span", { class: "r4p-chip r4p-c-type", text: taskType(t) }), st),
          h("b", { text: nw(t.name) }), h("small", { text: nw(sub.filter(Boolean).join(" · ")) })),
        h("button", { type: "button", class: "r4p-btn" + (isC ? "" : " r4p-dark"), onclick: act, "aria-label": (isC ? "Go to Content: " : "Open: ") + t.name }, isC ? "Go to Content ›" : "Open"));
    };
    const F = figures();
    const kpis = F.list.length ? h("div", {},
      h("div", { class: "r4p-sec" }, h("span", { text: "This month" }), F.asOf ? h("em", { text: "Figures from " + shortDay(F.asOf) }) : null),
      h("div", { class: "r4p-kpis" + (F.list.length === 1 ? " r4p-one" : "") }, ...F.list.map((f) => h("button", { type: "button", class: "r4p-card r4p-kpi", onclick: goReports, "aria-label": `${f.label}: ${f.big}. Opens Reports` },
        h("small", { text: f.label }), h("b", { text: f.big }), h("small", { text: f.small }))))) : null;
    const t0 = today();
    const soon = R4D.pieces().filter((p) => !p.panel && p.date && p.date >= t0).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))).slice(0, 4);
    const coming = h("div", {},
      h("div", { class: "r4p-sec" }, h("span", { text: "Coming up" })),
      soon.length ? h("div", { class: "r4p-card r4p-soon" }, ...soon.map((p) => { const d = toDate(p.date);
        return h("button", { type: "button", class: "r4p-mini", onclick: () => openPiece(p.id), "aria-label": `${dayLabel(p.date)}: ${shortTitle(p.title)}, ${p.statusLabel}` },
          h("span", { class: "r4p-mind" }, h("b", { text: String(d.getDate()) }), h("span", { text: WD[d.getDay()] })),
          h("span", { class: "r4p-mint" }, h("b", { text: shortTitle(p.title) || typeName(p) }),
            h("span", { class: "r4p-mins" }, channelIcons(p.platforms), p.time ? h("span", { text: p.time }) : null, stChip(p)))); }))
        : h("div", { class: "r4p-card r4p-soon r4p-none", text: "Nothing planned yet." }),
      h("div", { class: "r4p-right" }, h("button", { type: "button", class: "r4p-btn r4p-sm", onclick: () => go("calendar") }, "Open the Calendar ›")));
    // the first card heads the left column, the other tasks under it; This month and Coming up on the right from the top
    root.append(top, h("div", { class: "r4p-grid" },
      h("div", { class: "r4p-main" }, hero, ...(rest.length ? [h("div", { class: "r4p-sec" }, h("span", { text: "Also waiting for you" })), ...rest.map(taskCard)] : [])),
      h("div", { class: "r4p-side" }, kpis, coming)));
  }
  function slidePart(s) {          // one small box from a plan's own slide: its title and one short detail
    if (!s || !s.title || s.kicker) return null;
    const pts = Array.isArray(s.points) ? s.points : [], f = Array.isArray(s.figures) && s.figures[0];
    const clean = (x) => String(x || "").trim().replace(/[.:]+$/, "");
    let d = "";
    if (f && f.value) d = `${f.value} ${f.label || ""}`.trim();
    else if (pts.length && pts.every((x) => x && x.lead)) d = pts.slice(0, 3).map((x) => clean(x.lead)).join(", ");
    else if (s.numbered && pts.length) d = plural(pts.length, "step", "steps");
    else if (pts.length) d = clean(typeof pts[0] === "string" ? pts[0] : pts[0].text);
    else if (s.body) d = String(s.body);
    return d ? [String(s.title), d] : null;
  }
  function homeLine(n) {          // [review 26 Nov] tasks, then waiting pieces (the same count as the menu and Content's "Waiting for you")
    if (!n) return "Nothing needs your answer right now.";
    if (n === 1) return "You have one thing to look at. Start here.";
    // content pieces only, as Content counts them; documents and reports are among the "things" (Lee, 26 Nov 2026)
    let m = 0; try { m = R4D.pieces().filter((p) => p.waiting).length; } catch (e) {}
    // [review2 fix, 26 Nov] "5 things, including 16 pieces" did not add up (item 14): two sentences instead
    return `You have ${n} things to look at.` + (m > n ? ` ${m} pieces of content are waiting.` : "") + " Start with this one.";
  }
  function startTask(t) {
    if (!t) return;
    if (t.kind === "content") return go("content", { row: t.key });
    const p = t.pieces[0]; if (p) openPiece(p.id, t.key);
  }

  // ---------- grown tile on Content (main session, 26 Nov 2026) ----------
  // Lee: "when one hovers over card in content page ..., the card enlarges MODERATELY (by around 30%) and moves higher in
  // the z-axis (over neighbours) and, only when it is enlarged, shows the different action buttons (comment, approve,
  // open). clicking 'open' or clicking anywhere on the card then enlarges it fully". Articles grow 15% and show their
  // first line. The grown tile is a copy drawn over the page: the rows scroll sideways and would cut a tile growing in place.
  // Approve only where the tile shows the whole piece (one picture, not a video): carousels, videos, two sizes, articles
  // and choices say "Open to review" instead, so nobody approves slides or words they have not seen. Approve shows the
  // words first. Saves go through R4C.quick (the card's own note), with Undo.
  const HV = { el: null, timer: 0, out: 0, pinned: false, id: null, doneAt: 0, watch: 0, gone: 0, stage: "" };      // [review2 fix, 26 Nov] stage: "" | "busy" (Approve pressed, name box, saving) | "write" (comment box) | "done"
  const canHover = () => { try { return matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) { return false; } };
  const calm = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  function hvClose(force) {
    clearTimeout(HV.timer); clearTimeout(HV.out);
    if (!HV.el || (HV.pinned && !force)) return;
    clearInterval(HV.watch); HV.watch = 0; HV.gone = 0;      // [review2 fix, 26 Nov] see hvGuard
    HV.el.remove(); HV.el = null; HV.pinned = false; HV.id = null; HV.doneAt = 0; HV.stage = "";
  }
  // [review2 fix, 26 Nov] a card kept open (Approve or Comment pressed) stays through the page's redraw after an answer, but
  // not once Content has gone (another page from the menu, Back), the large card has opened, or something removed it
  function hvGuard() {
    if (!HV.el) return;
    if (!HV.el.isConnected) return hvClose(true);
    let gone = !document.querySelector("#app > .r4p-content");
    try { if (window.R4C && R4C.isOpen && R4C.isOpen()) gone = true; } catch (e) {}
    HV.gone = gone ? HV.gone + 1 : 0;
    if (HV.gone >= 2) hvClose(true);
  }
  // [review2 fix, 26 Nov] where the pointer really is. Chrome also fires "mouse enter" when the page moves under a pointer
  // that has not moved (a row's › arrow scrolling the row, the redraw after an answer): such a tile must not grow by itself,
  // nor take over an "Approved / Undo" card (review2 items 8 and 10). PT.real: the last mouse move changed the position.
  const PT = { x: -1, y: -1, real: false };
  addEventListener("mousemove", (e) => { PT.real = e.clientX !== PT.x || e.clientY !== PT.y; PT.x = e.clientX; PT.y = e.clientY; }, { capture: true, passive: true });
  const enterReal = (e) => PT.x < 0 || e.clientX !== PT.x || e.clientY !== PT.y;      // "mouse enter" fires before that move's "mouse move"
  function hvLater() { clearTimeout(HV.timer); clearTimeout(HV.out); if (HV.el && !HV.pinned) HV.out = setTimeout(() => hvClose(), 140); }
  function hvSoon(tileEl, p, rowKey) {
    if (HV.el && !HV.el.isConnected) hvClose(true);
    // an "Approved / Undo" card gives way to the next tile the person moves to, but not in its first moments. Callers pass
    // only real moves (see PT), so a tile that slides under a still pointer when the page redraws cannot take over
    // [review2 fix, 26 Nov: was any "mouse enter" after 1.5 s]
    if (HV.pinned && HV.doneAt && Date.now() - HV.doneAt > 400 && HV.id !== p.id) hvClose(true);
    if (!canHover() || HV.pinned) return;
    try { if (window.R4C && R4C.isOpen && R4C.isOpen()) return; } catch (e) {}
    clearTimeout(HV.out); clearTimeout(HV.timer);
    if (HV.el && HV.id === p.id) return;
    HV.timer = setTimeout(() => hvOpen(tileEl, p, rowKey), HV.el ? 70 : 260);
  }
  // Lee, second look (26 Nov 2026): "the card image enlarges by 30%, scaling up, to show a bigger view of the image + sees
  // three buttons at the bottom left [approve, comment, open]. caption remains hidden unless one clicks on the card". So the
  // grown tile is the picture alone, with the buttons on it; Approve saves at once (with Undo); the words stay in the card.
  function quickKind(p) {
    if (!p.waiting) return "done";
    if (p.choice) return "pick";          // a choice is made in the card, not approved from the tile
    return "ok";
  }
  function firstLine(p) {          // an article's first line of text (headings and picture marks skipped)
    const raw = String((p.it && p.it.caption) || (p.lib && p.lib.caption) || "").replace(/\r/g, ""), t = shortTitle(p.title).toLowerCase();
    for (let ln of raw.split(/\n+/)) {
      ln = ln.replace(/\[pic:[^\]]*\]/g, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").trim();
      if (!ln || /^#{1,6}\s/.test(ln) || ln.toLowerCase() === t) continue;
      return ln;
    }
    return "";
  }
  function hvOpen(tileEl, p, rowKey) {
    hvClose(true);
    if (!tileEl.isConnected) return;
    const pic = tileEl.querySelector(".r4p-art, .r4p-pick"); if (!pic) return;
    const isArt = typeName(p) === "Article", k = isArt ? 1.5 : 2;      // Lee: posts twice the size (100% bigger), articles 50%
    const r = pic.getBoundingClientRect(); if (r.width < 20 || r.bottom < 0 || r.top > innerHeight) return;
    // [review2 fix, 26 Nov] a pick one: the band above the two options held the tile's "Pick one" label, which the grown copy
    // leaves out; the copy is moved up by that band so no empty strip shows (item 11)
    const o1 = pic.classList.contains("r4p-pick") && pic.querySelector(".r4p-picko");
    const cut = o1 ? Math.max(0, Math.round(o1.getBoundingClientRect().top - r.top - 6)) : 0;
    const w = Math.round(r.width * k), ph = Math.round((r.height - cut) * k);
    const copy = pic.cloneNode(true);
    Object.assign(copy.style, { position: "absolute", left: "0", top: -cut * k + "px", width: r.width + "px", height: r.height + "px", transform: `scale(${k})`, transformOrigin: "0 0", margin: "0" });
    const open = () => { hvClose(true); openPiece(p.id, rowKey); };
    const picBtn = h("button", { type: "button", class: "r4p-hv-pic", "aria-label": "Open " + (shortTitle(p.title) || typeName(p)), onclick: open }, copy);
    // Lee: "can the buttons hover [without background], below the card?" and "can 'waiting for you' disappear when artwork
    // is enlarged". The grown picture sits in its own box; the buttons float under it with nothing behind them.
    // an article: its title and first line stay on the picture (the tile's own title is hidden in the copy)
    const head = isArt ? h("div", { class: "r4p-hv-head" }, h("b", { text: nw(shortTitle(p.title)) }), firstLine(p) ? h("span", { text: firstLine(p) }) : null) : null;
    const box = h("div", { class: "r4p-hv-box", style: `width:${w}px;height:${ph}px` }, picBtn, isArt ? h("span", { class: "r4p-hv-shade", "aria-hidden": "true" }) : null, head);
    const bar = h("div", { class: "r4p-hv-bar" });
    const card = h("div", { class: "r4p-hv" + (isArt ? " r4p-hv-art" : ""), role: "group", "aria-label": `${typeName(p)}: ${shortTitle(p.title) || typeName(p)}`,
      style: `width:${w}px`, onmouseenter: () => { clearTimeout(HV.out); }, onmouseleave: hvLater }, box, bar);
    // the status label goes while the tile is grown (the tile underneath keeps it); the slide count keeps its normal size
    [...copy.children].forEach((c) => { if (c.classList.contains("r4p-tl")) c.remove(); else if (c.classList.contains("r4p-n")) box.append(c); });
    const fill = (...kids) => bar.replaceChildren(...kids.filter((x) => x != null && x !== ""));      // (replaceChildren would print "null")
    const B = (label, cls, fn) => h("button", { type: "button", class: "r4p-hv-b" + (cls ? " " + cls : ""), onclick: fn }, label);
    const msgEl = (t, kind) => t ? h("p", { class: "r4p-hv-msg" + (kind ? " " + kind : ""), role: "status", text: t }) : null;
    const kind = quickKind(p);
    function buttons(note) {
      HV.pinned = false; HV.doneAt = 0; HV.stage = "";
      const acts = kind === "ok" ? [B("Approve", "main", approve), B("Comment", "", comment), B("Open", "", open)]
        : kind === "pick" ? [B("Comment", "", comment), B("Open to pick", "main", open)]
        : p.it ? [B("Comment", "", comment), B("Open", "main", open)] : [B("Open", "main", open)];
      fill(h("div", { class: "r4p-hv-acts" }, ...acts), note || null);
    }
    async function approve(e) {
      HV.pinned = true; HV.stage = "busy";
      const btn = e && e.currentTarget; if (btn) btn.disabled = true;
      const res = await R4C.quick(p.id, "approve");
      if (!res.ok) { buttons(msgEl(res.msg, "err")); HV.pinned = !!res.msg; return; }
      done("Approved", true);
    }
    function comment() {
      HV.pinned = true; HV.stage = "write";
      const ta = h("textarea", { class: "r4p-hv-ta", rows: "3", placeholder: "Write a comment, or the words you'd prefer", "aria-label": "Your comment" });
      const send = B("Send", "main", async () => {
        if (!ta.value.trim()) { ta.focus(); return; }
        send.disabled = true;
        const res = await R4C.quick(p.id, "comment", { comment: ta.value.slice(0, 5000) });
        if (!res.ok) { send.disabled = false; const m = bar.querySelector(".r4p-hv-msg"); if (m) m.remove(); if (res.msg !== "") bar.append(msgEl(res.msg || "That didn't send.", "err")); return; }      // [review2 fix, 26 Nov] "" = the name box was cancelled: no error
        done("Sent to the team", true);      // [review2 fix, 26 Nov] with Undo, as the big card offers after a comment (item 9)
      });
      // [review2 fix, 26 Nov] a comment asks for changes (Release 3's rule): say so before it is sent, as the side panel does (item 9)
      fill(h("div", { class: "r4p-hv-panel" }, ta, h("p", { class: "r4p-hv-hint", text: "A comment asks us to look at this piece again." }),
        h("div", { class: "r4p-hv-acts" }, B("Cancel", "", () => buttons()), send)));
      ta.focus({ preventScroll: true });
    }
    function done(text, canUndo) {
      HV.pinned = true; HV.doneAt = Date.now(); HV.stage = "done";
      const acts = [h("span", { class: "r4p-hv-done", role: "status" }, h("i", { "aria-hidden": "true", html: '<svg viewBox="0 0 20 20"><path d="m5 10.5 3.2 3.2L15 6.8"/></svg>' }), text)];
      if (canUndo) acts.push(B("Undo", "", async (e) => {
        e.currentTarget.disabled = true;
        const res = await R4C.quickUndo(p.id);
        if (!res.ok) { bar.append(msgEl(res.msg, "err")); return; }
        fill(h("div", { class: "r4p-hv-acts" }, h("span", { class: "r4p-hv-done", role: "status", text: "Taken back" }), B("Close", "", () => hvClose(true))));
      }));
      acts.push(B("Close", "", () => hvClose(true)));      // [review2 fix, 26 Nov] a press outside no longer closes it (items 2, 5)
      fill(h("div", { class: "r4p-hv-acts" }, ...acts));
    }
    buttons();
    document.body.append(card); HV.el = card; HV.id = p.id;
    HV.watch = setInterval(hvGuard, 400);      // [review2 fix, 26 Nov]
    // centred on the tile, kept on screen and clear of the left menu
    const app = document.getElementById("app"), minL = Math.max(8, app ? app.getBoundingClientRect().left + 4 : 8);
    const left = Math.min(Math.max(r.left + r.width / 2 - w / 2, minL), innerWidth - w - 10);
    const top = Math.min(Math.max(r.top + r.height / 2 - ph / 2, 8), innerHeight - card.offsetHeight - 10);
    Object.assign(card.style, { left: Math.round(left) + "px", top: Math.round(top) + "px" });
    card.style.transformOrigin = `${Math.round(r.left + r.width / 2 - left)}px ${Math.round(r.top + r.height / 2 - top)}px`;      // grows out of the tile
    if (!calm() && card.animate) card.animate([{ transform: `scale(${(1 / k).toFixed(3)})` }, { transform: "none" }], { duration: 170, easing: "cubic-bezier(.2,.8,.2,1)" });
  }
  // [review2 fix, 26 Nov] (items 2 and 5) Once Approve or Comment is pressed the card is kept: the name box asked on a first
  // answer, a comment being written, a save on its way, then "Approved" with Undo. A press outside no longer closes it (it
  // closed the card while the name was typed, and threw away a typed comment). Escape: the name box handles its own Escape
  // and the card stays; typed words or a save on its way keep the card (Cancel closes it); otherwise Escape closes it.
  const nameAsked = () => { const m = document.getElementById("modal"); return !!(m && !m.hidden && m.childElementCount); };
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !HV.el || nameAsked()) return;
    e.stopPropagation();
    const ta = HV.el.querySelector(".r4p-hv-ta");
    if (ta ? ta.value.trim() : HV.stage === "busy") return;
    hvClose(true);
  }, true);
  // only the person's own scrolling closes it (the page's redraw after an answer also scrolls, and must not)
  addEventListener("wheel", (e) => { if (HV.el && !HV.pinned && !HV.el.contains(e.target)) hvClose(); }, { capture: true, passive: true });
  addEventListener("mousedown", (e) => { if (HV.el && !HV.stage && !HV.el.contains(e.target)) hvClose(true); }, true);
  // while a comment is written or a save is on its way, a click outside does nothing at all (it would open another piece or
  // page, and the words would be lost); the comment box gets the focus back
  addEventListener("click", (e) => {
    if (!HV.el || (HV.stage !== "busy" && HV.stage !== "write") || HV.el.contains(e.target) || nameAsked() || (e.target.closest && e.target.closest("#modal"))) return;
    e.preventDefault(); e.stopPropagation();
    const ta = HV.el.querySelector(".r4p-hv-ta"); if (ta) ta.focus({ preventScroll: true });
  }, true);
  addEventListener("resize", () => hvClose(true));

  // ---------- CONTENT ----------
  const CS = { filter: "all", wide: new Set(), showAbove: false, lastRow: null, task: null };
  const FILTERS = [["all", "All"], ["wait", "Waiting for you"], ["approve", "Approved"], ["scheduled", "Scheduled"], ["published", "Published"]];
  const passes = (p) => { const f = CS.filter; if (f === "all") return true; if (f.startsWith("ch:")) return (p.platforms || []).map(chKey).includes(f.slice(3));
    if (f === "approve") return p.status === "approve" || p.status === "choose"; return p.status === f; };
  function tile(p, rowKey) {
    const type = typeName(p), lab = `${type}: ${shortTitle(p.title) || type}. ${p.statusLabel}`;
    let pic, meta;
    if (p.panel) {
      const by = docBy(p);
      pic = h("div", { class: "r4p-art r4p-page", style: "width:168px;height:210px" }, h("span", { class: "r4p-chip r4p-c-type r4p-tl", text: type }),
        h("span", { class: "r4p-lns", "aria-hidden": "true" }, h("i", { class: "w" }), h("i"), h("i"), h("i", { class: "s" }), h("i"), h("i"), h("i", { class: "s" })),
        p.waiting ? h("span", { class: "r4p-chip r4p-c-wait r4p-bl", text: by ? "Answer by " + shortDay(by) : "Waiting for you" }) : h("span", { class: "r4p-bl" }, stChip(p)));
      meta = docLen(p) || (by ? "Answer by " + dayLabel(by) : "");
    } else if (p.choice && (p.media || []).length >= 2) {
      const opts = (p.choice.options || []).slice(0, 2);
      pic = h("div", { class: "r4p-pick" }, ...p.media.slice(0, 2).map((m, k) => h("div", { class: "r4p-picko" }, art(p, 136, 170, { media: m, k: String(k) }),
        h("span", { class: "r4p-chip r4p-c-opt", text: "Option " + String.fromCharCode(65 + k) }),
        opts[k] && opts[k].label ? h("span", { class: "r4p-pickl", text: String(opts[k].label).replace(/^[A-Z]\s+/, "") }) : null)),
        h("span", { class: "r4p-chip r4p-c-" + (ST_CLS[p.status] || "plan") + " r4p-tl", text: p.waiting ? "Pick one" : p.statusLabel }));
      meta = p.date ? dayLabel(p.date) : "";
    } else {
      const tall = isTall(p);
      // [main session, 26 Nov 2026] Lee: "for article cards, we need to add dark radial/linear gradient vignettes ... to
      // guarantee text contrast on image and then put the article title on the image, large"; then "show the article
      // cards as landscapes, title goes bottom left alignment, [lower thirds]". 336 x 210 keeps the row's height.
      const isArt = type === "Article";
      pic = art(p, isArt ? 336 : tall ? 150 : 168, isArt ? 210 : tall ? 267 : 210);
      if (isArt) pic.classList.add("r4p-land");
      const at = isArt && pic.querySelector("img") ? shortTitle(p.title) : "";
      if (at) pic.append(h("span", { class: "r4p-shade", "aria-hidden": "true" }),
        h("span", { class: "r4p-atl", "aria-hidden": "true", text: nw(at) }));      // one size for every article, so a row reads evenly
      pic.append(h("span", { class: "r4p-tl" }, stChip(p)));
      if (p.slides > 1) pic.append(h("span", { class: "r4p-n", text: "1/" + p.slides }));
      meta = p.date ? dayLabel(p.date) : "";
    }
    return h("button", { type: "button", class: "r4p-tile" + (p.choice ? " r4p-tilew" : ""), "data-id": p.id, "aria-label": lab, onclick: () => { hvClose(true); openPiece(p.id, rowKey); },
      // [review2 fix, 26 Nov] only a real move grows a tile (see PT): a tile that slid under a still pointer waits for the
      // next real move over it; a real move over another tile also lets an "Approved / Undo" card give way (items 8, 10)
      onmouseenter: (e) => { const t = e.currentTarget; if (!enterReal(e)) { t.__hvSkip = true; return; } t.__hvSkip = false; hvSoon(t, p, rowKey); },
      onmousemove: (e) => { const t = e.currentTarget; if (!PT.real || !(t.__hvSkip || (HV.doneAt && HV.id !== p.id))) return; t.__hvSkip = false; hvSoon(t, p, rowKey); },
      onmouseleave: (e) => { e.currentTarget.__hvSkip = false; hvLater(); } },
      pic, h("span", { class: "r4p-meta" }, h("b", { text: type }), meta ? " · " + meta : ""));
  }
  function rowEl(r, ps, opts) {
    // [27 Nov 2026] Lee: "I want all cards to be visible ... using multiple rows, instead of having a slider": every row wraps,
    // no arrows and no "See all"
    const o = opts || {}, wide = true;
    const waitN = r.pieces.filter((p) => p.waiting).length;
    const sub = o.lit ? countWords(r.pieces) : r.fromTask ? ["Task on Home", waitN ? `${waitN} to review` : "", r.by ? "answer by " + shortDay(r.by) : ""].filter(Boolean).join(" · ") : r.sub;
    const scroller = h("div", { class: "r4p-tiles" + (wide ? " r4p-wrap" : "") }, ...ps.map((p) => tile(p, r.key)));
    const more = h("button", { type: "button", class: "r4p-more r4p-next", "aria-label": "See more of " + r.title, hidden: true, html: "›", onclick: () => scroller.scrollBy({ left: scroller.clientWidth * .8, behavior: "smooth" }) });
    const back = h("button", { type: "button", class: "r4p-more r4p-prev", "aria-label": "Back", hidden: true, html: "‹", onclick: () => scroller.scrollBy({ left: -scroller.clientWidth * .8, behavior: "smooth" }) });
    const all = h("button", { type: "button", class: "r4p-link r4p-seeall", hidden: true, onclick: () => { wide ? CS.wide.delete(r.key) : CS.wide.add(r.key); R4P.render("content", ROOT_EL, Object.assign({}, LAST.opts, { keepScroll: true })); } },
      wide ? "Show as one line" : `See all ${ps.length} ›`);
    const head = h("div", { class: "r4p-rowh" }, h("b", { text: r.title }), sub ? h("small", { text: sub }) : null, all);
    const wrap = h("div", { class: "r4p-tw" }, scroller, back, more);
    const sec = h("section", { class: "r4p-row" + (o.lit ? " r4p-lit" : ""), "data-row": r.key, "aria-label": r.title });
    if (o.lit) {
      const first = r.pieces.find((p) => p.waiting) || r.pieces[0];
      sec.append(h("div", { class: "r4p-lith" }, h("span", { class: "r4p-chip r4p-c-lime", text: "From your task on Home" }),
        h("span", { class: "r4p-lits", text: [waitN ? `${waitN} to review` : "", r.by ? "answer by " + shortDay(r.by) : ""].filter(Boolean).join(" · ") }),
        first ? h("button", { type: "button", class: "r4p-btn r4p-dark r4p-sm", onclick: () => openPiece(first.id, r.key) }, waitN > 1 ? `Review all ${waitN}, one after another ›` : "Review it ›") : null));
    }
    sec.append(head, wrap);
    const check = () => { const over = scroller.scrollWidth > scroller.clientWidth + 2;
      if (!wide) all.hidden = !over; more.hidden = wide || !over || scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4; back.hidden = wide || scroller.scrollLeft < 4; };
    scroller.addEventListener("scroll", check, { passive: true });
    sec._check = check;
    return sec;
  }
  function renderContent(root, opts) {
    const rows = R4D.rows(), allP = rows.flatMap((r) => r.pieces);
    // a new arrival from a Home task starts clean, with that task chosen in the task line (Lee, 26 Nov 2026: "When one clicks on
    // content task from dashboard, then the task filter is activated to show only the contents of that task, but client can
    // click 'All tasks' to see everything instead - or to see the contents of another task")
    if (opts.row && !opts._redraw) { CS.filter = "all"; CS.showAbove = false; CS.task = rows.some((r) => r.key === opts.row && r.fromTask) ? opts.row : null; }
    else if (!opts.row && !opts._redraw) CS.task = null;
    if (CS.task && !rows.some((r) => r.key === CS.task)) CS.task = null;      // that task was finished meanwhile
    CS.lastRow = opts.row || null;
    const chans = sortCh(allP.flatMap((p) => p.platforms || []));
    const waitN = allP.filter((p) => p.waiting).length;
    const chip = (key, label) => h("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(CS.filter === key),
      onclick: () => { CS.filter = CS.filter === key && key !== "all" ? "all" : key; R4P.render("content", ROOT_EL, Object.assign({}, LAST.opts, { keepScroll: true })); } }, ...label);
    const filters = h("div", { class: "r4p-filters", role: "group", "aria-label": "Show" },
      ...FILTERS.map(([k, l]) => chip(k, [k === "wait" && waitN ? `${l} · ${waitN}` : l])),
      ...chans.map((c) => chip("ch:" + c, [channelIcon(c), chName(c)])));
    // the task line: All tasks, then one button for each task on Home (the "Approved" / "Published" rows show under All tasks)
    const taskRows = rows.filter((r) => r.fromTask);
    const pickTask = (key) => {
      CS.task = key; CS.showAbove = true;      // the green "From your task on Home" stays on the task the client came from
      R4P.render("content", ROOT_EL, Object.assign({}, LAST.opts, { keepScroll: true }));
    };
    const tasksLine = taskRows.length > 1 ? h("div", { class: "r4p-filters r4p-ftasks", role: "group", "aria-label": "Tasks" },
      h("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(!CS.task), onclick: () => pickTask(null) }, "All tasks"),
      ...taskRows.map((r) => { const n = r.pieces.filter((x) => x.waiting).length;
        return h("button", { type: "button", class: "r4p-fchip", "aria-pressed": String(CS.task === r.key), onclick: () => pickTask(CS.task === r.key ? null : r.key) }, n ? `${r.title} · ${n}` : r.title); })) : null;
    root.append(h("div", { class: "r4p-top" }, h("div", {}, h("h1", { class: "r4p-h1", text: "Content" }),
      h("p", { class: "r4p-sub", text: nw("Every post, Story and advert, grouped the same way as your tasks on Home.") }))), filters);
    if (tasksLine) root.append(tasksLine);
    const shown = rows.filter((r) => !CS.task || r.key === CS.task).map((r) => ({ r, ps: r.pieces.filter(passes) })).filter((x) => x.ps.length);
    if (!rows.length) { root.append(h("div", { class: "r4p-card r4p-empty" }, h("b", { text: "Nothing here yet." }), h("span", { text: nw("When we send you posts, Stories or adverts, they'll show here.") }))); return; }
    if (!shown.length) { root.append(h("div", { class: "r4p-card r4p-empty" }, h("b", { text: "Nothing matches this filter." }),
      h("button", { type: "button", class: "r4p-btn r4p-sm", onclick: () => { CS.filter = "all"; CS.task = null; R4P.render("content", ROOT_EL, LAST.opts); } }, "Show everything"))); return; }
    const at = opts.row ? shown.findIndex((x) => x.r.key === opts.row) : -1;
    const secs = [];
    if (at > 0 && !CS.showAbove && !CS.task) {
      root.append(h("button", { type: "button", class: "r4p-above", onclick: () => { CS.showAbove = true; R4P.render("content", ROOT_EL, LAST.opts); } },
        h("span", { "aria-hidden": "true", text: "↑ " }), shown.slice(0, at).map((x) => x.r.title).join(" · "), h("span", { class: "r4p-abs", text: " · show" })));
    }
    shown.forEach((x, k) => { if (at > 0 && k < at && !CS.showAbove && !CS.task) return; const s = rowEl(x.r, x.ps, { lit: k === at }); secs.push(s); root.append(s); });
    if (at >= 0 && !opts._redraw) root._scrollTo = () => { const lit = root.querySelector(".r4p-lit"); if (lit) lit.scrollIntoView({ block: "nearest" }); };
    requestAnimationFrame(() => secs.forEach((s) => s._check()));
  }
  addEventListener("resize", () => { document.querySelectorAll(".r4p-row").forEach((s) => s._check && s._check()); });

  // ---------- CALENDAR ----------
  const CAL = { y: null, m: null, mode: "month", wk: null };
  const DOT = { wait: "wait", change: "chg", approve: "pub", choose: "pub", published: "pub", scheduled: "sch", done: "plan" };
  function evBox(p, onpick) {
    return h("button", { type: "button", class: "r4p-ev r4p-ev-" + (DOT[p.status] || "plan"), "data-id": p.id, "aria-label": `${shortTitle(p.title) || typeName(p)}, ${p.time || ""} ${p.statusLabel}`,
      title: [shortTitle(p.title) || typeName(p), p.time, p.statusLabel].filter(Boolean).join(" · "),
      onclick: (e) => { e.stopPropagation(); onpick(e.currentTarget); } },
      h("span", { class: "r4p-evr" }, channelIcons(p.platforms), p.time ? h("span", { class: "r4p-evt", text: p.time }) : null),
      h("b", { text: shortTitle(p.title) || typeName(p) }), stChip(p, true));
  }
  function renderCalendar(root) {
    const now = new Date();
    if (CAL.y == null) { CAL.y = now.getFullYear(); CAL.m = now.getMonth(); }
    if (!CAL.wk) CAL.wk = monday(now);
    const all = R4D.pieces().filter((p) => !p.panel && p.date).sort((a, b) => String(a.time || "99").localeCompare(String(b.time || "99")));
    const byDay = new Map(); all.forEach((p) => { const k = String(p.date).slice(0, 10); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(p); });
    const redraw = () => R4P.render("calendar", ROOT_EL, LAST.opts);
    const shift = (d) => { if (CAL.mode === "week") { CAL.wk = addDays(CAL.wk, 7 * d); const th = addDays(CAL.wk, 3); CAL.y = th.getFullYear(); CAL.m = th.getMonth(); }
      else { const x = new Date(CAL.y, CAL.m + d, 1); CAL.y = x.getFullYear(); CAL.m = x.getMonth(); } redraw(); };
    const label = CAL.mode === "week" ? (() => { const a = CAL.wk, b = addDays(a, 6); return a.getMonth() === b.getMonth() ? `${a.getDate()} to ${b.getDate()} ${MONTH[b.getMonth()]} ${b.getFullYear()}` : `${a.getDate()} ${MON[a.getMonth()]} to ${b.getDate()} ${MON[b.getMonth()]} ${b.getFullYear()}`; })()
      : `${MONTH[CAL.m]} ${CAL.y}`;
    const seg = (k, l) => h("button", { type: "button", class: "r4p-segb", "aria-pressed": String(CAL.mode === k), onclick: () => {
      if (CAL.mode === k) return; CAL.mode = k;
      if (k === "week") { const t = new Date(); CAL.wk = (t.getFullYear() === CAL.y && t.getMonth() === CAL.m) ? monday(t) : monday(new Date(CAL.y, CAL.m, 1, 12)); }
      redraw(); } }, l);
    const nav = h("div", { class: "r4p-calnav" },
      h("button", { type: "button", class: "r4p-rnd", "aria-label": CAL.mode === "week" ? "Previous week" : "Previous month", onclick: () => shift(-1) }, "‹"),
      h("b", { class: "r4p-calmon", "aria-live": "polite", text: label }),
      h("button", { type: "button", class: "r4p-rnd", "aria-label": CAL.mode === "week" ? "Next week" : "Next month", onclick: () => shift(1) }, "›"),
      h("button", { type: "button", class: "r4p-btn r4p-sm", onclick: () => { const t = new Date(); CAL.y = t.getFullYear(); CAL.m = t.getMonth(); CAL.wk = monday(t); redraw(); } }, "Today"),
      h("span", { class: "r4p-seg", role: "group", "aria-label": "View" }, seg("month", "Month"), seg("week", "Week")));
    const chans = sortCh(all.flatMap((p) => p.platforms || []));
    const hasChg = all.some((p) => p.status === "change");
    const legend = h("div", { class: "r4p-legend" },
      h("span", {}, h("i", { class: "r4p-dot r4p-dot-wait" }), "Waiting for you"), h("span", {}, h("i", { class: "r4p-dot r4p-dot-pub" }), "Approved or published"),
      h("span", {}, h("i", { class: "r4p-dot r4p-dot-sch" }), "Scheduled"), hasChg ? h("span", {}, h("i", { class: "r4p-dot r4p-dot-chg" }), "Changes asked") : null,
      all.some((p) => p.status === "done") ? h("span", {}, h("i", { class: "r4p-dot r4p-dot-plan" }), "Planned") : null,
      h("span", { class: "r4p-sp" }), ...chans.map((c) => h("span", {}, channelIcon(c), chName(c))));
    root.append(h("div", { class: "r4p-top r4p-caltop" }, h("div", {}, h("h1", { class: "r4p-h1", text: "Calendar" }),
      h("p", { class: "r4p-sub", text: nw("Everything planned, waiting for you, scheduled or published.") })), nav), legend);
    const t0 = today();
    const hd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (CAL.mode === "week") {
      const cols = []; for (let i = 0; i < 7; i++) { const d = addDays(CAL.wk, i), k = iso(d), ps = byDay.get(k) || [];
        cols.push(h("div", { class: "r4p-wcol" + (k === t0 ? " r4p-today" : "") },
          h("div", { class: "r4p-wh" }, h("span", { text: hd[i] }), h("b", { text: String(d.getDate()) })),
          ...ps.map((p) => evBox(p, (b) => pieceCard(p, b))), ps.length ? null : h("span", { class: "r4p-wnone", text: "Nothing planned" }))); }
      root.append(h("div", { class: "r4p-week" }, ...cols));
      return;
    }
    const first = new Date(CAL.y, CAL.m, 1, 12), last = new Date(CAL.y, CAL.m + 1, 0, 12);
    const start = monday(first), end = addDays(monday(last), 6);
    const cells = [...hd.map((d) => h("div", { class: "r4p-calhd", text: d }))];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const k = iso(d), ps = byDay.get(k) || [], out = d.getMonth() !== CAL.m, isT = k === t0;
      const shownPs = ps.length > 2 ? ps.slice(0, 1) : ps;
      const cell = h("div", { class: "r4p-day" + (out ? " r4p-out" : "") + (isT ? " r4p-today" : "") },
        h("b", { class: "r4p-dn", text: String(d.getDate()) + (d.getDate() === 1 ? " " + MON[d.getMonth()] : "") }),
        ...shownPs.map((p) => evBox(p, (b) => pieceCard(p, b))));
      if (ps.length > 2) { const mb = h("button", { type: "button", class: "r4p-more r4p-moreday", onclick: (e) => { e.stopPropagation(); dayCard(k, ps, mb); } }, `+${ps.length - 1} more`); cell.append(mb); }
      cells.push(cell);
    }
    root.append(h("div", { class: "r4p-cal", style: `grid-template-rows:auto repeat(${Math.round((end - start) / 864e5 + 1) / 7},minmax(118px,auto))` }, ...cells));
  }

  // ---------- render ----------
  let ROOT_EL = null, LAST = { page: null, opts: {} }, TOK = 0;
  const sig = () => { try { return R4D.pieces().map((p) => p.id + p.status).join("|"); } catch (e) { return ""; } };
  function render(page, el, opts) {
    el = el || document.getElementById("app"); if (!el || !window.R4D) return;
    opts = opts || {};
    closePop();
    const tok = ++TOK; ROOT_EL = el; LAST = { page, opts };
    // [review 26 Nov] a re-draw is when this same page is already showing in el (a quiet reload, an answer, a filter, the library
    // arriving): it keeps the client's place (page scroll, frame scroll, each row's sideways scroll). Only a new arrival (another
    // page was showing, or opts.fresh) may move the page, e.g. Content scrolling to the row of a Home task.
    const redraw = !opts.fresh && !!el.querySelector(":scope > .r4p-" + page);
    opts = Object.assign({}, opts, { _redraw: redraw });
    const keepY = redraw ? [el.scrollTop, window.scrollY, new Map([...el.querySelectorAll(".r4p-row")].map((x) => [x.dataset.row, x.querySelector(".r4p-tiles")?.scrollLeft || 0]))] : null;
    const root = h("div", { class: "r4p r4p-" + page, "data-page": page });
    try {
      if (page === "home") renderHome(root);
      else if (page === "content") renderContent(root, opts);
      else if (page === "calendar") renderCalendar(root);
      else return;
    } catch (e) { console.warn("R4P " + page, e); root.append(h("div", { class: "r4p-card r4p-empty" }, h("b", { text: "This page can't show right now." }), h("span", { text: "Please try again in a moment." }))); }
    el.replaceChildren(root);
    el.__r4p = page;
    if (keepY) {
      const put = () => { if (Math.abs(el.scrollTop - keepY[0]) > 2) el.scrollTop = keepY[0]; if (Math.abs(window.scrollY - keepY[1]) > 2) window.scrollTo(0, keepY[1]);
        el.querySelectorAll(".r4p-row").forEach((x) => { const v = keepY[2].get(x.dataset.row), t = x.querySelector(".r4p-tiles"); if (v && t) t.scrollLeft = v; }); };
      put(); requestAnimationFrame(put);          // again after the shell's own scroll handling, in the same turn
    } else if (root._scrollTo) root._scrollTo();
    // the library (answered pieces too) loads once per visit: draw again when it adds or changes pieces
    const s0 = sig();
    const again = Object.assign({}, opts, { keepScroll: true }); delete again._redraw; delete again.fresh;
    try { R4D.ready().then(() => { if (tok === TOK && root.isConnected && sig() !== s0) render(page, el, again); }); } catch (e) {}
  }
  window.R4P = { render, channelIcon, channelIcons, closePop, shortTitle, typeName, dayLabel, chName };
})();
