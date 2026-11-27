/* [PART R4-card, 26 Nov 2026] Release 4, Builder A: window.R4C, every card that opens over the page.
   Owner: Builder A (r4_core.js + r4_card.css). TEST COPY ONLY. Reads the shared view (window.R4D) and the page's own
   globals; writes only through the page's own calls (submit_feedback / change_note exactly as send() and oneUndo() make
   them, and the document plug-in's own buttons for documents).
   window.R4C:
     open(pieceId, { rowKey })   a piece waiting for an answer opens in a centred card over a dimmed page (size fits the
                                 piece); a piece already answered (approved, picked, scheduled, published, changes asked)
                                 opens in the side panel from the right. Sets ?open=<id> in the address; Back closes.
     close()                     closes whichever is open
     isOpen()                    true while a card or the side panel is open
   Inside the card: Previous / Next piece within the row (a snapshot of R4D.rows() taken when the card opens, so "2 of 12"
   stays true while answered pieces leave the row), slides with round arrows, Approve / Ask for changes / comments, the
   green "next piece" line with Undo, and the end-of-row screen. No drawing, no pins, no caption editing.
   Keys: left / right = slides (pages, options) of this piece; up / down or K / J = previous / next piece; Escape closes. */
(function () {
  "use strict";
  if (window.R4C) return;

  // ---------- small helpers ----------
  const SVG = {
    close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l10 10M15 5 5 15"/></svg>',
    left: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5 6.5 10l5.5 5.5"/></svg>',
    right: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4.5l5.5 5.5L8 15.5"/></svg>',
    check: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 10.5 3.2 3.2L15 6.8"/></svg>',
    pencil: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16h3.2l8.4-8.4-3.2-3.2L4 12.8V16z"/></svg>',
    down: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5v9m0 0-3.6-3.6M10 12.5l3.6-3.6M4.5 16.5h11"/></svg>',
    chat: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 4.5h13v9h-8l-5 3.5z"/></svg>',
  };
  const PLAT = {
    instagram: ["Instagram", '<svg viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="5" fill="#C13584"/><rect x="4.4" y="4.4" width="9.2" height="9.2" rx="2.8" fill="none" stroke="#FAF9F6" stroke-width="1.5"/><circle cx="9" cy="9" r="2.15" fill="none" stroke="#FAF9F6" stroke-width="1.5"/><circle cx="12.1" cy="5.9" r=".85" fill="#FAF9F6"/></svg>'],
    facebook: ["Facebook", '<svg viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="5" fill="#1877F2"/><path d="M10.1 15.2V9.7h1.8l.3-2.1h-2.1V6.3c0-.6.2-1 1-1h1.1V3.4c-.2 0-.9-.1-1.6-.1-1.6 0-2.7 1-2.7 2.8v1.5H6.1v2.1h1.8v5.5z" fill="#FAF9F6"/></svg>'],
    linkedin: ["LinkedIn", '<svg viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="5" fill="#0A66C2"/><rect x="4.1" y="7.3" width="2" height="6.4" fill="#FAF9F6"/><circle cx="5.1" cy="5.1" r="1.2" fill="#FAF9F6"/><path d="M8.2 7.3h1.9v.9c.3-.6 1-1.1 2.1-1.1 1.9 0 2.3 1.2 2.3 2.8v3.8h-2v-3.4c0-.8 0-1.8-1.1-1.8s-1.2.8-1.2 1.7v3.5h-2z" fill="#FAF9F6"/></svg>'],
    tiktok: ["TikTok", '<svg viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="5" fill="#111214"/><path d="M10.4 3.8v7.1a2 2 0 1 1-2-2" fill="none" stroke="#FAF9F6" stroke-width="1.6" stroke-linecap="round"/><path d="M10.4 3.8c.3 1.6 1.4 2.6 3 2.7" fill="none" stroke="#FAF9F6" stroke-width="1.6" stroke-linecap="round"/></svg>'],
    youtube: ["YouTube", '<svg viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="5" fill="#E02424"/><path d="M7.3 6v6l5-3z" fill="#FAF9F6"/></svg>'],
    google: ["Google", '<svg viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="5" fill="#1D4E89"/><path d="M12.6 8.3H9v1.6h2c-.3 1-1.1 1.6-2.1 1.6a2.5 2.5 0 1 1 1.6-4.4l1.1-1.1A4 4 0 1 0 9 13c2.2 0 3.7-1.5 3.7-3.8z" fill="#FAF9F6"/></svg>'],
    x: ["X", '<svg viewBox="0 0 18 18" aria-hidden="true"><rect width="18" height="18" rx="5" fill="#111214"/><path d="M5 4.8h2.4l5.6 8.4h-2.4zM12.6 4.8 5.4 13.2" stroke="#FAF9F6" stroke-width="1.4" fill="none"/></svg>'],
  };
  PLAT.twitter = PLAT.x; PLAT.gbp = ["Google Business", PLAT.google[1]];
  const E = (...a) => h(...a);
  const ic = (svg, cls) => E("span", { class: cls || "r4c-ic", "aria-hidden": "true", html: svg });
  const dateOf = (iso) => { if (!iso) return null; const s = String(iso); const d = new Date(s.length <= 10 ? s + "T12:00:00" : s); return isNaN(d) ? null : d; };
  const dayLong = (iso) => { const t = dateOf(iso); if (!t) return ""; return [t.toLocaleDateString("en-GB", { weekday: "short" }), t.getDate(), t.toLocaleDateString("en-GB", { month: "short" })].join(" "); };
  const dayShort = (iso) => { const t = dateOf(iso); return t ? t.getDate() + " " + t.toLocaleDateString("en-GB", { month: "short" }) : ""; };
  const timeOf = (iso) => { const t = dateOf(iso); return t && String(iso).length > 10 ? t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""; };
  const goesOut = (p) => (p.date ? dayLong(p.date) + (p.time ? ", " + p.time : "") : "");
  const cleanTitle = (t) => String(t || "").replace(/^\s*pick one\s*[·:\-]\s*/i, "").trim();
  // "Posts from 1 Dec" reads "posts from 1 Dec" mid-sentence; a name ("Meta ads", "December push") keeps its capital
  const lowerFirst = (t) => (/^(Posts|Stories|Articles|Adverts|Ads|Designs|Videos|Reels|Pieces|Questions|Plans|Documents|Reports|Carousels)/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);
  const cleanCamp = (t) => { const s = String(t || "").trim(); try { return typeof noDate === "function" ? noDate(s) : s; } catch (e) { return s; } };
  const initials = (name) => { const n = String(name || "").trim(); if (/m7alpha/i.test(n)) return "M7"; const w = n.split(/[\s,]+/).filter(Boolean); return ((w[0] || "?")[0] + (w[1] ? w[1][0] : "")).toUpperCase(); };
  const lab = (m) => String((m && m.label) || "").replace(/^\s*\d+[\s.:)-]+/, "").trim();
  const ratioOf = (m) => (m && m.width && m.height ? m.height / m.width : null);
  const TALL = /\b(story|stories|reels?|tall|vertical|9\s*[:x×]\s*16|1080\s*[x×]\s*1920)\b/i;
  const PORT = /\b(feed|portrait|4\s*[:x×]\s*5|1080\s*[x×]\s*1350|square|1\s*[:x×]\s*1)\b/i;
  const isTall = (m) => TALL.test(lab(m)) || (!PORT.test(lab(m)) && (ratioOf(m) || 0) >= 1.6);
  const isPort = (m) => PORT.test(lab(m)) || (!TALL.test(lab(m)) && ratioOf(m) != null && ratioOf(m) < 1.5);
  const VER = /\b(attempts?|try|tries|versions?|variations?|alternates?|alternatives?|options?|originals?|drafts?)\b|^[A-D](\s|,|$)/i;
  const isVer = (m) => VER.test(lab(m));
  const isLeadForm = (p) => /lead form/i.test(p.title || "") || (p.media || []).some((m) => /\b(intro|privacy|thank you|contact information)\b/i.test(lab(m)));
  const blocked = () => {
    const modal = document.getElementById("modal");
    if (modal && !modal.hidden) return true;
    if (document.querySelector(".dc-reader, .zoom")) return true;
    const mb = document.getElementById("r3msgbox"); if (mb && !mb.hidden && mb.contains(document.activeElement)) return true;
    return false;
  };

  // ---------- state ----------
  const C = { root: null, card: null, mode: null, id: null, run: null, slide: 0, view: 0, scope: null, picks: {}, flash: null, lit: false,
    end: false, prevFocus: null, pushed: false, ignorePop: false, busy: false, ro: null, watch: 0, refs: {}, docDraft: null, sideP: null };

  function pieceOf(id) {
    let p = null; try { p = R4D.piece(id); } catch (e) {}
    if (p && C.run) C.run.cache.set(id, p);
    return p || (C.run && C.run.cache.get(id)) || (C.sideP && C.sideP.id === id ? C.sideP : null);
  }
  const cur = () => (C.id ? pieceOf(C.id) : null);
  function makeRun(rowKey, p) {
    let row = null; try { row = R4D.rows().find((r) => r.key === rowKey) || null; } catch (e) {}
    const pieces = row && row.pieces.some((x) => x.id === p.id) ? row.pieces : [p];
    let order = []; try { order = R4D.rows().map((x) => x.key); } catch (e) {}
    return { key: row ? row.key : rowKey || null, title: row ? row.title : cleanTitle(p.title), ids: pieces.map((x) => x.id), cache: new Map(pieces.map((x) => [x.id, x])), answers: new Map(), order };
  }

  // what the piece is, for the layout
  function sizesOf(p) {
    const m = (p.media || []).filter((x) => x.type !== "text");
    if (m.length !== 2) return null;
    const t = m.find(isTall), q = m.find((x) => x !== t && isPort(x));
    return t && q ? { portrait: q, tall: t } : null;
  }
  function shapeOf(p) {
    if (p.panel) return "doc";
    const it = p.it;
    if (it && (p.choice || ((typeof questionsOf === "function") && questionsOf(it).length))) return "pick";
    if (it && (typeof isArticle === "function") && isArticle(it)) return "article";
    if (!(p.media || []).length) return "article";
    if (sizesOf(p)) return "two";
    return "post";
  }
  function unitOf(p) {
    const m = p.media || [];
    if (m.length > 1 && m.every(isVer)) return "version";
    if (isLeadForm(p)) return "screen";
    return /page/i.test(m.map(lab).join(" ")) ? "page" : "slide";
  }
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function docWord(p) { const t = p.title || ""; return /report/i.test(t) ? "report" : /plan/i.test(t) || p.kind === "plan" ? "plan" : /proposal/i.test(t) ? "proposal" : "document"; }
  function typeLabel(p, shape) {
    if (shape === "pick") return "Pick one";
    if (shape === "doc") return cap1(docWord(p));
    if (shape === "article") return (p.it && (typeof isArticle === "function") && isArticle(p.it)) || (p.media || []).length ? "Article" : "Wording";
    const k = isLeadForm(p) ? "Lead form" : p.kindLabel || "Post", n = (p.media || []).length;
    if (shape === "two") return k + " · 2 sizes";
    if (n > 1) return `${k} · ${n} ${unitOf(p)}s`;
    return k;
  }
  const STC = { wait: ["Waiting for you", "wait"], change: ["Changes asked", "chg"], approve: ["Approved", "pub"], choose: ["Picked", "pub"],
    scheduled: ["Scheduled", "sch"], published: ["Published", "pub"], done: ["Done", "pub"] };
  const chip = (text, cls) => E("span", { class: "r4c-chip c-" + cls, text });

  // ---------- the card shell ----------
  function ensureRoot(mode) {
    if (C.root && C.mode === mode) return;
    if (C.root) { stopWatch(); C.ro && C.ro.disconnect(); C.root.remove(); }
    else C.prevFocus = document.activeElement;
    const dim = E("div", { class: "r4c-dim", onclick: () => close() });
    const card = E(mode === "side" ? "aside" : "div", { class: mode === "side" ? "r4c-side" : "r4c-card", role: "dialog", "aria-modal": "true", "aria-labelledby": "r4c-title", tabindex: "-1" });
    const root = E("div", { class: "r4c-root r4c-m-" + mode }, dim, card);
    document.body.append(root);
    document.documentElement.classList.add("r4c-lock"); document.body.classList.add("r4c-on");
    Object.assign(C, { root, card, mode });
    requestAnimationFrame(() => { try { card.focus({ preventScroll: true }); } catch (e) {} });
  }
  function close(o) {
    o = o || {};
    if (!C.root) return;
    stopWatch(); if (C.ro) { C.ro.disconnect(); C.ro = null; }
    C.root.remove();
    document.documentElement.classList.remove("r4c-lock"); document.body.classList.remove("r4c-on");
    const lastId = C.id, rowKey = C.run && C.run.key, firstId = C.firstId;
    Object.assign(C, { root: null, card: null, mode: null, id: null, run: null, end: false, flash: null, lit: false, refs: {}, docDraft: null, sideP: null, slide: 0, view: 0, picks: {}, firstId: null });
    // fromHistory: Back already took &open= away; quiet: the shell is changing the address itself (window.R4.go)
    if (!o.fromHistory && !o.quiet) urlClear(); else C.pushed = false;
    giveFocusBack(lastId, firstId, rowKey);
  }
  // Focus goes back to what opened the card. After an answer the page behind is drawn again, so that button is gone:
  // then the tile of the piece last on screen (or the one that opened the card), else its row's heading, else the
  // page's main heading. Looked for once the page has had a moment to draw itself again.
  function giveFocusBack(lastId, firstId, rowKey) {
    const pf = C.prevFocus; C.prevFocus = null;
    const focusOn = (el) => { if (!el) return false; if (!el.matches("a[href], button, input, textarea, select, [tabindex]")) el.setAttribute("tabindex", "-1"); try { el.focus({ preventScroll: false }); } catch (e) { return false; } return document.activeElement === el; };
    const css = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'));
    const find = () => {
      if (pf && pf.isConnected && pf !== document.body) return pf;
      for (const id of [lastId, firstId]) { if (!id) continue; const t = document.querySelector(`#app [data-id="${css(id)}"]`); if (t) return t; }
      if (rowKey) { const r = document.querySelector(`#app [data-row="${css(rowKey)}"]`); if (r) return r.querySelector(".r4p-rowh, h2, h3") || r; }
      return document.querySelector("#app h1") || document.getElementById("app");
    };
    requestAnimationFrame(() => { if (C.root) return; focusOn(find()) || setTimeout(() => { if (!C.root) focusOn(find()); }, 250); });
  }
  const isOpen = () => !!C.root;

  // ---------- the address: ?open=<id> ----------
  // Opening adds one step to the history (through the shell's window.R4.setUrl when it is there), so Back closes the
  // card; Previous / Next and the next piece after an answer replace that step. Closing with ×, Escape or the dim goes
  // back one step when the card made it, otherwise it takes &open= out of the address in place.
  const urlParams = () => new URLSearchParams(location.search);
  const shellUrl = () => (window.R4 && typeof window.R4.setUrl === "function" ? window.R4.setUrl : null);
  function setOpenParam(id, how, row) {
    const su = shellUrl(), P = { open: id || null };
    if (row !== undefined) P.row = row || null;
    if (su) { try { su(P, how); return; } catch (e) {} }
    const u = new URL(location.href); for (const [k, v] of Object.entries(P)) { if (v) u.searchParams.set(k, v); else u.searchParams.delete(k); }
    history[how === "push" ? "pushState" : "replaceState"](Object.assign({}, how === "push" ? {} : history.state), "", u);
  }
  // the card has moved to another row (the end screen's "Next: ..."): the address names that row, so a copied link
  // highlights the right row behind the card. Only where the address already carries a row (the Content page).
  function urlRow(rowKey) {
    const q = urlParams();
    if (!rowKey || (!q.has("row") && q.get("page") !== "content") || q.get("row") === rowKey) return;
    setOpenParam(q.get("open"), "replace", rowKey);
    if (C.pushed) { try { history.replaceState(Object.assign({}, history.state, { r4c: q.get("open") }), "", location.href); } catch (e) {} }
  }
  function urlOpen(id, how) {
    const was = location.search;
    if (how === "push") {
      setOpenParam(id, "push");
      C.pushed = location.search !== was && urlParams().get("open") === id;
    } else setOpenParam(id, "replace");
    if (urlParams().get("open") !== id) { const u = new URL(location.href); u.searchParams.set("open", id); history.replaceState(history.state, "", u); }
    if (C.pushed) { try { history.replaceState(Object.assign({}, history.state, { r4c: id }), "", location.href); } catch (e) {} }
  }
  function urlClear() {
    if (urlParams().get("open") == null) { C.pushed = false; return; }
    if (C.pushed && history.state && history.state.r4c) { C.pushed = false; C.ignorePop = true; history.back(); return; }
    C.pushed = false;
    setOpenParam(null, "replace");
  }
  addEventListener("popstate", () => {
    if (C.ignorePop) { C.ignorePop = false; return; }
    if (window.R4 && window.R4.__shell) return;          // the shell reads the address on Back and calls open / close itself
    const want = urlParams().get("open");
    if (C.root) {
      if (!want) close({ fromHistory: true });
      else if (want !== C.id) { if (C.mode === "card" && C.run && C.run.ids.includes(want)) goTo(want); else open(want, { fromHistory: true }); }
    } else if (want) open(want, { rowKey: urlParams().get("row") || undefined, fromHistory: true });
  });

  // ---------- open ----------
  async function open(id, opts) {
    opts = opts || {};
    try { await R4D.ready(); } catch (e) {}
    const p = pieceOf(id);
    if (!p) { try { showToast("This piece isn't here any more."); hideToastLater(3500); } catch (e) {} if (urlParams().get("open") === id) urlClear(); return false; }
    const fresh = !C.root;
    if (!p.waiting && !(C.run && C.run.answers.has(id))) {
      ensureRoot("side"); C.id = id; C.sideP = p; C.run = null; C.end = false; C.flash = null; drawSide();
    } else {
      const rowKey = opts.rowKey || (() => { try { return R4D.rowOf(id); } catch (e) { return null; } })();
      if (!C.run || C.run.key !== rowKey || !C.run.ids.includes(id)) C.run = makeRun(rowKey, p);
      ensureRoot("card"); C.id = id; resetPiece(); C.end = false; if (!opts.keepFlash) { C.flash = null; C.lit = false; }
      draw();
    }
    if (fresh) C.firstId = id;
    if (opts.fromHistory || opts.fromStart || opts.fromAddress) { if (fresh) C.pushed = false; urlOpen(id, "replace"); }
    else urlOpen(id, fresh ? "push" : "replace");
    if (opts.newRow && C.run) urlRow(C.run.key);
    return true;
  }
  function resetPiece() {
    C.slide = 0; C.view = 0; C.picks = {}; C.docDraft = { all: "", pages: {} }; C.refs = {};
    const p = cur(); C.scope = null;
    if (!p) return;
    const shape = shapeOf(p);
    C.scope = shape === "two" ? "both" : shape === "doc" ? "page" : shape === "post" && (p.media || []).length > 1 ? "slide" : "all";
    if (shape === "pick" && p.it) { try { const d = getDraft(p.it); C.picks = Object.assign({}, d.picks || {}); } catch (e) {} }
  }
  function goTo(id, o) {
    o = o || {};
    if (!C.root || C.mode !== "card") return open(id, o);
    stopWatch();
    C.id = id; C.end = false; resetPiece();
    if (!o.keepFlash) { C.flash = null; C.lit = false; }
    draw(); urlOpen(id, "replace");
    try { C.card.focus({ preventScroll: true }); } catch (e) {}
  }
  function step(d) {
    const r = C.run; if (!r || C.end) return;
    const i = r.ids.indexOf(C.id), j = i + d;
    if (j < 0 || j >= r.ids.length) return;
    goTo(r.ids[j]);
  }

  // ---------- drawing the centred card ----------
  function sizeOf(p, shape) { return shape === "doc" || shape === "article" && ((p.it && p.it.caption) || "").length > 600 ? "doc" : shape === "pick" ? "pick" : shape === "two" ? "two" : "post"; }
  function draw() {
    if (!C.root || C.mode !== "card") return;
    if (C.ro) { C.ro.disconnect(); C.ro = null; }
    if (C.end) return drawEnd();
    const p = cur(); if (!p) return close();
    const shape = shapeOf(p); C.shape = shape; C.refs = {};
    C.card.className = "r4c-card sz-" + sizeOf(p, shape);
    const body = shape === "doc" ? bodyDoc(p) : shape === "pick" ? bodyPick(p) : shape === "article" ? bodyArticle(p) : bodyPost(p, shape);
    C.card.replaceChildren(head(p, shape), body);
  }
  function head(p, shape) {
    const st = STC[p.status] || STC.wait;
    let stChip = chip(st[0], st[1]);
    if (shape === "doc" && p.panel && p.panel.c.answer_by && p.waiting) stChip = chip("Answer by " + dayShort(p.panel.c.answer_by), "wait");
    const left = E("div", { class: "r4c-hl" }, E("div", { class: "r4c-chips" }, chip(typeLabel(p, shape), "type"), stChip),
      E("h2", { class: "r4c-title", id: "r4c-title", text: cleanTitle(p.title) }));
    const right = E("div", { class: "r4c-hr" });
    if (shape === "doc") { const dl = docDownload(p); if (dl) right.append(dl); }
    const nav = navGroup(p); if (nav) right.append(nav);
    right.append(closeBtn());
    return E("header", { class: "r4c-head" }, left, right);
  }
  const closeBtn = () => E("button", { type: "button", class: "r4c-x", "aria-label": "Close", title: "Close", onclick: () => close() }, ic(SVG.close));
  function navGroup(p) {
    const r = C.run; if (!r || r.ids.length < 2) return null;
    const i = r.ids.indexOf(p.id);
    return E("nav", { class: "r4c-nav", "aria-label": "Pieces in " + r.title },
      E("button", { type: "button", class: "r4c-btn r4c-sm", disabled: i <= 0, onclick: () => step(-1), title: "Previous piece (up arrow)" }, "‹ Previous"),
      E("div", { class: "r4c-count" + (C.lit ? " lit" : ""), "aria-live": "polite" }, E("b", { text: `${i + 1} of ${r.ids.length}` }), E("span", { text: r.title, title: r.title })),
      E("button", { type: "button", class: "r4c-btn r4c-sm r4c-main", disabled: i >= r.ids.length - 1, onclick: () => step(1), title: "Next piece (down arrow)" }, "Next piece ›"));
  }
  function metaLine(p) {
    const bits = [];
    const go = goesOut(p); if (go) bits.push("Goes out " + go);
    const kids = [];
    bits.forEach((b, k) => kids.push(k ? " · " : "", b));
    if ((p.platforms || []).length) { if (kids.length) kids.push(" · "); kids.push(E("span", { class: "r4c-plats" }, p.platforms.map((x) => ic((PLAT[x] || PLAT.x)[1], "r4c-pl"))), " " + p.platforms.map((x) => (PLAT[x] || [cap1(x)])[0]).join(", ")); }
    const camp = cleanCamp(p.campaign), same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
    if (camp && !(C.run && (same(camp, C.run.title) || same(camp, cleanCamp(C.run.title))))) { if (kids.length) kids.push(" · "); kids.push(camp); }      // the row's name is in the counter already
    return kids.length ? E("p", { class: "r4c-meta" }, ...kids) : null;
  }
  function flashLine() {
    const f = C.flash; if (!f) return null;
    return E("div", { class: "r4c-flash", role: "status" }, ic(SVG.check, "r4c-tick"),
      E("p", {}, E("b", { text: `${f.verb}: ${f.title}.` }), f.n ? ` You're now on the next piece, ${f.n} of ${f.m}.` : ""),
      f.undo ? E("button", { type: "button", class: "r4c-undo", onclick: () => undo(f.id) }, "Undo") : null);
  }
  const say = (msg, kind) => { if (!C.card) return; C.card.querySelectorAll(".r4c-status").forEach((s) => { s.className = "r4c-status" + (kind ? " " + kind : ""); s.textContent = msg || ""; }); };

  // ---------- artwork ----------
  function mediaEl(m, alt, p) {
    if (!m) return E("div", { class: "r4c-nomedia", text: "No picture yet." });
    if (m.type === "video") return E("video", { src: mediaUrl(m.path), poster: m.poster ? mediaUrl(m.poster) : null, controls: true, playsinline: true, preload: "metadata", "aria-label": alt });
    if (m.type === "text") return E("div", { class: "r4c-textart", text: (p && p.it && p.it.caption) || "" });
    return E("img", { src: mediaUrl(m.path), alt: alt || "", width: m.width || null, height: m.height || null, decoding: "async", draggable: "false" });
  }
  const ratioFor = (m) => ratioOf(m) || (m && m.type === "video" ? 16 / 9 : 1.25);
  // every box gets the same height; widths follow each picture's shape; the lot fits the stage
  function fitBoxes(stage, boxes, ratios, gap, spare) {
    const W = stage.clientWidth, Hh = stage.clientHeight - (spare || 0); if (W < 40 || Hh < 40) return;
    const inv = ratios.reduce((s, r) => s + 1 / r, 0);
    const hh = Math.max(60, Math.min(Hh, (W - gap * (boxes.length - 1)) / inv));
    boxes.forEach((b, i) => { b.style.height = Math.floor(hh) + "px"; b.style.width = Math.floor(hh / ratios[i]) + "px"; });
  }
  function watchFit(stage, fn) {
    if (C.ro) C.ro.disconnect();
    if ("ResizeObserver" in window) { C.ro = new ResizeObserver(() => fn()); C.ro.observe(stage); }
    requestAnimationFrame(fn); setTimeout(fn, 120);
  }
  const roundBtn = (dir, label, fn, disabled) => E("button", { type: "button", class: "r4c-round r4c-" + dir, "aria-label": label, title: label, disabled: !!disabled, onclick: fn }, ic(dir === "prev" ? SVG.left : SVG.right));

  function bodyPost(p, shape) {
    const art = E("div", { class: "r4c-art" }); C.refs.art = art;
    drawArt(p, shape);
    // the comment box sits right under the answer (Ask for changes needs it), then the details and the caption
    const col = E("div", { class: "r4c-col" }, answerBox(p, shape), captionBox(p), commentsBox(p, shape), pinsBox(p), detailsBox(p));
    return E("div", { class: "r4c-body" }, flashLine(), E("div", { class: "r4c-split" }, art, col));
  }
  // ---------- pins on the artwork, Figma style (Lee, 26 Nov 2026; r4_pin.js draws them) ----------
  // Release 3's own pins: a note whose marks hold { strokes: [], pins: [{ x, y, text }] } for the picture shown (its media
  // id is the note's variant). Saved with the same submit_feedback call as Release 3's Pin tool; a pin counts as a change.
  const PIN_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17.5s5-4.6 5-9a5 5 0 0 0-10 0c0 4.4 5 9 5 9z"/><circle cx="10" cy="8.5" r="1.8"/></svg>';
  function pinsOf(p, media) {
    const it = p.it; if (!it || !media) return [];
    return (it.feedback || []).filter((f) => !f.withdrawn && f.item_version === it.version && f.variant_id === media.id && f.marks && Array.isArray(f.marks.pins))
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .flatMap((f) => f.marks.pins.map((q) => ({ x: +q.x, y: +q.y, text: q.text || f.comment || "", who: f.reviewer || "", when: f.created_at })));
  }
  const shownMedia = (p) => { const sz = sizesOf(p); if (sz) return [sz.portrait, sz.tall]; const m = p.media || []; return m.length ? [m[Math.max(0, Math.min(C.slide, m.length - 1))]] : []; };
  function pinHint() { const h = E("p", { class: "r4pin-hint", text: "Click the spot you want to comment on. Press Esc to stop." }); h.hidden = !(window.R4PIN && R4PIN.on()); return h; }
  function pinsOn(p, box, media, start) {
    if (!window.R4PIN || !media) return;
    const can = !!(p.it && p.waiting);
    R4PIN.attach(box, { pins: pinsOf(p, media), start: start || 0, placeholder: "Write your comment on this spot", onPost: can ? (x, y, t) => pinSave(p, media, x, y, t) : null });
  }
  function pinsBox(p) {
    const it = p.it; if (!it || !window.R4PIN || !(p.media || []).some((m) => m.type === "image")) return null;
    const list = shownMedia(p).flatMap((m) => pinsOf(p, m));
    const tog = E("button", { type: "button", class: "r4c-btn r4c-sm r4pin-tog", "data-r4pin-toggle": "1", "data-r4pin-label": "Pin a comment", "aria-pressed": String(R4PIN.on()), disabled: !p.waiting,
      title: "Pin a comment on the artwork (C)", onclick: () => R4PIN.toggle() }, ic(PIN_SVG), E("span", { class: "r4pin-tl", text: R4PIN.on() ? "Done pinning" : "Pin a comment" }));
    return E("section", { class: "r4c-box r4pin-listbox", "aria-label": "Pins on the artwork" }, E("h3", { text: list.length ? `Pins on the artwork (${list.length})` : "Pins on the artwork" }),
      list.length ? E("ol", { class: "r4pin-list" }, ...list.map((q, k) => E("li", {}, E("button", { type: "button", class: "r4pin-li", onclick: () => R4PIN.highlight(k + 1) },
        E("i", { text: String(k + 1) }), E("span", {}, E("b", { text: q.text || "(no words)" }), E("small", { text: [q.who, dayShort(q.when)].filter(Boolean).join(" · ") })))))) : null,
      E("div", { class: "r4c-row" }, tog));
  }
  async function pinSave(p, media, x, y, text) {
    const it = p.it;
    if (String(it.id).startsWith("demo-")) { say("This is a sample, so nothing is sent.", "err"); return false; }
    if (refuse()) return false;
    if (S.sending || C.busy) return false;
    let name = null; C.busy = true; try { name = await askName(false); } finally { C.busy = false; }
    if (!name) return false;
    const args = { p_code: S.code, p_passcode: S.pass, p_item_id: it.id, p_item_version: it.version, p_variant_id: media.id, p_reviewer: name, p_decision: "comment",
      p_comment: "", p_marks: { strokes: [], pins: [{ x, y, text }] }, p_choice: null };
    if (typeof EMBED === "undefined" || !EMBED) args.p_edit_key = editKey();
    S.sending = true;
    try {
      const res = await rpc("submit_feedback", args);
      S.sending = false;
      if (!res || !res.ok) { say(res && res.error === "stale" ? "This piece was just updated. Please have another look." : "That didn't save. Please try again.", "err"); return false; }
      // the note shows at once (the reload below brings the stored one)
      const mine = { id: res.id || "local-" + Date.now(), reviewer: name, decision: "comment", comment: "", marks: args.p_marks, variant_id: media.id, item_version: it.version, created_at: new Date().toISOString(), internal: false };
      it.feedback = [...(it.feedback || []), mine];
      try { const rnd = (S.data && S.data.rounds || []).find((r) => r.items.some((x) => x.id === it.id)) || null;
        SENT.set(it.id, { at: Date.now(), item: Object.assign({}, it), round: rnd && Object.assign({}, rnd, { items: [] }), pos: rnd ? rnd.items.findIndex((x) => x.id === it.id) : 0, editing: false, noteId: res.id || null, before: {}, local: mine, approved: false, noClient: false, hold: false, released: false }); } catch (e) {}
      drawArt(p, C.shape);
      say("Pinned. Your comment is with the team.", "ok");
      refreshAll().then(() => { if (C.root && C.mode === "card" && C.id === it.id) { const q = cur(); if (q && q.it) { const had = (q.it.feedback || []).some((f) => f.id === mine.id); if (!had) q.it.feedback = [...(q.it.feedback || []), mine]; drawArt(q, C.shape); } } });
      return true;
    } catch (e) { S.sending = false; say("That didn't save. Please check your connection and try again.", "err"); return false; }
  }
  function drawArt(p, shape) {
    const art = C.refs.art; if (!art) return;
    // the two sizes side by side on a laptop only; on a phone they are slides, one size at a time (Lee, 27 Nov 2026)
    if (shape === "two" && !matchMedia("(max-width: 900px)").matches) {
      const s = sizesOf(p);
      const figs = [[s.portrait, "Portrait", "for feeds"], [s.tall, "Tall", "for Stories and Reels"]].map(([m, a, b]) => {
        const box = E("div", { class: "r4c-fit" }, mediaEl(m, `${cleanTitle(p.title)}, ${a.toLowerCase()} size`, p));
        return { box, m, fig: E("figure", { class: "r4c-fig" }, box, E("figcaption", {}, E("b", { text: a }), " · " + b)) };
      });
      const stage = E("div", { class: "r4c-stage r4c-pair" }, ...figs.map((f) => f.fig));
      art.replaceChildren(stage, pinHint());
      let off = 0; figs.forEach((f) => { pinsOn(p, f.box, f.m, off); off += pinsOf(p, f.m).length; });
      watchFit(stage, () => fitBoxes(stage, figs.map((f) => f.box), figs.map((f) => ratioFor(f.m)), 26, 34));
      return;
    }
    const m = p.media || [], n = m.length, k = Math.max(0, Math.min(C.slide, n - 1)), U = cap1(unitOf(p));
    const box = E("div", { class: "r4c-fit" }, mediaEl(m[k], cleanTitle(p.title) + (n > 1 ? `, ${U.toLowerCase()} ${k + 1} of ${n}` : ""), p));
    if (n > 1) box.append(roundBtn("prev", `Previous ${U.toLowerCase()}`, () => setSlide(k - 1), k <= 0), roundBtn("next", `Next ${U.toLowerCase()}`, () => setSlide(k + 1), k >= n - 1));
    const stage = E("div", { class: "r4c-stage" }, box);
    // a two-size advert on a phone: name the size under the picture, as the laptop's captions do
    const sz = shape === "two" ? sizesOf(p) : null, which = sz ? (m[k] === sz.portrait ? "Portrait · for feeds" : m[k] === sz.tall ? "Tall · for Stories and Reels" : "") : "";
    art.replaceChildren(...[stage, n > 1 ? E("p", { class: "r4c-under", "aria-live": "polite", text: which ? `${which} (${k + 1} of ${n})` : `${U} ${k + 1} of ${n}` + (lab(m[k]) && !/^(slide|page|post|feed)\s*\d*$/i.test(lab(m[k])) ? " · " + lab(m[k]) : "") }) : null, pinHint()].filter(Boolean));
    if (m[k] && m[k].type === "image") pinsOn(p, box, m[k]);
    const pl = C.card && C.card.querySelector(".r4pin-listbox"); if (pl) pl.replaceWith(pinsBox(p));
    watchFit(stage, () => fitBoxes(stage, [box], [ratioFor(m[k])], 0, 0));
    // the next picture is fetched ahead, so the arrow shows it at once
    const nx = m[k + 1]; if (nx && nx.type === "image") { const im = new Image(); im.src = mediaUrl(nx.path); }
  }
  function setSlide(k) {
    const p = cur(); if (!p) return;
    const n = (p.media || []).length; if (n < 2) return;
    k = Math.max(0, Math.min(k, n - 1)); if (k === C.slide) return;
    C.slide = k; drawArt(p, C.shape); syncComments(p);
  }

  // ---------- the right column ----------
  function answerBox(p, shape) {
    const it = p.it, rec = C.run && C.run.answers.get(p.id);
    if (rec || !p.waiting) return answeredBox(p, rec);
    const lead = shape === "two" ? "One advert, shown in its two sizes. Approve it as it is, or say what should change." : shape === "article" ? "Approve it as it is, or say what should change. A different wording can go in a comment." : "Approve it as it is, or say what should change.";
    const from = it && (it.ask || it.note) ? E("p", { class: "r4c-from" }, E("b", { text: "From M7Alpha: " }), String(it.ask || it.note)) : null;
    return E("section", { class: "r4c-box r4c-answer", "aria-label": "Your answer" },
      E("p", { class: "r4c-lead" }, E("b", { text: "M7Alpha needs your go-ahead. " }), lead), from,
      E("div", { class: "r4c-row" },
        E("button", { type: "button", class: "r4c-btn r4c-main", disabled: !it, onclick: (e) => answer(p, "approve", e.currentTarget) }, "Approve"),
        E("button", { type: "button", class: "r4c-btn", disabled: !it, onclick: (e) => answer(p, "change", e.currentTarget) }, "Ask for changes")),
      E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
  }
  function answeredBox(p, rec) {
    const dec = rec ? rec.decision : p.status;
    const txt = dec === "approve" ? "You approved this." : dec === "choose" ? "You picked one." : dec === "scheduled" ? "This is scheduled." : dec === "published" ? "This is published." : "You asked for changes. Your notes are with the team.";
    return E("section", { class: "r4c-box r4c-answer r4c-done" }, E("p", { class: "r4c-lead" }, ic(SVG.check, "r4c-tick"), E("b", { text: txt })),
      rec && rec.noteId ? E("div", { class: "r4c-row" }, E("button", { type: "button", class: "r4c-btn r4c-sm", onclick: () => undo(p.id) }, "Take it back")) : null,
      E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
  }
  function channels(list) {
    return E("span", { class: "r4c-chan" }, E("span", { class: "r4c-plats" }, list.map((x) => ic((PLAT[x] || PLAT.x)[1], "r4c-pl"))),
      list.map((x) => (PLAT[x] || [cap1(String(x))])[0]).join(", "));
  }
  function detailsBox(p, extra) {
    const rows = [];
    const go = goesOut(p); if (go) rows.push(["Goes out", go]);
    if ((p.platforms || []).length) rows.push(["Channels", channels(p.platforms)]);
    const camp = cleanCamp(p.campaign); if (camp) rows.push(["Campaign", camp]);
    if (p.promoLabel) rows.push(["How it runs", p.promoLabel]);
    (extra || []).forEach((r) => r && r[1] && rows.push(r));
    if (!rows.length) return null;
    return E("section", { class: "r4c-box r4c-details", "aria-label": "Details" }, E("dl", { class: "r4c-dl" }, ...rows.flatMap(([k, v]) => [E("dt", { text: k }), E("dd", {}, v)])));
  }
  function captionText(p) {
    const raw = (p.it && p.it.caption) || (p.lib && p.lib.caption) || "";
    let t; try { t = typeof mainCaption === "function" ? mainCaption(raw) : String(raw).trim(); } catch (e) { t = String(raw).trim(); }
    // [main session] an article's text is written with "## heading" and "[pic:..]" marks: show plain words in the box
    return String(t || "").replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/\[pic:[^\]]*\]/g, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\n{3,}/g, "\n\n").trim();
  }
  function captionBox(p) {
    const t = captionText(p); if (!t) return null;
    // adverts are stored as "promotional" (and older ones "advert"/"ad"/"promo"); "both" runs as a post too (skill review, 26 Nov)
    const ad = p.kind === "advert" || /^(advert|ad|promo|promotional)$/i.test(String(p.promo || "").trim());
    // a long caption shows its first lines, with "Read all", so the comment box stays in reach
    const txt = E("p", { class: "r4c-captext", text: t });
    const box = E("section", { class: "r4c-box r4c-caption" }, E("h3", { text: ad ? "Advert text" : "Caption" }), txt);
    const more = E("button", { type: "button", class: "r4c-more", hidden: true, "aria-expanded": "false", onclick: () => { const on = box.classList.toggle("open"); more.textContent = on ? "Show less" : "Read all"; more.setAttribute("aria-expanded", String(on)); } }, "Read all");
    box.append(more);
    requestAnimationFrame(() => { if (txt.scrollHeight > txt.clientHeight + 4) more.hidden = false; else box.classList.add("open"); });
    return box;
  }
  // notes already on this version (the client's link only ever gets the client's own and our shared ones)
  function notesOf(p) {
    const it = p.it; if (!it) return null;
    const list = (it.feedback || []).filter((f) => !f.withdrawn && f.item_version === it.version && String(f.comment || "").trim());
    if (!list.length) return null;
    const items = [];
    list.forEach((f) => {
      const vk = (it.media || []).findIndex((m) => m.id === f.variant_id);
      String(f.comment).split("\n").map((s) => s.trim()).filter(Boolean).forEach((line) => {
        const m = /^Slide (\d+):\s?(.*)$/.exec(line), n = m ? +m[1] : vk > 0 && (it.media || []).length > 1 ? vk + 1 : 0;
        items.push(E("li", { class: "r4c-note" }, E("span", { class: "r4c-av", "aria-hidden": "true", text: initials(f.reviewer) }),
          E("div", {}, E("p", { class: "r4c-nhead" }, E("b", { text: f.reviewer || "Someone" }),
            n ? E("button", { type: "button", class: "r4c-sl", title: `Show slide ${n}`, onclick: () => setSlide(n - 1) }, `Slide ${n}`) : null),
            E("p", { class: "r4c-ntext" }, m ? m[2] : line, E("span", { class: "r4c-when", text: " · " + dayShort(f.created_at) })))));
      });
    });
    return E("ul", { class: "r4c-notes" }, ...items);
  }
  // the comment box writes into the page's own draft (getDraft / putDraft), as the Release 3 card does
  function scopeOpts(p, shape) {
    if (shape === "two") return [["both", "Both sizes"], ["portrait", "Portrait"], ["tall", "Tall"]];
    if (shape === "post" && (p.media || []).length > 1) { const u = unitOf(p); return [["slide", `This ${u} (${C.slide + 1})`], ["all", p.kind === "advert" ? "Whole advert" : isLeadForm(p) ? "Whole form" : "Whole post"]]; }
    return null;
  }
  function draftText(p) {
    const it = p.it; if (!it) return "";
    const d = getDraft(it);
    if (C.scope === "slide") { const m = (p.media || [])[C.slide]; return (m && d.slideComments && d.slideComments[m.id]) || ""; }
    return d.comment || "";
  }
  function saveDraftText(p, v) {
    const it = p.it; if (!it) return;
    const d = getDraft(it);
    if (C.scope === "slide") { const m = (p.media || [])[C.slide]; if (m) { d.slideComments = Object.assign({}, d.slideComments || {}); d.slideComments[m.id] = v; } }
    else { d.comment = v; d.sizeAt = C.scope === "portrait" ? "Portrait" : C.scope === "tall" ? "Tall" : null; }
    putDraft(it, d);
  }
  function hasNote(p) {
    const it = p.it; if (!it) return false;
    const d = getDraft(it);
    return !!(String(d.comment || "").trim() || slideTexts(it, d).length);
  }
  function notedLine(p) {
    const it = p.it; if (!it || (p.media || []).length < 2) return "";
    const sl = slideTexts(it, getDraft(it)).map(([n]) => n);
    if (!sl.length) return "";
    const u = unitOf(p);
    return `Notes on ${u} ${sl.join(", ")} go with your answer.`;
  }
  function commentsBox(p, shape) {
    const it = p.it; if (!it) return null;
    const opts = scopeOpts(p, shape);
    const sw = opts ? E("div", { class: "r4c-seg", role: "group", "aria-label": "What your comment is about" },
      opts.map(([k, t]) => E("button", { type: "button", class: "r4c-segb", "data-scope": k, "aria-pressed": String(C.scope === k), onclick: () => { C.scope = k; syncComments(p); C.refs.ta && C.refs.ta.focus(); } }, t))) : null;
    const ta = E("textarea", { class: "r4c-ta", rows: "3", maxlength: "4000", placeholder: shape === "article" ? "Write a comment, or the wording you'd prefer" : "Write a comment, or the caption you'd prefer", "aria-label": "Your comment" });
    ta.value = draftText(p);
    const send = E("button", { type: "button", class: "r4c-btn r4c-sm r4c-main", onclick: (e) => answer(p, "comment", e.currentTarget) }, "Send");
    const noted = E("p", { class: "r4c-noted", text: notedLine(p) });
    const upd = () => { send.disabled = !hasNote(p) || !p.waiting || !!(C.run && C.run.answers.has(p.id)); noted.textContent = notedLine(p); };
    ta.addEventListener("input", () => { saveDraftText(p, ta.value); ta.classList.remove("r4c-need"); upd(); });
    Object.assign(C.refs, { ta, sw, noted, send, upd });
    upd();
    return E("section", { class: "r4c-box r4c-comments", "aria-label": "Comments" }, E("h3", { text: "Comments" }), notesOf(p), sw, ta,
      E("div", { class: "r4c-row r4c-sendrow" }, noted, send));
  }
  function syncComments(p) {
    const r = C.refs; if (!r.ta) return;
    if (r.sw) { const opts = scopeOpts(p, C.shape) || []; r.sw.querySelectorAll(".r4c-segb").forEach((b) => { const o = opts.find((x) => x[0] === b.dataset.scope); if (o) b.textContent = o[1]; b.setAttribute("aria-pressed", String(b.dataset.scope === C.scope)); }); }
    r.ta.value = draftText(p); r.upd && r.upd();
  }

  // ---------- answering (a mirror of the page's send(), for one piece in this card) ----------
  async function answer(p, decision, btn) {
    if (p.panel) return docAnswer(p, decision, btn);
    const it = p.it; if (!it) return;
    if ((decision === "change" || decision === "comment") && !hasNote(p)) {
      say("Please write what should change in the comment box first, then press " + (decision === "change" ? "Ask for changes" : "Send") + " again.", "err");
      if (C.refs.ta) { C.refs.ta.classList.add("r4c-need"); C.refs.ta.focus(); }
      return;
    }
    if (decision === "choose" && !Object.keys(C.picks).length) { say("Please pick one first.", "err"); return; }
    return submit(p, decision, btn, {});
  }
  function refuse() {
    if (typeof TEAM !== "undefined" && TEAM.on) { say(TEAM.client ? "This is the client view, so nothing is sent from here." : "This is the M7Alpha view, so nothing is sent from here. Review it in the session board.", "err"); return true; }
    return false;
  }
  async function submit(p, decision, btn, o) {
    const it = p.it;          // what is on screen: its version and its draft (the words typed)
    if (String(it.id).startsWith("demo-")) { say("This is a sample, so nothing is sent.", "err"); return; }
    if (refuse()) return;
    if (S.sending || C.busy) return;
    // [publish fix, 26 Nov] busy while the name is asked, so a quick second tap cannot send a second note (P-CARD finding)
    let name = null; C.busy = true; try { name = await askName(false); } finally { C.busy = false; }
    if (!name) return;
    const d = getDraft(it), sl = slideTexts(it, d);
    const on = d.sizeAt ? `On the ${String(d.sizeAt).toLowerCase()} size: ` : "";
    const said = [String(d.comment || "").trim() ? on + String(d.comment).trim() : "", ...sl.map(([n, t]) => `Slide ${n}: ${t.replace(/\s*\n\s*/g, " ")}`)].filter(Boolean).join("\n");
    const marks = sl.length ? { slide_comments: Object.fromEntries(sl.map(([n, t]) => [String(n), t])) } : null;
    const picks = decision === "choose" ? Object.assign({}, C.picks) : null;
    const sz = sizesOf(p);
    const variant = decision === "choose" ? (Object.values(picks)[0] || (it.media[0] || {}).id || "text")
      : sz ? (C.scope === "tall" ? sz.tall.id : sz.portrait.id) : ((it.media || [])[C.slide] || (it.media || [])[0] || { id: "text" }).id;
    const args = { p_code: S.code, p_passcode: S.pass, p_item_id: it.id, p_item_version: it.version, p_variant_id: variant, p_reviewer: name, p_decision: decision,
      p_comment: said, p_marks: marks, p_choice: decision !== "choose" ? null : Array.isArray(it.choice) ? JSON.stringify(picks) : picks._ };
    if (typeof EMBED === "undefined" || !EMBED) args.p_edit_key = editKey();
    S.sending = true; C.busy = true; if (btn) btn.disabled = true; say("Sending…");
    const before = JSON.parse(JSON.stringify(Object.assign({}, d, decision === "choose" ? { decision: "choose", picks } : { decision })));
    try {
      const res = await rpc("submit_feedback", args);
      if (res && res.error === "stale") { S.sending = false; C.busy = false; say("This piece was just updated. We've loaded the new version. Please have another look.", "err"); await refreshAll(); draw(); return; }
      if (res && res.error === "no_item") { S.sending = false; C.busy = false; if (btn) btn.disabled = false; say("This page has been replaced by a newer version, so the note couldn't be saved here. Your note is kept here: copy it, then add it to the newest round.", "err"); return; }
      if (!res || !res.ok) throw new Error((res && res.error) || "not saved");
      putDraft(it, null);
      // kept on the page for a while, as the page's own send() keeps it (SENT): Undo deletes the note by its id. The
      // page has swapped its piece objects at every reload since the card opened, so the piece and its round are
      // looked up again by id (holding on to the old object, the second answer of a run found no round, review 26 Nov)
      const rnd = (S.data && S.data.rounds || []).find((r) => r.items.some((x) => x.id === it.id)) || null;
      const now = (rnd && rnd.items.find((x) => x.id === it.id)) || it;
      const mine = { id: "local-" + Date.now(), reviewer: name, decision, comment: said || null, marks: null, item_version: it.version, created_at: new Date().toISOString(), internal: false, choice: picks ? args.p_choice : null };
      try { SENT.set(it.id, { at: Date.now(), item: Object.assign({}, now, { feedback: [...(now.feedback || []), mine] }), round: rnd && Object.assign({}, rnd, { items: [] }),
        pos: rnd ? rnd.items.findIndex((x) => x.id === it.id) : 0, editing: false, noteId: res.id || null, before, local: mine, approved: decision === "approve", noClient: false, hold: false, released: false }); } catch (e) {}
      try { window.M7Install && window.M7Install.answered(); } catch (e) {}
      S.sending = false; C.busy = false;
      if (o.side) { say("Sent. Your note is with the team.", "ok"); refreshAll().then(() => { if (C.mode === "side") drawSide(true); }); return; }
      afterAnswer(p, decision, res.id || null);
    } catch (e) {
      S.sending = false; C.busy = false; if (btn) btn.disabled = false;
      say("That didn't send. Please check your connection and try again. Your note is kept here.", "err");
    }
  }
  const VERB = { approve: "Approved", choose: "Picked", change: "Changes asked", comment: "Sent" };
  function afterAnswer(p, decision, noteId) {
    const r = C.run;
    if (r) r.answers.set(p.id, { decision, noteId, title: cleanTitle(p.title) });
    const nx = nextWaiting(p.id);
    if (nx) {
      const i = r.ids.indexOf(nx);
      C.flash = { verb: VERB[decision] || "Sent", title: cleanTitle(p.title), id: p.id, n: i + 1, m: r.ids.length, undo: !!noteId };
      C.lit = true; goTo(nx, { keepFlash: true });
    } else { C.end = true; C.flash = null; draw(); urlOpen(p.id, "replace"); }
    refreshAll().then(() => { if (C.root && C.end) drawEnd(); });
  }
  function nextWaiting(fromId) {
    const r = C.run; if (!r) return null;
    const i = r.ids.indexOf(fromId);
    const ok = (id) => !r.answers.has(id) && (() => { const q = pieceOf(id); return q ? q.waiting !== false : true; })();
    for (let j = i + 1; j < r.ids.length; j++) if (ok(r.ids[j])) return r.ids[j];
    for (let j = 0; j < i; j++) if (ok(r.ids[j])) return r.ids[j];
    return null;
  }
  async function refreshAll() {
    try { if (typeof loadMine === "function") loadMine(); } catch (e) {}
    try { R4D.reload(); } catch (e) {}
    try { await load({ quiet: true }); } catch (e) {}
    try { await R4D.ready(); } catch (e) {}
    try { window.R4 && window.R4.refresh && window.R4.refresh(); } catch (e) {}
  }
  // Undo: the note is deleted, as the page's oneUndo() does (change_note with p_delete), and the piece waits again
  async function undo(id) {
    if (C.busy || S.sending) return;
    const sent = (() => { try { return SENT.get(id); } catch (e) { return null; } })();
    const rec = C.run && C.run.answers.get(id);
    const noteId = (rec && rec.noteId) || (sent && sent.noteId);
    if (!noteId) return;
    C.busy = true; S.sending = true; say("Taking it back…");
    try {
      const r = await rpc("change_note", { p_code: S.code, p_passcode: S.pass, p_edit_key: editKey(), p_id: noteId, p_delete: true });
      if (!r || !r.ok) throw new Error((r && r.error) || "not saved");
      const it = (pieceOf(id) || {}).it || (sent && sent.item);
      if (it && sent && sent.before) { const dr = Object.assign({}, sent.before); if (dr.decision === "approve") dr.decision = null; putDraft(it, dr); }
      try { SENT.delete(id); } catch (e) {}
      if (C.run) C.run.answers.delete(id);
      C.busy = false; S.sending = false;
      C.flash = null; C.lit = false; C.end = false;
      await refreshAll();
      if (C.root && C.mode === "card") { goTo(id); say("Taken back. It is waiting for your answer again.", "ok"); }
    } catch (e) { C.busy = false; S.sending = false; say("That didn't undo. Please check your connection and try again.", "err"); }
  }

  // ---------- quick answers from a Content tile's grown card (main session, 26 Nov 2026) ----------
  // Lee: hovering a tile on Content grows it and shows Comment, Approve, Open. These save exactly the note the card's own
  // Approve and comment box save (submit_feedback, kept in SENT so Undo can delete it by its id with change_note).
  async function quick(id, decision, o) {
    o = o || {};
    const p = pieceOf(id), it = p && p.it;
    if (!it || p.panel) return { ok: false, msg: "Please open it to answer." };
    if (String(it.id).startsWith("demo-")) return { ok: false, msg: "This is a sample, so nothing is sent." };
    if (typeof TEAM !== "undefined" && TEAM.on) return { ok: false, msg: TEAM.client ? "This is the client view, so nothing is sent from here." : "This is the M7Alpha view, so nothing is sent from here." };
    if (S.sending || C.busy) return { ok: false, msg: "One moment: something is still sending." };
    const said = String(o.comment || "").trim();
    if (decision === "comment" && !said) return { ok: false, msg: "Please write your comment first." };
    let name = null; C.busy = true; try { name = await askName(false); } finally { C.busy = false; }      // [publish fix, 26 Nov]
    if (!name) return { ok: false, msg: "" };
    const args = { p_code: S.code, p_passcode: S.pass, p_item_id: it.id, p_item_version: it.version, p_variant_id: ((it.media || [])[0] || { id: "text" }).id,
      p_reviewer: name, p_decision: decision, p_comment: said, p_marks: null, p_choice: null };
    if (typeof EMBED === "undefined" || !EMBED) args.p_edit_key = editKey();
    S.sending = true;
    try {
      const res = await rpc("submit_feedback", args);
      if (res && res.error === "stale") { S.sending = false; refreshAll(); return { ok: false, msg: "This piece was just updated. Please open it and have another look." }; }
      if (!res || !res.ok) throw new Error((res && res.error) || "not saved");
      // [review2 fix, 26 Nov] a comment's words are kept with it, so Undo puts them back in the card's comment box
      const d = getDraft(it), before = JSON.parse(JSON.stringify(Object.assign({}, d, { decision }, decision === "comment" ? { comment: said } : {})));
      const rnd = (S.data && S.data.rounds || []).find((r) => r.items.some((x) => x.id === it.id)) || null;
      const now = (rnd && rnd.items.find((x) => x.id === it.id)) || it;
      const mine = { id: "local-" + Date.now(), reviewer: name, decision, comment: said || null, marks: null, item_version: it.version, created_at: new Date().toISOString(), internal: false, choice: null };
      try { SENT.set(it.id, { at: Date.now(), item: Object.assign({}, now, { feedback: [...(now.feedback || []), mine] }), round: rnd && Object.assign({}, rnd, { items: [] }),
        pos: rnd ? rnd.items.findIndex((x) => x.id === it.id) : 0, editing: false, noteId: res.id || null, before, local: mine, approved: decision === "approve", noClient: false, hold: false, released: false }); } catch (e) {}
      try { window.M7Install && window.M7Install.answered(); } catch (e) {}
      S.sending = false;
      refreshAll();
      return { ok: true, noteId: res.id || null };
    } catch (e) { S.sending = false; return { ok: false, msg: "That didn't send. Please check your connection and try again." }; }
  }
  async function quickUndo(id) {
    const sent = (() => { try { return SENT.get(id); } catch (e) { return null; } })();
    const noteId = sent && sent.noteId;
    if (!noteId) return { ok: false, msg: "This can't be taken back from here. Please open it." };
    if (S.sending || C.busy) return { ok: false, msg: "One moment: something is still sending." };
    S.sending = true;
    try {
      const r = await rpc("change_note", { p_code: S.code, p_passcode: S.pass, p_edit_key: editKey(), p_id: noteId, p_delete: true });
      if (!r || !r.ok) throw new Error((r && r.error) || "not saved");
      const it = sent.item;
      if (it && sent.before) { const dr = Object.assign({}, sent.before); if (dr.decision === "approve") dr.decision = null; try { putDraft(it, dr); } catch (e) {} }
      try { SENT.delete(id); } catch (e) {}
      S.sending = false; await refreshAll(); return { ok: true };
    } catch (e) { S.sending = false; return { ok: false, msg: "That didn't undo. Please check your connection and try again." }; }
  }

  // ---------- articles and wording ----------
  function bodyArticle(p) {
    const it = p.it || {}, paper = E("article", { class: "r4c-paper" });
    const media = it.media || p.media || [];
    const feat = media.find((m) => /featured|cover|header/i.test(m.label || ""));
    if (feat) paper.append(E("img", { class: "r4c-feat", src: mediaUrl(feat.path), alt: "", width: feat.width || null, height: feat.height || null, decoding: "async" }));
    const text = String(it.caption || (p.lib && p.lib.caption) || "").replace(/\r/g, "");
    const plain = (s) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");
    for (const b of text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)) {
      const pic = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/.exec(b);
      if (pic) { const m = media.find((x) => x.id === pic[2]); if (m) paper.append(E("figure", {}, E("img", { src: mediaUrl(m.path), alt: pic[1] || "", loading: "lazy" }), pic[1] ? E("figcaption", { text: pic[1] }) : null)); continue; }
      const hd = /^(#{1,4})\s+(.*)$/s.exec(b);
      if (hd) { paper.append(E(hd[1].length <= 2 ? "h3" : "h4", { text: plain(hd[2].replace(/\s+/g, " ")) })); continue; }
      const lines = b.split("\n");
      if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) { paper.append(E("ul", {}, lines.map((l) => E("li", { text: plain(l.replace(/^\s*([-*•]|\d+[.)])\s+/, "")) })))); continue; }
      const para = E("p"); lines.forEach((l, k) => { if (k) para.append(E("br")); para.append(plain(l)); }); paper.append(para);
    }
    if (!text.trim()) paper.append(E("p", { class: "r4c-empty", text: "There's no text on this piece yet." }));
    const left = E("div", { class: "r4c-paperwrap" }, paper);
    const col = E("div", { class: "r4c-col" }, answerBox(p, "article"), commentsBox(p, "article"), detailsBox(p));
    return E("div", { class: "r4c-body" }, flashLine(), E("div", { class: "r4c-split" }, left, col));
  }

  // ---------- pick one ----------
  function bodyPick(p) {
    const it = p.it, qs = (typeof questionsOf === "function") ? questionsOf(it) : [];
    const q = qs[0] || { key: "_", kind: "versions", options: [] };
    const opts = (q.options || []).map((o, i) => {
      const mm = /^([A-D])(?:\s+|$)(.*)$/.exec(String(o.label || "").trim());
      return { o, m: (it.media || []).find((x) => x.id === o.id) || null, letter: mm ? mm[1] : String.fromCharCode(65 + i), name: mm ? mm[2] : String(o.label || "") };
    });
    const n = opts.length;
    C.view = Math.max(0, Math.min(C.view, n));
    const answered = !!(C.run && C.run.answers.get(p.id)) || !p.waiting;
    const stage = E("div", { class: "r4c-stage r4c-picks" + (C.view ? " one" : "") });
    const shown = C.view ? [opts[C.view - 1]] : opts;
    const boxes = [];
    shown.forEach((x) => {
      const picked = C.picks[q.key] === x.o.id;
      const box = E("div", { class: "r4c-fit" + (picked ? " picked" : "") }, q.kind === "texts" || !x.m ? E("div", { class: "r4c-textopt", text: x.name || x.o.label }) : mediaEl(x.m, `Option ${x.letter}`, p));
      boxes.push({ box, m: x.m });
      stage.append(E("figure", { class: "r4c-fig r4c-opt" },
        E("span", { class: "r4c-chip c-rev r4c-optlab", text: "Option " + x.letter }), box,
        E("button", { type: "button", class: "r4c-btn r4c-pickb" + (picked ? " r4c-main" : ""), "aria-pressed": String(picked), disabled: answered,
          onclick: () => { C.picks = Object.assign({}, C.picks, { [q.key]: x.o.id }); try { const d = getDraft(it); d.picks = Object.assign({}, C.picks); d.decision = "choose"; putDraft(it, d); } catch (e) {} draw(); say(""); } },
          picked ? "✓ Picked" : "Pick this one")));
    });
    const prev = roundBtn("prev", C.view === 1 ? "See both options" : "Previous option", () => setView(C.view - 1), C.view <= 0);
    const next = roundBtn("next", C.view === 0 ? "See option A on its own" : "Next option", () => setView(C.view + 1), C.view >= n);
    const hint = E("p", { class: "r4c-pickhint", text: n === 2 ? "Two options. Pick the one you like, or use the arrows to see each one on its own." : `${n} options. Pick the one you like, or use the arrows to see each one on its own.` });
    const ta = E("textarea", { class: "r4c-ta r4c-pickta", rows: "1", maxlength: "4000", placeholder: "Add a comment about either option, if you like", "aria-label": "Your comment" });
    ta.value = (getDraft(it).comment || "");
    ta.addEventListener("input", () => { const d = getDraft(it); d.comment = ta.value; d.sizeAt = null; putDraft(it, d); });
    C.refs.ta = ta;
    const send = E("button", { type: "button", class: "r4c-btn r4c-main", disabled: answered, onclick: (e) => answer(p, "choose", e.currentTarget) }, "Send my answer");
    const done = answered ? answeredBox(p, C.run && C.run.answers.get(p.id)) : null;
    watchFit(stage, () => fitBoxes(stage, boxes.map((b) => b.box), boxes.map((b) => ratioFor(b.m)), 40, 30 + 58));
    return E("div", { class: "r4c-body r4c-pickbody" }, flashLine(), metaLine(p), q.question && !/^which one do you prefer\??$/i.test(q.question) ? E("p", { class: "r4c-pickq", text: q.question }) : null, hint,
      E("div", { class: "r4c-pickmain" }, prev, stage, next),
      done, E("div", { class: "r4c-pickbar" }, ta, send), E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
  }
  function setView(v) {
    const p = cur(); if (!p || C.shape !== "pick") return;
    const qs = (typeof questionsOf === "function") ? questionsOf(p.it) : [], n = ((qs[0] || {}).options || []).length;
    v = Math.max(0, Math.min(v, n)); if (v === C.view) return;
    C.view = v; draw();
  }

  // ---------- documents (our own pages, drawn by the document plug-in itself) ----------
  const docQ = (p) => { const d = p.panel && p.panel.c.data; return d && d.walkthrough && d.walkthrough.question && d.walkthrough.question.text ? d.walkthrough.question : null; };
  const docPages = (p) => ((p.panel && p.panel.c.data && p.panel.c.data.pages) || []).filter((x) => x && x.path);
  function docDownload(p) {
    const d = p.panel.c.data || {};
    if (!d.file_path) return null;
    const name = d.file_name || "document.pdf";
    // pressing it presses the plug-in's own Download (so its "opened" record is made as before)
    return E("a", { class: "r4c-btn r4c-sm r4c-dlbtn", href: mediaUrl(d.file_path) + "?download=" + encodeURIComponent(name), download: name,
      onclick: (e) => { const own = C.refs.slot && C.refs.slot.querySelector(".dc-full"); if (own) { e.preventDefault(); own.click(); } } }, ic(SVG.down), "Download PDF");
  }
  const docCur = () => { const b = C.refs.slot && C.refs.slot.querySelector(".dc-card[data-n]"); return b ? +b.dataset.n || 1 : 1; };
  const docTotal = () => { const b = C.refs.slot && C.refs.slot.querySelector(".dc-card[data-total]"); return b ? +b.dataset.total || 1 : 1; };
  function docGo(n) {
    const slot = C.refs.slot; if (!slot) return;
    const b = slot.querySelector(`.wt-dots [data-slide="${n}"]`);
    if (b) b.click();
    syncDoc();
  }
  function bodyDoc(p) {
    const { c, p: plug } = p.panel;
    const slot = E("div", { class: "panelslot r4c-docslot", "data-kind": c.kind, "data-id": c.id });
    C.refs.slot = slot;
    const render = () => { try { plug.render(c, slot, PCTX); } catch (e) { slot.replaceChildren(E("p", { class: "r4c-empty", text: "This document can't load right now. Please try again." })); } };
    render();
    slot.addEventListener("dc-redraw", () => { render(); syncDoc(); });
    slot.addEventListener("dc-slide", () => syncDoc());
    const pages = docPages(p);
    const thumbs = pages.length > 1 ? E("div", { class: "r4c-thumbs", role: "group", "aria-label": "Pages" },
      pages.map((pg, i) => E("button", { type: "button", class: "r4c-thumb", "data-n": String(i + 1), "aria-label": "Page " + (i + 1), title: "Page " + (i + 1), onclick: () => docGo(i + 1) },
        E("img", { src: mediaUrl(pg.path), alt: "", loading: "lazy", decoding: "async" }), E("span", { text: String(i + 1) })))) : null;
    // "‹ 1 of 3 ›" sits in the row of page pictures, above the page, never over it (review 26 Nov: it hid the plan's words).
    // A document with no page pictures (the plug-in's slides) keeps the plug-in's own arrows.
    const bar = thumbs ? E("div", { class: "r4c-pagebar" }, roundBtn("prev", "Previous page", () => docGo(docCur() - 1)), E("b", { class: "r4c-pn", "aria-live": "polite" }), roundBtn("next", "Next page", () => docGo(docCur() + 1))) : null;
    const wrap = E("div", { class: "r4c-docwrap pcwrap" }, slot);
    C.refs.thumbs = thumbs; C.refs.bar = bar;
    const left = E("div", { class: "r4c-docarea" + (pages.length ? "" : " slides") },
      thumbs ? E("div", { class: "r4c-dochead" }, thumbs, E("p", { class: "r4c-dochint", text: "Click a page, or use the arrows." }), bar) : null, wrap);
    const col = E("div", { class: "r4c-col" }, docAnswerBox(p), docComments(p), docDetails(p));
    requestAnimationFrame(syncDoc);
    return E("div", { class: "r4c-body" }, flashLine(), E("div", { class: "r4c-split" }, left, col));
  }
  function syncDoc() {
    const slot = C.refs.slot; if (!slot || !slot.isConnected) return;
    const n = docCur(), N = docTotal(), unit = (slot.querySelector(".dc-card[data-unit]") || {}).dataset ? ((slot.querySelector(".dc-card[data-unit]") || { dataset: {} }).dataset.unit === "Pages" ? "Page" : slot.querySelector(".dc-plainpv") ? "Page" : "Slide") : "Page";
    if (C.refs.thumbs) C.refs.thumbs.querySelectorAll(".r4c-thumb").forEach((b) => { const on = +b.dataset.n === n; b.classList.toggle("on", on); b.setAttribute("aria-current", on ? "page" : "false"); });
    if (C.refs.bar) {
      C.refs.bar.hidden = N < 2;
      const pn = C.refs.bar.querySelector(".r4c-pn"); if (pn) pn.textContent = `${n} of ${N}`;
      const [pv, nx] = C.refs.bar.querySelectorAll(".r4c-round"); if (pv) pv.disabled = n <= 1; if (nx) nx.disabled = n >= N;
    }
    C.docUnit = unit;
    const r = C.refs; if (r.dsw) r.dsw.querySelectorAll(".r4c-segb").forEach((b) => { if (b.dataset.scope === "page") b.textContent = `This ${unit.toLowerCase()} (${n})`; b.setAttribute("aria-pressed", String(b.dataset.scope === C.scope)); });
    if (r.dta && document.activeElement !== r.dta) r.dta.value = C.scope === "page" ? (C.docDraft.pages[n] || "") : C.docDraft.all;
  }
  function docAnswerBox(p) {
    const c = p.panel.c, q = docQ(p), word = docWord(p), rec = C.run && C.run.answers.get(p.id);
    if (rec || !c.waiting) return E("section", { class: "r4c-box r4c-answer r4c-done" }, E("p", { class: "r4c-lead" }, ic(SVG.check, "r4c-tick"), E("b", { text: "Thank you. We have your answer." })),
      E("p", { class: "r4c-small", text: "You can answer again; the newest answer counts." }), E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
    const btns = [];
    if (q) {
      const ch = q.choices || [], yes = ch.find((x) => !x.opens_box), box = ch.find((x) => x.opens_box);
      if (yes) btns.push(E("button", { type: "button", class: "r4c-btn r4c-main", onclick: (e) => docChoice(p, yes, e.currentTarget) }, yes.label));
      ch.filter((x) => x !== yes && x !== box).forEach((x) => btns.push(E("button", { type: "button", class: "r4c-btn", onclick: (e) => docChoice(p, x, e.currentTarget) }, x.label)));
      btns.push(E("button", { type: "button", class: "r4c-btn", onclick: (e) => docAnswer(p, "change", e.currentTarget) }, box ? box.label : "Ask for changes"));
    } else {
      btns.push(E("button", { type: "button", class: "r4c-btn r4c-main", onclick: (e) => docAnswer(p, "approve", e.currentTarget) }, "Approve"),
        E("button", { type: "button", class: "r4c-btn", onclick: (e) => docAnswer(p, "change", e.currentTarget) }, "Ask for changes"));
    }
    return E("section", { class: "r4c-box r4c-answer", "aria-label": "Your answer" },
      E("p", { class: "r4c-lead" }, E("b", { text: "M7Alpha needs your answer. " }), q ? q.text : `Approve the ${word} as it is, or say what should change.`),
      c.note ? E("p", { class: "r4c-from" }, E("b", { text: "From M7Alpha: " }), String(c.note)) : null,
      E("div", { class: "r4c-row" }, ...btns), E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
  }
  function docDetails(p) {
    const c = p.panel.c, d = c.data || {}, pages = docPages(p).length || d.page_count;
    const rows = [];
    if (c.created_at || d.sent_at) rows.push(["Sent", dayLong(c.created_at || d.sent_at)]);
    if (c.answer_by) rows.push(["Answer by", dayLong(c.answer_by)]);
    if (d.campaign) rows.push(["Campaign", cleanCamp(d.campaign)]);
    if ((d.platforms || []).length) rows.push(["Channels", channels(d.platforms)]);
    if (pages) rows.push(["Pages", String(pages)]);
    return rows.length ? E("section", { class: "r4c-box r4c-details", "aria-label": "Details" }, E("dl", { class: "r4c-dl" }, ...rows.flatMap(([k, v]) => [E("dt", { text: k }), E("dd", {}, v)]))) : null;
  }
  function docComments(p) {
    const c = p.panel.c, d = c.data || {}, word = docWord(p);
    const prev = (d.answers || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const notes = prev.length ? E("ul", { class: "r4c-notes" }, prev.slice(0, 6).map((a) => E("li", { class: "r4c-note" },
      E("span", { class: "r4c-av", "aria-hidden": "true", text: initials(a.name || (a.mine ? S.me : "")) }),
      E("div", {}, E("p", { class: "r4c-nhead" }, E("b", { text: a.mine ? "You" : a.name || "Someone" })),
        E("p", { class: "r4c-ntext" }, a.choice ? "Chose: " + a.choice : a.decision === "approve" ? "Approved" : "Comment", [a.box, a.comment].filter(Boolean).map((x) => " - " + x).join(""),
          E("span", { class: "r4c-when", text: " · " + dayShort(a.created_at) })))))) : null;
    const dsw = E("div", { class: "r4c-seg", role: "group", "aria-label": "What your comment is about" },
      [["page", "This page (1)"], ["all", "Whole " + word]].map(([k, t]) => E("button", { type: "button", class: "r4c-segb", "data-scope": k, "aria-pressed": String(C.scope === k),
        onclick: () => { C.scope = k; syncDoc(); dta.focus(); } }, t)));
    const dta = E("textarea", { class: "r4c-ta", rows: "3", maxlength: "4000", placeholder: "Write a comment, or what you'd like changed", "aria-label": "Your comment" });
    dta.addEventListener("input", () => { if (C.scope === "page") C.docDraft.pages[docCur()] = dta.value; else C.docDraft.all = dta.value; dta.classList.remove("r4c-need"); });
    const send = E("button", { type: "button", class: "r4c-btn r4c-sm r4c-main", onclick: (e) => docAnswer(p, "comment", e.currentTarget) }, "Send");
    Object.assign(C.refs, { dsw, dta, ta: dta });
    return E("section", { class: "r4c-box r4c-comments", "aria-label": "Comments" }, E("h3", { text: "Comments" }), notes, dsw, dta, E("div", { class: "r4c-row r4c-sendrow" }, E("span"), send));
  }
  function docText() {
    const dd = C.docDraft || { all: "", pages: {} }, u = C.docUnit || "Page";
    const lines = Object.keys(dd.pages).map(Number).sort((a, b) => a - b).map((n) => [n, String(dd.pages[n] || "").trim()]).filter(([, t]) => t).map(([n, t]) => `${u} ${n}: ${t.replace(/\s*\n\s*/g, " ")}`);
    const all = String(dd.all || "").trim();
    return [...lines, all].filter(Boolean).join("\n");
  }
  // the plug-in's own comment box, filled with our words (its own input handler keeps them in its draft)
  function docPut(sel, text) {
    const t = C.refs.slot && C.refs.slot.querySelector(sel); if (!t) return false;
    t.value = text; t.dispatchEvent(new Event("input", { bubbles: true })); return true;
  }
  const docComment = (text) => docPut(".wt-ta", text) || docPut(".dc-answer .dc-ta", text);
  async function docChoice(p, choice, btn) {
    if (refuse()) return;
    const slot = C.refs.slot; if (!slot || C.busy) return;
    docComment(docText());
    const b = [...slot.querySelectorAll(".wt-choice")].find((x) => x.dataset.choice === choice.label);
    if (!b) { say("This answer can't be sent from here. Please try again.", "err"); return; }
    docWatch(p, "approve", btn); b.click();
  }
  async function docAnswer(p, decision, btn) {
    if (refuse()) return;
    const slot = C.refs.slot; if (!slot || C.busy) return;
    const q = docQ(p), text = docText();
    if (decision === "approve") {
      docComment(text);
      const ok = slot.querySelector(".dc-ok:not([hidden])") || slot.querySelector(".dc-answer .dc-ok");
      if (!ok) { const yes = q && (q.choices || []).find((x) => !x.opens_box); if (yes) return docChoice(p, yes, btn); say("This can't be approved from here. Please try again.", "err"); return; }
      docWatch(p, "approve", btn); ok.click(); return;
    }
    if (!text) { say("Please write what should change in the comment box first, then press " + (decision === "change" ? "the button" : "Send") + " again.", "err"); if (C.refs.dta) { C.refs.dta.classList.add("r4c-need"); C.refs.dta.focus(); } return; }
    const boxChoice = decision === "change" && q && (q.choices || []).find((x) => x.opens_box);
    if (boxChoice) {
      let b = [...slot.querySelectorAll(".wt-choice")].find((x) => x.dataset.choice === boxChoice.label);
      if (b && b.getAttribute("aria-pressed") !== "true") b.click();          // the plug-in opens its own box for this answer
      docComment("");
      if (!docPut(".wt-box", text)) { say("This answer can't be sent from here. Please try again.", "err"); return; }
      const s = slot.querySelector(".wt-send"); if (!s) { say("This answer can't be sent from here. Please try again.", "err"); return; }
      docWatch(p, "change", btn); s.click(); return;
    }
    if (!docComment(text)) { say("Comments can't be sent on this document from here.", "err"); return; }
    const s = slot.querySelector(".wt-sendcmt") || slot.querySelector(".dc-answer .dc-ghost");
    if (!s) { say("Comments can't be sent on this document from here.", "err"); return; }
    docWatch(p, decision === "change" ? "change" : "comment", btn); s.click();
  }
  // the plug-in answers on its own; this watches its card for the "sent" line (or its error) and then moves on
  function stopWatch() { if (C.watch) { clearInterval(C.watch); C.watch = 0; } }
  function docWatch(p, decision, btn) {
    stopWatch();
    const slot = C.refs.slot, sig = () => [...slot.querySelectorAll(".wt-done, .dc-thanks")].map((x) => x.textContent).join("|");
    const base = sig(), t0 = Date.now();
    C.busy = true; if (btn) btn.disabled = true; say("Sending…");
    C.watch = setInterval(() => {
      if (!C.root || !slot.isConnected) { stopWatch(); C.busy = false; return; }
      const err = slot.querySelector(".wt-err"), now = sig();
      if (now && now !== base) { stopWatch(); C.busy = false; C.docDraft = { all: "", pages: {} }; afterAnswer(p, decision, null); return; }
      if (err && err.textContent.trim()) { stopWatch(); C.busy = false; if (btn) btn.disabled = false; say(err.textContent.trim(), "err"); return; }
      const modal = document.getElementById("modal");
      if (modal && !modal.hidden) return;          // their name is being asked: wait for it
      if (Date.now() - t0 > 20000) { stopWatch(); C.busy = false; if (btn) btn.disabled = false; say("That didn't send. Please check your connection and try again.", "err"); }
    }, 250);
  }

  // ---------- the end of a row ----------
  function drawEnd() {
    if (!C.root || C.mode !== "card") return;
    if (C.ro) { C.ro.disconnect(); C.ro = null; }
    const r = C.run; if (!r) return close();
    const recs = r.ids.map((id) => ({ id, p: pieceOf(id), a: r.answers.get(id) }));
    const ok = recs.filter((x) => x.a && (x.a.decision === "approve" || x.a.decision === "choose")).length;
    const chg = recs.filter((x) => x.a && (x.a.decision === "change" || x.a.decision === "comment")).length;
    const n = r.ids.length;
    const title = n === 1 ? `All done: ${cleanTitle(r.title)}. Thank you.` : `That's all ${n} ${lowerFirst(r.title)}. Thank you.`;
    const counts = E("p", { class: "r4c-endcounts" });
    if (ok) counts.append(E("b", { text: `${ok} approved` }));
    if (ok && chg) counts.append(" · ");
    if (chg) counts.append(E("b", { text: `${chg} with changes asked` }));
    counts.append(chg ? ". We'll send the changed ones back to you." : ok ? "." : "Thank you for looking.");
    if (n === 1) counts.replaceChildren(ok ? "You approved it. Thank you for your answer." : chg ? "You asked for changes. We'll send you a new version here." : "Thank you for looking.");
    const grid = E("div", { class: "r4c-endgrid" }, recs.map((x) => {
      const mark = x.a ? (x.a.decision === "approve" || x.a.decision === "choose" ? E("span", { class: "r4c-mk ok", "aria-label": "Approved", html: SVG.check }) : E("span", { class: "r4c-mk chg", "aria-label": "Changes asked", html: SVG.pencil })) : null;
      const pg = x.p && x.p.panel ? docPages(x.p)[0] : null, th = x.p && (x.p.thumb || (pg ? mediaUrl(pg.path) : null));
      return E("div", { class: "r4c-endtile", title: x.p ? cleanTitle(x.p.title) : "" }, th ? E("img", { src: th, alt: "", loading: "lazy" }) : E("span", { class: "r4c-endtx", text: x.p ? (x.p.panel ? cap1(docWord(x.p)) : (x.p.kindLabel || "Piece")) : "" }), mark);
    }));
    let rows = []; try { rows = R4D.rows(); } catch (e) {}
    // the row order as it was when the card opened (the answered row may have left the list since), new rows after it
    const order = (r.order || []).concat(rows.map((x) => x.key).filter((k) => !(r.order || []).includes(k)));
    const at = order.indexOf(r.key), seq = at < 0 ? order : [...order.slice(at + 1), ...order.slice(0, at)];
    const nr = seq.map((k) => rows.find((x) => x.key === k)).find((x) => x && x.fromTask && x.key !== r.key && x.pieces.some((y) => y.waiting && !(r.answers.has(y.id)))) || null;
    const waitN = nr ? nr.pieces.filter((y) => y.waiting).length : 0;
    const docRun = r.ids.length > 0 && r.ids.every((id) => { const q = pieceOf(id); return !!(q && q.panel); });
    const acts =E("div", { class: "r4c-endacts" },
      nr ? E("button", { type: "button", class: "r4c-btn r4c-main", onclick: () => { const first = nr.pieces.find((y) => y.waiting && !r.answers.has(y.id)) || nr.pieces.find((y) => y.waiting); C.run = null; C.end = false; open(first.id, { rowKey: nr.key, newRow: true }); } }, `Next: ${nr.title} (${waitN}) ›`) : null,
      // a document or report lives on Home, not on Content (Lee, 26 Nov 2026), so its card closes back to Home
      E("button", { type: "button", class: "r4c-btn" + (nr ? "" : " r4c-main"), onclick: () => { const sh = !!(window.R4 && window.R4.go); close(sh ? { quiet: true } : {}); if (sh) { try { window.R4.go(docRun ? "home" : "content", { replace: true }); } catch (e) {} } } }, docRun ? "Close and go back to Home" : "Close and go back to Content"));
    C.card.className = "r4c-card sz-end";
    C.card.replaceChildren(
      E("header", { class: "r4c-head" }, E("div", { class: "r4c-hl" }, E("div", { class: "r4c-chips" }, chip(r.title, "type"), chip("All answered", "pub")),
        E("h2", { class: "r4c-title", id: "r4c-title", text: title })), E("div", { class: "r4c-hr" }, closeBtn())),
      E("div", { class: "r4c-body r4c-endbody" }, counts, grid, acts));
    requestAnimationFrame(() => { const b = C.card && C.card.querySelector(".r4c-endacts .r4c-btn"); try { b && b.focus({ preventScroll: true }); } catch (e) {} });
  }

  // ---------- the side panel (a piece that is not waiting) ----------
  function sideLine(p) {
    const it = p.it, st = it ? statusOf(it) : null, lib = p.lib || {};
    const when = st && st.at ? dayLong(st.at) : lib.answered_at ? dayLong(lib.answered_at) : "";
    const who = st && st.by && S.me && st.by !== S.me ? st.by : "You";
    const go = goesOut(p) || (lib.scheduled_for ? dayLong(lib.scheduled_for) + (timeOf(lib.scheduled_for) ? ", " + timeOf(lib.scheduled_for) : "") : "");
    const out = (lead) => E("p", {}, lead, go && p.status !== "published" ? E("span", {}, " It goes out ", E("b", { text: go + "." })) : "");
    switch (p.status) {
      case "approve": return [out(`${who} approved this${when ? " on " + when : ""}.`), "ok"];
      case "choose": { let pick = ""; try { pick = st && st.choice ? picksText(it, st.choice) : ""; } catch (e) {} return [out(`${who} picked ${pick || "one"}${when ? " on " + when : ""}.`), "ok"]; }
      case "scheduled": return [E("p", {}, "It's scheduled to go out ", E("b", { text: (go || "soon") + "." })), "sch"];
      case "published": return [E("p", {}, "It went out", p.date || lib.published_at ? E("span", {}, " on ", E("b", { text: dayLong(lib.published_at || p.date) + "." })) : "."), "ok"];
      case "change": return [E("p", {}, `${who} asked for changes${when ? " on " + when : ""}. We're making them, and the new version will come back to you here.`), "chg"];
      default: return [E("p", { text: "Nothing is waiting for you on this one." }), "ok"];
    }
  }
  function activity(p) {
    const it = p.it, out = [];
    ((it && it.feedback) || (p.lib && p.lib.feedback) || []).filter((f) => !f.withdrawn).forEach((f) => {
      const what = f.decision === "approve" ? "approved it" : f.decision === "choose" ? "picked one" : f.decision === "change" ? "asked for changes" : "left a comment";
      out.push({ at: f.created_at, who: f.reviewer || "Someone", what, text: String(f.comment || "").trim() });
    });
    const sent = (it && it.created_at) || (p.lib && (p.lib.created_at || p.lib.sent_at));
    if (sent) out.push({ at: sent, who: "M7Alpha", what: "sent it for review", text: "" });
    out.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    return out;
  }
  function drawSide(keepStatus) {
    if (!C.root || C.mode !== "side") return;
    const p = pieceOf(C.id) || C.sideP; if (!p) return close();
    C.sideP = p;
    const it = p.it, st = STC[p.status] || STC.done;
    let stText = st[0];
    try { const s = it ? statusOf(it) : null; if (p.status === "approve" && (!s || !s.by || s.by === S.me)) stText = "Approved by you"; } catch (e) {}
    const [line, tone] = sideLine(p);
    const shape = p.panel ? "doc" : shapeOf(p);
    const pic = p.thumb ? E("div", { class: "r4c-sthumb" }, E("img", { src: p.thumb, alt: cleanTitle(p.title), decoding: "async" })) : null;
    // the pins already on its first picture (read only here: the piece has been answered)
    try { const m0 = (p.media || [])[0]; if (pic && window.R4PIN && m0 && m0.type === "image" && pinsOf(p, m0).length) R4PIN.attach(pic, { pins: pinsOf(p, m0) }); } catch (e) {}
    const det = detailsBox(p);
    const acts = activity(p);
    const actBox = E("section", { class: "r4c-box r4c-activity", "aria-label": "Activity" }, E("h3", { text: "Activity" }),
      acts.length ? E("ul", { class: "r4c-notes" }, acts.map((a) => E("li", { class: "r4c-note" }, E("span", { class: "r4c-av" + (a.who === "M7Alpha" ? " m7" : ""), "aria-hidden": "true", text: initials(a.who) }),
        E("div", {}, E("p", { class: "r4c-nhead" }, E("b", { text: a.who }), " " + a.what), a.text ? E("p", { class: "r4c-ntext", text: a.text }) : null,
          a.at ? E("p", { class: "r4c-when2", text: dayLong(a.at) + (timeOf(a.at) ? ", " + timeOf(a.at) : "") }) : null)))) : E("p", { class: "r4c-small", text: "Nothing new on this one." }));
    const inData = !!it && !!(S.data && (S.data.rounds || []).some((r) => r.items.some((x) => x.id === it.id)));
    if (inData && p.status !== "published") {
      const ta = E("textarea", { class: "r4c-ta", rows: "2", maxlength: "4000", placeholder: "Spotted something? Tell us before it goes out.", "aria-label": "Your note to M7Alpha" });
      ta.value = getDraft(it).comment || "";
      ta.addEventListener("input", () => { const d = getDraft(it); d.comment = ta.value; d.sizeAt = null; putDraft(it, d); });
      C.refs.ta = ta;
      actBox.append(ta, E("p", { class: "r4c-small r4c-notehint", text: "A note asks us to look at this piece again before it goes out." }),
        E("div", { class: "r4c-row r4c-sendrow" }, E("span"), E("button", { type: "button", class: "r4c-btn r4c-sm r4c-main", onclick: (e) => {
        if (!String(getDraft(it).comment || "").trim()) { say("Write your note first.", "err"); ta.focus(); return; }
        submit(p, "comment", e.currentTarget, { side: true }); } }, "Send note")), E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
    } else if (typeof r3MsgBox === "function" && (() => { try { return typeof r3MsgOn === "function" && !!r3MsgOn(); } catch (e) { return false; } })()) {
      // [review2 fix, 26 Nov] only while messages are switched on (r4_shell.js wraps r3MsgOn with MSG_LIVE): with the switch
      // off, the side panel's own button sent messages nobody reads
      actBox.append(E("button", { type: "button", class: "r4c-btn r4c-msg", onclick: () => {
        const box = r3MsgBox(); box.hidden = false; const t = box.querySelector("textarea");
        if (t) { if (!t.value.trim()) t.value = `About “${cleanTitle(p.title)}”: `; t.focus(); t.setSelectionRange(t.value.length, t.value.length); } } }, ic(SVG.chat), "Message M7Alpha"));
    }
    const status = keepStatus && C.card.querySelector(".r4c-status") ? C.card.querySelector(".r4c-status").cloneNode(true) : null;
    C.card.replaceChildren(
      E("header", { class: "r4c-head" }, E("div", { class: "r4c-hl" }, E("div", { class: "r4c-chips" }, chip(typeLabel(p, shape), "type"), chip(stText, st[1])),
        E("h2", { class: "r4c-title", id: "r4c-title", text: cleanTitle(p.title) })), E("div", { class: "r4c-hr" }, closeBtn())),
      E("div", { class: "r4c-sbody" }, E("div", { class: "r4c-wash t-" + tone, role: "status" }, line),
        pic || det ? E("div", { class: "r4c-sgrid" + (pic ? "" : " nopic") }, pic, det) : null, captionBox(p), actBox));
    if (status) { const s = C.card.querySelector(".r4c-status"); if (s) s.replaceWith(status); }
  }

  // ---------- keys ----------
  document.addEventListener("keydown", (e) => {
    if (!C.root || blocked()) return;
    const typing = e.target && e.target.closest && e.target.closest("textarea, input, select, [contenteditable]");
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === "Tab") {          // focus stays inside the card
      const f = [...C.card.querySelectorAll("button:not([disabled]), a[href], textarea, input, video[controls], [tabindex='0']")].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || !C.card.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !C.card.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
      return;
    }
    if (typing || e.altKey || e.ctrlKey || e.metaKey || C.mode !== "card" || C.end) return;
    const k = e.key;
    if (k === "ArrowLeft" || k === "ArrowRight") {
      const d = k === "ArrowRight" ? 1 : -1;
      if (C.shape === "post") setSlide(C.slide + d); else if (C.shape === "pick") setView(C.view + d); else if (C.shape === "doc") docGo(docCur() + d); else return;
      e.preventDefault(); e.stopPropagation();
    } else if (k === "ArrowDown" || k === "j" || k === "J") { e.preventDefault(); e.stopPropagation(); step(1); }
    else if (k === "ArrowUp" || k === "k" || k === "K") { e.preventDefault(); e.stopPropagation(); step(-1); }
  }, true);

  // ---------- start-up: ?open=<id> in the address opens that piece once the data is in ----------
  (function boot() {
    const want = urlParams().get("open"); if (!want) return;
    if (window.R4 && window.R4.__shell) return;          // the shell opens it once its page has drawn (R4C.open with fromAddress)
    const t0 = Date.now();
    const tick = () => {
      let ready = false; try { ready = !!(S && S.data) && R4D.on(); } catch (e) {}
      if (ready) { R4D.ready().then(() => { if (!C.root && urlParams().get("open") === want) open(want, { rowKey: urlParams().get("row") || undefined, fromStart: true }); }); return; }
      if (Date.now() - t0 < 30000) setTimeout(tick, 300);
    };
    tick();
  })();

  window.R4C = { open, close, isOpen, quick, quickUndo, _state: C };
})();
