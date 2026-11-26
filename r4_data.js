/* [PART R4-data, 26 Nov 2026] Release 4: one shared view of the client's work for Home, Content, Calendar and the
   opened card. Owner: the main session (claude:local_5e54d2da). Builders read it; ask the main session to change it.
   Reads only. Uses the page's own globals (S, waitingAll, statusOf, typeOf, taskKey, r3Tasks, rpc, mediaUrl).
   window.R4D:
     on()               true when Release 4 draws the page: a client's view (or our Client view) on a laptop (>= 900 px)
     ready()            Promise: loads get_library once per visit (all of the client's pieces, answered ones too)
     reload()           forgets get_library, so the next ready() reads it again (after an answer)
     tasks()            Home's list, most urgent first: [{ key, kind: "doc"|"pickone"|"content", name, ask, by, sub, total, ok,
                        doc (stand-in item id for a document), pieces: [piece] }]   (built on Release 3's r3Tasks())
     rows()             Content's rows, same keys as tasks() for the waiting work, then "Approved, waiting to go out"
                        and "Published": [{ key, title, sub, fromTask: bool, pieces: [piece] }]
     piece(id)          one piece (see below) or null;  pieces() every piece, waiting and answered
     rowOf(id)          the row key a piece sits in;  next(rowKey, id) / prev(rowKey, id) the neighbouring piece or null
     a piece: { id, it (get_review item, null if only in the library), lib (get_library piece or null), panel ({c,p} for
       a document card), title, kind, kindLabel, date "YYYY-MM-DD"|null, time "HH:MM"|null, platforms [..], campaign,
       promo, promoLabel, status: "wait"|"approve"|"change"|"choose"|"scheduled"|"published"|"done", statusLabel,
       media [..], thumb (url or null), slides (number of media), choice (it.choice or null), waiting (bool) }
*/
(function () {
  "use strict";
  const KIND = { post: "Post", carousel: "Carousel", story: "Story", advert: "Advert", ad: "Advert", video: "Video", reel: "Reel",
    photo_set: "Photo set", article: "Article", form: "Lead form", plan: "Plan", document: "Document", report: "Report", question: "Question", wording: "Wording" };
  const PROMO = { organic: "Timeline post", advert: "Advert", ad: "Advert", promotional: "Advert", promo: "Advert", both: "Timeline post and advert" };
  const STATUS = { wait: "Waiting for you", change: "Changes asked", approve: "Approved", choose: "Picked", scheduled: "Scheduled", published: "Published", done: "Done" };
  let LIB = null, LIBP = null;
  const on = () => { try { return matchMedia("(min-width: 901px)").matches && !!S.data && (!TEAM.on || TEAM.client) && !EMBED && !INLIB; } catch (e) { return false; } };
  const ready = () => LIB ? Promise.resolve(LIB) : (LIBP = LIBP || rpc("get_library", { p_code: S.code, p_passcode: S.pass })
    .then((r) => (LIB = (r && r.pieces) || [])).catch(() => (LIB = [])).finally(() => { LIBP = null; }));
  const reload = () => { LIB = null; };
  const thumbOf = (it, lib) => {
    try {
      if (lib && lib.thumb) return mediaUrl(lib.thumb);
      const m = (it || lib || {}).media?.[0]; if (!m) return null;
      return mediaUrl(m.type === "video" ? (m.poster || m.path) : m.path);
    } catch (e) { return null; }
  };
  function kindOf(it, lib) {
    const src = it || lib || {};
    if (it && it.panel) return /plan/i.test(it.title) ? "plan" : /report/i.test(it.title) ? "report" : "document";
    try { if (it && typeof isArticle === "function" && isArticle(it)) return "article"; } catch (e) {}
    if (/lead form|\bform\b/i.test(String(src.title || "")) || /form/i.test(String(src.group || ""))) return "form";
    const k = String(src.kind || (lib && lib.kind) || "").toLowerCase();
    if (k && KIND[k] && !(k === "post" && !(src.media || []).length)) return k;
    const m = (it || lib || {}).media || [];
    if (it && it.choice) return "post";
    if (!m.length) return "article";
    if (m.some((x) => x.type === "video")) return "video";
    if (m.length > 1) return "carousel";
    return "post";
  }
  function make(it, lib, extra) {
    const src = it || lib || {};
    const kind = kindOf(it, lib);
    let status = "done";
    if (it && !it.panel) { const st = statusOf(it); status = st.kind === "wait" ? "wait" : st.kind; }
    else if (it && it.panel) status = it.panel.c.waiting ? "wait" : "done";
    if (lib && !it) { const s = String(lib.stage || lib.status || ""); status = /drop/.test(s) ? "dropped" : /publish/.test(s) ? "published" : /sched/.test(s) ? "scheduled" : /wait/.test(s) ? "wait" : /chang/.test(s) ? "change" : "approve"; }
    if (lib && (lib.dropped_at || /drop/.test(String(lib.stage || "")))) status = "dropped";      // never shown to the client (r4_merge review, 26 Nov)
    if (lib && it && /publish|sched/.test(String(lib.stage || ""))) status = /publish/.test(lib.stage) ? "published" : "scheduled";
    const promo = String(src.promo || "").toLowerCase();
    return Object.assign({
      id: src.id, it: it || null, lib: lib || null, panel: (it && it.panel) || null,
      title: String(src.title || "").trim(), kind, kindLabel: KIND[kind] || "Post",
      date: src.post_date || (lib && lib.post_date) || (it && it.panel && (it.panel.c.answer_by || null)) || null,
      time: src.post_time || null, platforms: src.platforms || (lib && lib.platforms) || [], campaign: src.campaign || (lib && lib.campaign) || "",
      promo, promoLabel: PROMO[promo] || "", status, statusLabel: STATUS[status] || "",
      media: src.media || [], thumb: thumbOf(it, lib), slides: (src.media || []).length, choice: (it && it.choice) || null,
      waiting: status === "wait",
    }, extra || {});
  }
  function waitingPieces() {
    let w = []; try { w = waitingAll(); } catch (e) {}
    return w.map((x) => ({ x, p: make(x.it, (LIB || []).find((l) => l.id === x.it.id) || null, { roundTitle: x.r.title }) }));
  }
  function tasks() {
    let ts = []; try { ts = r3Tasks(); } catch (e) {}
    const wp = waitingPieces();
    return ts.map((t) => {
      const pieces = t.doc ? wp.filter((y) => y.x.it.id === t.doc).map((y) => y.p) : wp.filter((y) => { try { return taskKey(y.x) === t.key; } catch (e) { return false; } }).map((y) => y.p);
      const kind = t.doc ? "doc" : (pieces.length === 1 && pieces[0].choice) ? "pickone" : "content";
      return Object.assign({}, t, { kind, pieces });
    });
  }
  // [main session, 26 Nov 2026] Lee: "remove documents/reports from 'content'. documents, reports, strategic decision making
  // is natively on dashboard, and saved in reports, or in documents pages". rows() (Content's rows, its counts, the card's
  // Previous / Next and "Next: <row>") holds content only; a document keeps its own row in allRows(), so piece(id) and
  // rowOf(id) still find it and it opens in the large card from Home and Reports.
  const rows = () => allRows().filter((r) => r.kind !== "doc");
  function allRows() {
    const out = tasks().map((t) => ({ key: t.key, title: t.name, sub: t.sub, by: t.by, ask: t.ask, kind: t.kind, fromTask: true, pieces: t.pieces }));
    const seen = new Set(out.flatMap((r) => r.pieces.map((p) => p.id)));
    const items = new Map(); (S.data?.rounds || []).forEach((r) => r.items.forEach((it) => items.set(it.id, it)));
    const rest = (LIB || []).filter((l) => !seen.has(l.id)).map((l) => make(items.get(l.id) || null, l)).filter((p) => p.status !== "dropped");
    const byDate = (a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999"));
    const goOut = rest.filter((p) => ["approve", "choose", "scheduled"].includes(p.status)).sort(byDate);
    const pub = rest.filter((p) => p.status === "published").sort((a, b) => byDate(b, a));
    const chg = rest.filter((p) => p.status === "change");
    if (chg.length) out.push({ key: "r4:changing", title: "We're making your changes", sub: chg.length + (chg.length === 1 ? " piece" : " pieces"), fromTask: false, pieces: chg });
    if (goOut.length) out.push({ key: "r4:goout", title: "Approved, waiting to go out", sub: goOut.length + (goOut.length === 1 ? " piece" : " pieces"), fromTask: false, pieces: goOut });
    if (pub.length) out.push({ key: "r4:published", title: "Published", sub: pub.length + (pub.length === 1 ? " piece" : " pieces"), fromTask: false, pieces: pub });
    return out;
  }
  // [main session, 26 Nov 2026] The order of the client's tasks, on phones and laptops alike. Lee: "the highest priority
  // is the zenco plan, then the posts review". Decisions first (plans and other documents), then the work that goes out
  // soonest, then reports, which only ask to be read. Inside each group: the earliest of the answer-by date and the first
  // go-out date [review2 fix, 26 Nov], then Release 3's own order (the oldest first). Live data had the plan last (no answer-by dates).
  try {
    const r3Order = r3Tasks;
    const rank = (t) => (!t.doc ? 1 : /report/i.test((t.name || "") + " " + (t.sub || "")) ? 2 : 0);
    r3Tasks = function () {
      const ts = r3Order.apply(this, arguments) || [];
      const first = new Map(); let w = []; try { w = waitingAll(); } catch (e) {}
      w.forEach((x) => {
        const d = x.it && x.it.post_date; if (!d) return;
        let k = null; try { k = x.it.panel ? "doc:" + x.it.id : taskKey(x); } catch (e) {}
        if (k != null && (!first.has(k) || String(d) < first.get(k))) first.set(k, String(d));
      });
      const z = (v) => String(v || "9999");
      // [review2 fix, 26 Nov] "soonest" is the earlier of the task's answer-by date and its first go-out date. Sorting by
      // answer-by first put Numri's adverts (answer by 5 Dec, no go-out date) before the December posts that go out on 1 Dec
      // (no answer-by date) (review2 item 4). Ties: answer-by, then go-out, then Release 3's own order.
      const soon = (t) => { const a = z(t.by).slice(0, 10), b = z(first.get(t.key)).slice(0, 10); return a < b ? a : b; };
      return ts.map((t, i) => ({ t, i })).sort((a, b) => rank(a.t) - rank(b.t) || soon(a.t).localeCompare(soon(b.t)) || z(a.t.by).localeCompare(z(b.t.by))
        || z(first.get(a.t.key)).localeCompare(z(first.get(b.t.key))) || a.i - b.i).map((x) => x.t);
    };
  } catch (e) { console.warn("R4-data task order", e); }
  const pieces = () => rows().flatMap((r) => r.pieces);          // content only (Calendar, Coming up, counts)
  const piece = (id) => allRows().flatMap((r) => r.pieces).find((p) => p.id === id) || null;      // documents too
  const rowOf = (id) => (allRows().find((r) => r.pieces.some((p) => p.id === id)) || {}).key || null;
  const step = (rowKey, id, d) => { const r = allRows().find((x) => x.key === rowKey); if (!r) return null; const i = r.pieces.findIndex((p) => p.id === id); return i < 0 ? null : r.pieces[i + d] || null; };
  window.R4D = { on, ready, reload, tasks, rows, pieces, piece, rowOf, next: (k, id) => step(k, id, 1), prev: (k, id) => step(k, id, -1), KIND, PROMO, STATUS };
})();
