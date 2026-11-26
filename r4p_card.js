/* [PART R4P-card, 26 Nov 2026] Release 4 on phones: the opened piece, full screen (TEST COPY, phone build only).
   Owner: Builder P-CARD (r4p_card.js + r4p_card.css). Loads only in build\R4P.html, after r4_core.js (window.R4C).
   What it does: on a phone (under 901 px, body.r4), every card R4C draws is re-arranged for a small screen, by moving
   R4C's OWN elements and restyling them. Nothing here saves anything: every answer, comment, pick, Undo and document
   answer is R4C's own button (or the document plug-in's), pressed by the client or clicked through for them.
     Opened piece (P04-P06): top bar  x | "2 of 8 · row" | previous | next;  type and status, title, "Goes out ..." with the
       channel icons;  the picture (swipe or the round arrows for slides, dots, "Slide 2 of 7");  "This slide / Whole post";
       caption and details;  fixed at the bottom: a comment line and Approve / Ask for changes.
     Comment sheet (P07): the comment line opens R4C's own comment box in a sheet over the bottom, kept above the keyboard
       (visual viewport). Send = R4C's Send. Ask for changes with no words opens the same sheet first ("What should
       change?"); its Send then presses R4C's Ask for changes. Cancel puts the words back as they were.
     Pick one (P08): one option at a time (R4C's own one-at-a-time view), an A / B switch, swipe, "You picked Option A",
       R4C's "Pick this one" and "Send my answer".
     Plan / document (P09): our own page pictures one at a time (the plug-in is asked for its laptop page view on the
       phone: Lee, 26 Nov 2026, no phone copies of plans), page arrows and dots, pinch (or double tap) to zoom the page,
       Download PDF in the top bar, the plan's own answer buttons fixed at the bottom.
     Answered piece (P10): R4C's side panel becomes a sheet rising from the bottom: drag handle, close, the note box fixed
       at its foot. Swipe down on the handle, x, the dim or Back closes it.
   Safari's bars: the card is fixed to the layout viewport (top 0, bottom 0), so its bottom bar sits on the real bottom
   edge whether Safari's toolbar shows or not, with the home bar's safe area under it; the page behind is locked, so the
   bars do not slide while a card is open. With the keyboard up, the card follows the visual viewport (--r4p-vvt /
   --r4p-vvh, as Release 3's writing view does), so the sheet sits on the keyboard.
   window.R4PC = { phone(), backFirst(), openSheet(mode), closeSheet(cancel) }   (backFirst: Back closes the comment sheet before the piece) */
(function () {
  "use strict";
  if (window.__r4pcard) return;
  window.__r4pcard = true;
  const MQ = matchMedia("(max-width: 900px)");
  const phone = () => MQ.matches && !!document.body && document.body.classList.contains("r4");
  const st = () => (window.R4C && window.R4C._state) || null;
  const E = (...a) => h(...a);
  const SVG = {
    left: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5 6.5 10l5.5 5.5"/></svg>',
    right: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4.5l5.5 5.5L8 15.5"/></svg>',
    check: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 10.5 3.2 3.2L15 6.8"/></svg>',
  };
  const txt = (el, s) => { if (el && el.textContent !== s) el.textContent = s; };
  const attr = (el, k, v) => { if (!el) return; if (v == null) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, String(v)); };
  const hide = (el, on) => { if (el && el.hidden !== !!on) el.hidden = !!on; };
  function curPiece() {
    const s = st(); if (!s || !s.id) return null;
    let p = null; try { p = R4D.piece(s.id); } catch (e) {}
    return p || (s.run && s.run.cache && s.run.cache.get(s.id)) || (s.sideP && s.sideP.id === s.id ? s.sideP : null);
  }
  const ratioOf = (m) => (m && m.width && m.height ? m.height / m.width : m && m.type === "video" ? 16 / 9 : 1.25);
  const dayLong = (iso) => { if (!iso) return ""; const t = new Date(String(iso).length <= 10 ? iso + "T12:00:00" : iso); return isNaN(t) ? "" : [t.toLocaleDateString("en-GB", { weekday: "short" }), t.getDate(), t.toLocaleDateString("en-GB", { month: "short" })].join(" "); };

  // ---------- the visual viewport: the keyboard ----------
  // Same rule as Release 3 (body.kbd): the keyboard is up when the visible part is 140 px shorter than the window.
  function vv() {
    const v = window.visualViewport, ih = window.innerHeight, de = document.documentElement;
    const hh = v ? v.height : ih, top = v ? v.offsetTop : 0;
    de.style.setProperty("--r4p-vvh", Math.round(hh) + "px"); de.style.setProperty("--r4p-vvt", Math.round(top) + "px");
    const kb = MQ.matches && ih - hh > 140;
    if (document.body) document.body.classList.toggle("r4p-kb", kb);
  }
  try { const v = window.visualViewport; if (v) { v.addEventListener("resize", vv); v.addEventListener("scroll", vv); } } catch (e) {}
  addEventListener("resize", vv);
  if (document.body) vv(); else document.addEventListener("DOMContentLoaded", vv, { once: true });

  // ---------- the plan's own pages on a phone ----------
  // The document plug-in shows its laptop page view (our page pictures) only at 901 px and wider; on a phone it shows its
  // short slides. Lee (26 Nov 2026): phones show the normal plan pages, with pinch to zoom. So, only while it draws into
  // R4C's card on a phone, the plug-in is told it is on a laptop. Everything it then does (its answers, its comment box,
  // its page buttons) is its own laptop code, the one R4C already uses on laptops.
  function wrapPlug(pl) {
    if (!pl || typeof pl.render !== "function" || pl.__r4p) return;
    const orig = pl.render; pl.__r4p = true;
    pl.render = function (c, el, ctx) {
      if (!(phone() && el && el.classList && el.classList.contains("r4c-docslot"))) return orig.apply(this, arguments);
      const mm = window.matchMedia;
      const fake = (q, on) => ({ matches: on, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } });
      window.matchMedia = function (q) { const s = String(q); if (/min-width:\s*901px/.test(s)) return fake(s, true); if (/max-width:\s*(900|640)px/.test(s)) return fake(s, false); return mm.call(window, q); };
      let ctx2 = ctx; try { ctx2 = Object.create(ctx, { phone: { value: () => false } }); } catch (e) {}
      try { return orig.call(this, c, el, ctx2); } finally { window.matchMedia = mm; }
    };
  }
  function wrapPlugs() { try { if (typeof PANELS !== "undefined" && Array.isArray(PANELS)) PANELS.forEach(wrapPlug); } catch (e) {} }
  wrapPlugs();
  try { const q = window.StudioPanelsQueue; if (q && typeof q.push === "function") { const o = q.push; q.push = function () { const r = o.apply(this, arguments); wrapPlugs(); return r; }; } } catch (e) {}

  // ---------- watching R4C's card ----------
  let cardEl = null, obs = null, busy = false;
  function watchRoot() {
    const root = document.querySelector("body > .r4c-root");
    const card = root ? root.querySelector(":scope > .r4c-card, :scope > .r4c-side") : null;
    if (card === cardEl) return;
    if (obs) obs.disconnect(); obs = null; cardEl = card;
    if (!card) return;
    wrapPlugs();
    obs = new MutationObserver(onMut);
    obs.observe(card, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-pressed", "disabled", "class", "hidden"] });
    onMut();
  }
  function onMut() {
    if (busy || !cardEl) return;
    busy = true;
    try { if (phone()) { if (cardEl.classList.contains("r4c-side")) doSide(cardEl); else doCard(cardEl); } }
    catch (e) { console.warn("R4P-card", e); }
    finally { if (obs) obs.takeRecords(); busy = false; }
  }
  function startWatch() { new MutationObserver(watchRoot).observe(document.body, { childList: true }); watchRoot(); }
  if (document.body) startWatch(); else document.addEventListener("DOMContentLoaded", startWatch, { once: true });

  // ---------- the opened piece ----------
  function kindOf(body) {
    if (body.classList.contains("r4c-endbody")) return "end";
    if (body.classList.contains("r4c-pickbody")) return "pick";
    if (body.querySelector(":scope > .r4c-split > .r4c-docarea")) return "doc";
    if (body.querySelector(":scope > .r4c-split > .r4c-paperwrap")) return "article";
    return "post";
  }
  function doCard(card) {
    const s = st(); if (!s || s.mode !== "card") return;
    const head = card.querySelector(":scope > .r4c-head"), body = card.querySelector(":scope > .r4c-body");
    if (!head || !body) return;
    const kind = kindOf(body), p = curPiece();
    if (card.dataset.r4p !== kind) card.dataset.r4p = kind;
    if (!head.__r4p) { head.__r4p = true; buildTop(card, head, body, kind, p); }
    if (!body.__r4p) { body.__r4p = true; delete card.dataset.sheet; buildBody(card, head, body, kind, p); }
    sync(card, kind, p);
  }
  const chipTexts = (head) => [...head.querySelectorAll(".r4c-chips .r4c-chip")].map((c) => c.textContent.trim());
  function buildTop(card, head, body, kind, p) {
    const s = st(), hr = head.querySelector(":scope > .r4c-hr"); if (!hr) return;
    const chips = chipTexts(head), title = (head.querySelector(".r4c-title") || {}).textContent || "";
    let ctr = null;
    if (kind === "end") ctr = E("div", { class: "r4p-ctr" }, E("b", { text: chips[1] || "All answered" }), chips[0] ? E("small", { text: chips[0] }) : null);
    else if (kind === "doc") {
      const c = p && p.panel && p.panel.c, by = c && c.answer_by && c.waiting ? "Answer by " + dayLong(c.answer_by) : chips[1] || "";
      ctr = E("div", { class: "r4p-ctr r4p-left" }, E("b", { text: title }), by ? E("small", { text: by }) : null);
    } else if (!hr.querySelector(".r4c-count")) ctr = E("div", { class: "r4p-ctr" }, E("b", { text: chips[0] || "" }), s && s.run && s.run.title ? E("small", { text: s.run.title }) : null);
    if (ctr) hr.prepend(ctr);
    const nav = hr.querySelectorAll(".r4c-nav > .r4c-btn");
    if (nav[0]) { nav[0].innerHTML = SVG.left; attr(nav[0], "aria-label", "Previous piece"); attr(nav[0], "title", "Previous piece"); }
    if (nav[1]) { nav[1].innerHTML = SVG.right; attr(nav[1], "aria-label", "Next piece"); attr(nav[1], "title", "Next piece"); }
    // "Download PDF": on the smallest phones only "PDF" shows beside the arrow (the title needs the room)
    const dl = hr.querySelector(".r4c-dlbtn");
    if (dl) { const tn = [...dl.childNodes].find((n) => n.nodeType === 3 && /Download PDF/.test(n.textContent)); if (tn) { tn.replaceWith(E("span", { class: "r4p-dlw", text: "Download" }), E("span", { text: "PDF" })); attr(dl, "aria-label", "Download the PDF"); } }
    if (kind === "end") { const t = head.querySelector(".r4c-title"); if (t) body.prepend(E("div", { class: "r4p-endtick", "aria-hidden": "true", html: SVG.check }), t); }
  }
  function buildBody(card, head, body, kind, p) {
    if (kind === "end") return;
    const split = body.querySelector(":scope > .r4c-split");
    const col = (split || body).querySelector(".r4c-col");
    const ans = col ? col.querySelector(":scope > .r4c-answer") : body.querySelector(":scope > .r4c-done");
    const com = col ? col.querySelector(":scope > .r4c-comments") : null;
    const det = col ? col.querySelector(":scope > .r4c-details") : null;
    const parts = { ans, com, det };
    if (kind === "doc") return buildDoc(card, head, body, split, parts, p);
    if (kind === "pick") return buildPick(card, head, body, p);
    // posts, carousels, two sizes, adverts, lead forms, articles
    const lead = E("div", { class: "r4p-lead" });
    const hl = head.querySelector(":scope > .r4c-hl"); if (hl) lead.append(hl);
    const meta = metaFrom(det); if (meta) lead.append(meta);
    const from = ans && ans.querySelector(".r4c-from"); if (from) lead.append(from);
    if (split) split.before(lead); else body.prepend(lead);
    const art = split && split.querySelector(":scope > .r4c-art");
    const seg = com && com.querySelector(":scope > .r4c-seg");
    if (seg && art) art.after(seg);
    if (art) swipe(art, () => slideBy(card, 1), () => slideBy(card, -1));
    barAndSheet(card, kind, { ans, com, seg, mirror: !!seg });
    if (com) hide(com, !com.querySelector(":scope > .r4c-notes"));
  }
  // "Goes out Thu 3 Dec, 09:00 · [icons]" under the title, from R4C's own details box (whose two lines are then hidden)
  function metaFrom(det) {
    if (!det) return null;
    const dts = [...det.querySelectorAll("dt")];
    const row = (w) => { const dt = dts.find((x) => x.textContent.trim() === w); return dt ? [dt, dt.nextElementSibling] : null; };
    const go = row("Goes out"), ch = row("Channels");
    if (!go && !ch) return null;
    const kids = [];
    if (go && go[1]) { kids.push(E("span", { text: "Goes out " + go[1].textContent.trim() })); }
    if (ch && ch[1]) {
      const pl = ch[1].querySelector(".r4c-plats"), names = ch[1].textContent.trim();
      if (pl) { const c = pl.cloneNode(true); c.setAttribute("role", "img"); c.setAttribute("aria-label", names); if (kids.length) kids.push(E("span", { "aria-hidden": "true", text: "·" })); kids.push(c); }
    }
    [go, ch].forEach((r) => r && r.forEach((x) => x && x.classList.add("r4p-dup")));
    hide(det, !dts.some((x) => !x.classList.contains("r4p-dup")));
    return E("p", { class: "r4c-meta r4p-meta" }, ...kids);
  }

  // ---------- the bar at the bottom and the comment sheet ----------
  function fieldBtn(card, mode) {
    return E("button", { type: "button", class: "r4p-field", "aria-haspopup": "dialog", onclick: () => openSheet(card, mode) }, E("span", { class: "r4p-fx" }));
  }
  function barAndSheet(card, kind, o) {
    const bar = E("div", { class: "r4p-bar" });
    const sheet = E("div", { class: "r4p-sheet", hidden: true, role: "dialog", "aria-modal": "false", "aria-labelledby": "r4p-shtitle" });
    const ta = o.ta || (o.com && o.com.querySelector("textarea.r4c-ta"));
    const send = o.send || (o.com && o.com.querySelector(".r4c-sendrow .r4c-btn"));
    const noted = o.com && o.com.querySelector(".r4c-noted");
    const done = o.done || (o.ans && o.ans.classList.contains("r4c-done") ? o.ans : null);
    let row = null, change = null;
    if (done) { bar.classList.add("r4p-donebar"); bar.append(done); }
    else {
      const status = o.status || (o.ans && o.ans.querySelector(".r4c-status"));
      row = o.row || (o.ans && o.ans.querySelector(".r4c-row"));
      if (status) bar.append(status);
      if (ta) bar.append(fieldBtn(card, kind === "pick" ? "pick" : "comment"), E("p", { class: "r4p-noted", hidden: true }));
      if (row) { row.classList.add("r4p-acts"); bar.append(row); }
      change = kind === "pick" ? null : row && [...row.querySelectorAll("button.r4c-btn")].pop();
      // Ask for changes with nothing written: the sheet opens first ("What should change?"), so the words go with it
      if (change) bar.addEventListener("click", (e) => {
        const b = e.target.closest && e.target.closest("button"); if (b !== change || hasText(card, kind)) return;
        e.stopPropagation(); e.preventDefault(); openSheet(card, "change");
      }, true);
    }
    card.append(bar);
    guard(card);
    if (!ta || done) return;
    // the sheet: "Your comment" | Cancel, the scope switch, R4C's own box and its Send
    const title = E("b", { class: "r4p-shtitle", id: "r4p-shtitle", text: "Your comment" });
    const head = E("div", { class: "r4p-shhead" }, title, E("button", { type: "button", class: "r4p-cancel", onclick: () => closeSheet(card, true) }, "Cancel"));
    let seg = null;
    if (o.mirror && o.seg) seg = E("div", { class: "r4c-seg r4p-mseg", role: "group", "aria-label": o.seg.getAttribute("aria-label") || "What your comment is about" },
      [...o.seg.querySelectorAll(".r4c-segb")].map((b) => E("button", { type: "button", class: "r4c-segb", "data-scope": b.dataset.scope, onclick: () => { const real = o.seg.querySelector(`.r4c-segb[data-scope="${b.dataset.scope}"]`); if (real) real.click(); } }, b.textContent)));
    else if (o.seg) seg = o.seg;          // a document: R4C's own switch lives in the sheet
    const btns = E("div", { class: "r4p-shbtns" });
    if (kind === "pick") btns.append(E("button", { type: "button", class: "r4c-btn r4c-main", onclick: () => closeSheet(card, false) }, "Done"));
    else {
      if (send) { send.classList.add("r4p-send"); btns.append(send); }
      if (change) btns.append(E("button", { type: "button", class: "r4c-btn r4c-main r4p-chgsend", onclick: () => {
        if (!hasText(card, kind)) { sayHere(card, "Please write what should change first."); try { ta.focus({ preventScroll: true }); } catch (e) {} return; }
        card.__r4pproxy = true; try { change.click(); } finally { card.__r4pproxy = false; } } }, "Send"));
    }
    ta.rows = 2;
    if (!ta.__r4p) { ta.__r4p = true; ta.addEventListener("input", () => { grow(ta); syncField(card, kind); }); }
    sheet.append(head, seg || "", E("div", { class: "r4p-shrow" }, ta, btns), noted || "", E("p", { class: "r4c-status", role: "status", "aria-live": "polite" }));
    card.append(sheet);
  }
  // One tap, one answer: R4C asks for the person's name (askName) before it marks itself as sending, so two quick taps
  // could both get through. A second tap on a sending button within 0.9 s, or while R4C is sending, is dropped here.
  const SAVES = ".r4p-acts .r4c-btn, .r4p-send, .r4p-chgsend, .r4p-foot .r4c-sendrow .r4c-btn";
  function guard(el) {
    if (el.__r4pguard) return; el.__r4pguard = true;
    el.addEventListener("click", (e) => {
      if (el.__r4pproxy) return;
      const b = e.target.closest && e.target.closest(SAVES); if (!b || !el.contains(b)) return;
      const now = Date.now(), s = st();
      let sending = false; try { sending = !!S.sending; } catch (x) {}
      if ((el.__r4plast && now - el.__r4plast < 900) || sending || (s && s.busy)) { e.stopPropagation(); e.preventDefault(); }
    }, true);
    // the time is taken only when the tap reached R4C's button (not when it only opened the comment sheet)
    el.addEventListener("click", (e) => { const b = e.target.closest && e.target.closest(SAVES); if (b && el.contains(b)) el.__r4plast = Date.now(); });
  }
  const grow = (ta) => { ta.style.height = "auto"; ta.style.height = Math.min(140, Math.max(68, ta.scrollHeight + 2)) + "px"; };
  function sayHere(card, msg) { const s = card.querySelector(":scope > .r4p-sheet .r4c-status"); if (s) { s.className = "r4c-status err"; s.textContent = msg; } }
  function hasText(card, kind) {
    const s = st();
    if (kind === "doc") { const dd = (s && s.docDraft) || {}; return !!(String(dd.all || "").trim() || Object.values(dd.pages || {}).some((v) => String(v || "").trim())); }
    const p = curPiece(), it = p && p.it; if (!it) return false;
    let d = null; try { d = getDraft(it); } catch (e) { return false; }
    let sl = []; try { sl = slideTexts(it, d) || []; } catch (e) {}
    return !!(String(d.comment || "").trim() || sl.length);
  }
  function openSheet(card, mode) {
    card = card || cardEl; if (!card) return;
    const sh = card.querySelector(":scope > .r4p-sheet"); if (!sh) return;
    const kind = card.dataset.r4p, p = curPiece(), s = st();
    if (sh.hidden) card.__r4pBack = { href: location.href, state: history.state };          // Back closes the sheet first (backFirst)
    if (sh.hidden) {          // what Cancel puts back
      try { card.__r4psnap = kind === "doc" ? { doc: JSON.parse(JSON.stringify((s && s.docDraft) || { all: "", pages: {} })) } : p && p.it ? { d: JSON.parse(JSON.stringify(getDraft(p.it))) } : null; } catch (e) { card.__r4psnap = null; }
    }
    sh.dataset.mode = mode || "comment";
    txt(sh.querySelector(".r4p-shtitle"), mode === "change" ? "What should change?" : "Your comment");
    const st0 = sh.querySelector(":scope > .r4c-status"); if (st0 && mode !== "change") { st0.className = "r4c-status"; st0.textContent = ""; }
    sh.hidden = false; card.dataset.sheet = "1";
    const ta = sh.querySelector("textarea");
    if (ta) { if (ta.dataset.r4pph == null) ta.dataset.r4pph = ta.placeholder;
      ta.placeholder = mode === "change" ? (kind === "doc" ? "Write what should change" : "Write what should change, or the caption you'd prefer") : ta.dataset.r4pph; }
    if (ta) { grow(ta); try { ta.focus({ preventScroll: true }); const n = ta.value.length; ta.setSelectionRange(n, n); } catch (e) {} }
  }
  function closeSheet(card, cancel) {
    card = card || cardEl; if (!card) return;
    const sh = card.querySelector(":scope > .r4p-sheet"); if (!sh || sh.hidden) return;
    const ta = sh.querySelector("textarea");
    try { ta && ta.blur(); } catch (e) {}
    if (ta && ta.dataset.r4pph != null) ta.placeholder = ta.dataset.r4pph;
    sh.hidden = true; delete card.dataset.sheet;
    if (cancel) restore(card);
    card.__r4psnap = null;
    syncField(card, card.dataset.r4p);
  }
  // Cancel: the draft goes back to what it was when the sheet opened, then R4C fills its box from the draft itself
  function restore(card) {
    const sn = card.__r4psnap, kind = card.dataset.r4p, p = curPiece(), s = st(); if (!sn) return;
    const ta = card.querySelector(":scope > .r4p-sheet textarea");
    try {
      if (sn.doc && s && s.docDraft) { s.docDraft.all = sn.doc.all; s.docDraft.pages = sn.doc.pages; }
      else if (sn.d && p && p.it) putDraft(p.it, sn.d);
    } catch (e) {}
    const on = card.querySelector(".r4c-seg:not(.r4p-mseg) .r4c-segb[aria-pressed='true']");
    if (on) { on.click(); try { ta && ta.blur(); } catch (e) {} return; }
    if (ta && sn.d) { ta.value = String(sn.d.comment || ""); ta.dispatchEvent(new Event("input", { bubbles: true })); }
    else if (ta && sn.doc) { ta.value = String(sn.doc.all || ""); }
  }
  function placeholderOf(card, kind, ta) {
    const on = card.querySelector(".r4c-seg:not(.r4p-mseg) .r4c-segb[aria-pressed='true']");
    const t = on ? on.textContent.trim() : "", m = /^This (\w+) \((\d+)\)$/.exec(t);
    if (kind === "doc") {
      const whole = [...card.querySelectorAll(".r4c-seg .r4c-segb")].map((b) => b.textContent.trim()).find((x) => /^Whole /.test(x)) || "Whole document";
      const word = whole.replace(/^Whole /, "").toLowerCase();
      return m ? `Comment on this ${m[1]}, or the whole ${word}` : `Comment on the whole ${word}`;
    }
    if (kind === "pick") return "Add a comment, if you like";          // one line on the smallest phone (the sheet's box keeps R4C's words)
    if (m) return `Write a comment about ${m[1]} ${m[2]}`;
    if (on && /^(portrait|tall)$/.test(on.dataset.scope || "")) return `Write a comment about the ${on.dataset.scope} size`;
    return (ta && ta.placeholder) || "Write a comment";
  }
  function syncField(card, kind) {
    const f = card.querySelector(":scope > .r4p-bar .r4p-field"); if (!f) return;
    const ta = card.querySelector(":scope > .r4p-sheet textarea"), v = ta ? ta.value.trim().replace(/\s+/g, " ") : "";
    txt(f.querySelector(".r4p-fx"), v || placeholderOf(card, kind, ta));
    f.classList.toggle("has", !!v);
    attr(f, "aria-label", v ? "Your comment: " + v + ". Tap to change it." : placeholderOf(card, kind, ta));
    const nb = card.querySelector(":scope > .r4p-bar .r4p-noted"), nr = card.querySelector(".r4c-noted"), nt = nr ? nr.textContent.trim() : "";
    if (nb) { txt(nb, nt); hide(nb, !nt); }
  }

  // ---------- slides: dots, swipe, the picture's size ----------
  function swipe(el, onLeft, onRight) {
    if (el.__r4psw) return; el.__r4psw = true;
    let x0 = null, y0 = 0, many = false;
    el.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { many = true; x0 = null; return; }
      if (e.target.closest && e.target.closest("video, button")) { x0 = null; return; }
      many = false; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (x0 == null || many) { if (!e.touches.length) many = false; return; }
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) (dx < 0 ? onLeft : onRight)();
    }, { passive: true });
  }
  function slideBy(card, d) {
    const b = card.querySelector(`.r4c-art .r4c-${d > 0 ? "next" : "prev"}`);
    if (!b || b.disabled) return;
    card.__r4pdir = d; b.click();
  }
  function stageSize(card, kind, p) {
    const s = st(); if (!s || !p) return;
    const stage = kind === "pick" ? card.querySelector(".r4c-pickmain > .r4c-picks") : card.querySelector(".r4c-art > .r4c-stage");
    if (!stage || stage.__r4ph) return;
    const W = (stage.parentElement && stage.parentElement.clientWidth) || card.clientWidth || 390;
    const maxH = Math.max(220, Math.round((card.clientHeight || innerHeight) * 0.6));
    let hh;
    if (kind === "pick") {
      if (!stage.classList.contains("one")) return;
      const box = stage.querySelector(".r4c-fit"), img = box && box.querySelector("img, video");
      const it = p.it || {}, q = (typeof questionsOf === "function" ? questionsOf(it)[0] : null) || { options: [] };
      const o = q.options[Math.max(0, (s.view || 1) - 1)], m = o ? (it.media || []).find((x) => x.id === o.id) : null;
      // as large as fits with "Pick this one" and the line under it still on screen (never under 240 px)
      const body = card.querySelector(":scope > .r4c-body"), br = body ? body.getBoundingClientRect() : null, sr = stage.getBoundingClientRect();
      const room = br ? body.clientHeight - (sr.top - br.top + body.scrollTop) - 88 - 50 : maxH;
      hh = Math.round(Math.min((W - 140) * ratioOf(m || (img ? { width: img.naturalWidth, height: img.naturalHeight } : null)), maxH, Math.max(240, room))) + 88;
    } else if (stage.classList.contains("r4c-pair")) {
      // the pair sits 16 px in from each side (the stage is 32 px narrower, r4p_card.css); R4C keeps 34 px for one caption
      // line, and a phone needs two ("Tall · for Stories and Reels" wraps under its own picture), so 18 px more
      const ms = (p.media || []).filter((x) => x.type !== "text"), inv = ms.reduce((a, m) => a + 1 / ratioOf(m), 0) || 1.4;
      hh = Math.round(Math.min((stage.clientWidth - 26) / inv, maxH)) + 52;
    } else {
      const ms = p.media || [], m = ms[Math.max(0, Math.min(s.slide || 0, ms.length - 1))];
      hh = Math.round(Math.min((W - (ms.length > 1 ? 128 : 64)) * ratioOf(m), maxH));
    }
    stage.__r4ph = true; stage.style.height = hh + "px";
    const dir = card.__r4pdir; card.__r4pdir = 0;
    if (dir) { const f = stage.querySelector(".r4c-fit"); if (f) f.classList.add(dir > 0 ? "r4p-inr" : "r4p-inl"); }
  }
  function dots(card, p) {
    const s = st(), art = card.querySelector(".r4c-art"); if (!art || !p) return;
    const under = art.querySelector(":scope > .r4c-under"), n = (p.media || []).length;
    if (!under || n < 2) return;
    let wrap = art.querySelector(":scope > .r4p-under");
    if (!wrap) { wrap = E("div", { class: "r4p-under" }, E("span", { class: "r4p-dots", "aria-hidden": "true" })); art.append(wrap); }
    if (under.parentElement !== wrap) wrap.append(under);
    const d = wrap.querySelector(".r4p-dots"), k = Math.max(0, Math.min(s.slide || 0, n - 1));
    if (n > 15) { hide(d, true); return; }
    if (d.childElementCount !== n) d.replaceChildren(...Array.from({ length: n }, () => E("i")));
    [...d.children].forEach((x, i) => x.classList.toggle("on", i === k));
  }

  // ---------- pick one ----------
  function optsOf(p) {
    const it = (p && p.it) || {}, q = (typeof questionsOf === "function" ? questionsOf(it)[0] : null) || { key: "_", options: [] };
    return { q, list: (q.options || []).map((o, i) => { const mm = /^([A-D])(?:\s+|$)/.exec(String(o.label || "").trim()); return { o, letter: mm ? mm[1] : String.fromCharCode(65 + i) }; }) };
  }
  function goView(card, v) {
    let guard = 10;
    while (guard-- > 0) {
      const s = st(); if (!s || s.view === v) return;
      const b = card.querySelector(`.r4c-pickmain > .r4c-${s.view < v ? "next" : "prev"}`);
      if (!b || b.disabled || (s.view === 1 && v < 1)) return;
      b.click();
    }
  }
  function buildPick(card, head, body, p) {
    const hl = head.querySelector(":scope > .r4c-hl"), meta = body.querySelector(":scope > .r4c-meta"), q = body.querySelector(":scope > .r4c-pickq");
    const lead = E("div", { class: "r4p-lead" }, hl || "", meta || "", q || "");
    body.prepend(lead);
    const flash = body.querySelector(":scope > .r4c-flash"); if (flash) body.prepend(flash);
    const { list } = optsOf(p);
    const s = st();
    const seg = E("div", { class: "r4c-seg r4p-optseg", role: "group", "aria-label": "Which option to see" },
      list.map((x, i) => E("button", { type: "button", class: "r4c-segb", "data-v": String(i + 1), onclick: () => goView(card, i + 1) }, "Option " + x.letter)));
    lead.after(seg);
    const main = body.querySelector(":scope > .r4c-pickmain");
    if (main) {
      const stage = main.querySelector(":scope > .r4c-picks");
      const prev = E("button", { type: "button", class: "r4p-arr r4p-prev", "aria-label": "Previous option", html: SVG.left, onclick: () => { const v = (st() || {}).view || 1; if (v > 1) goView(card, v - 1); } });
      const next = E("button", { type: "button", class: "r4p-arr r4p-next", "aria-label": "Next option", html: SVG.right, onclick: () => { const v = (st() || {}).view || 1; if (v < list.length) goView(card, v + 1); } });
      (stage || main).append(prev, next);
      swipe(main, () => next.click(), () => prev.click());
      // a tap on the picture picks it (R4C's own "Pick this one" under it), so a small phone needs no scrolling to pick
      main.addEventListener("click", (e) => {
        const fit = e.target.closest && e.target.closest(".r4c-fit"); if (!fit) return;
        const b = fit.parentElement && fit.parentElement.querySelector(".r4c-pickb");
        if (b && !b.disabled && b.getAttribute("aria-pressed") !== "true") b.click();
      });
      main.after(E("p", { class: "r4p-pickline", "aria-live": "polite" }));
    }
    const bar = body.querySelector(":scope > .r4c-pickbar");
    barAndSheet(card, "pick", { ta: bar && bar.querySelector("textarea"), row: bar ? E("div", { class: "r4c-row" }, bar.querySelector(".r4c-btn")) : null,
      status: body.querySelector(":scope > .r4c-status"), done: body.querySelector(":scope > .r4c-done") });
    if (bar) hide(bar, true);
    // one option at a time on a phone (R4C's own view for it: its arrow from "both" to "Option A")
    if (s && s.view === 0 && list.length) queueMicrotask(() => { const b = card.querySelector(".r4c-pickmain > .r4c-next"); if (b && st() && st().view === 0) b.click(); });
  }
  function syncPick(card, p) {
    const s = st(); if (!s) return;
    const { q, list } = optsOf(p), picked = (s.picks || {})[q.key], v = s.view || 0;
    card.querySelectorAll(".r4p-optseg .r4c-segb").forEach((b, i) => { const x = list[i]; if (!x) return; txt(b, (x.o.id === picked ? "✓ " : "") + "Option " + x.letter); attr(b, "aria-pressed", String(+b.dataset.v === v)); });
    const pv = card.querySelector(".r4p-arr.r4p-prev"), nx = card.querySelector(".r4p-arr.r4p-next");
    if (pv) pv.disabled = v <= 1; if (nx) nx.disabled = v >= list.length;
    const line = card.querySelector(".r4p-pickline");
    if (line) {
      const answered = !!card.querySelector(".r4p-donebar");
      const pk = list.find((x) => x.o.id === picked), shown = list[v - 1], other = list.length === 2 && shown ? list.find((x) => x !== shown) : null;
      const see = other ? `Swipe to see Option ${other.letter}.` : "Swipe to see the other options.";
      const want = answered ? "" : pk ? `You picked Option ${pk.letter}. ${see}` : `Tap the picture to pick it. ${see}`;
      if (line.__t !== want) { line.__t = want; line.replaceChildren(...(pk && !answered ? ["You picked ", E("b", { text: "Option " + pk.letter }), ". " + see] : [want])); }
    }
  }

  // ---------- documents ----------
  function buildDoc(card, head, body, split, o, p) {
    const area = split && split.querySelector(":scope > .r4c-docarea");
    const wrap = area && area.querySelector(".r4c-docwrap"), slot = area && area.querySelector(".r4c-docslot");
    const bar = area && area.querySelector(".r4c-pagebar");
    if (bar && !bar.querySelector(".r4p-pg")) { const pv = bar.querySelector(".r4c-prev"); const pg = E("div", { class: "r4p-pg" }, E("b", { class: "r4p-pgt", "aria-hidden": "true" }), E("span", { class: "r4p-dots", "aria-hidden": "true" })); if (pv) pv.after(pg); else bar.prepend(pg); }
    if (bar) bar.querySelectorAll(".r4c-round").forEach((b) => { b.innerHTML = b.classList.contains("r4c-prev") ? SVG.left : SVG.right; });
    // under the page: the ask, the note from M7Alpha, earlier comments and the details
    if (wrap) {
      const more = E("div", { class: "r4p-docmore" });
      const lead = o.ans && !o.ans.classList.contains("r4c-done") && o.ans.querySelector(".r4c-lead");
      const from = o.ans && o.ans.querySelector(".r4c-from");
      if (lead || from) more.append(E("section", { class: "r4c-box r4p-ask" }, lead || "", from || ""));
      if (o.com) more.append(o.com);
      if (o.det) more.append(o.det);
      wrap.append(more);
      if (slot) zoomable(wrap, slot);
    }
    const seg = o.com && o.com.querySelector(":scope > .r4c-seg");
    barAndSheet(card, "doc", { ans: o.ans, com: o.com, seg, mirror: false });
    if (o.com) hide(o.com, !o.com.querySelector(":scope > .r4c-notes"));
  }
  function syncDoc(card) {
    const bar = card.querySelector(".r4c-pagebar"); if (!bar) return;
    const pn = bar.querySelector(".r4c-pn"), m = /(\d+)\s+of\s+(\d+)/.exec(pn ? pn.textContent : "");
    if (!m) return;
    const n = +m[1], N = +m[2], s = st(), unit = (s && s.docUnit) || "Page";
    txt(bar.querySelector(".r4p-pgt"), `${unit} ${n} of ${N}`);
    const d = bar.querySelector(".r4p-dots");
    if (d) { if (N > 15) hide(d, true); else { if (d.childElementCount !== N) d.replaceChildren(...Array.from({ length: N }, () => E("i"))); [...d.children].forEach((x, i) => x.classList.toggle("on", i === n - 1)); } }
    const wrap = card.querySelector(".r4c-docwrap");
    if (wrap && wrap.__r4pz && wrap.__r4pn !== n) { wrap.__r4pn = n; wrap.__r4pz.reset(); }
  }
  // pinch (two fingers) or double tap zooms the page; when zoomed, one finger moves around it (the frame scrolls both ways)
  function zoomable(wrap, slot) {
    if (wrap.__r4pz) return;
    let z = 1, pinch = null, pinched = false, tap = { t: 0, x: 0, y: 0 };
    const set = (nz, cx, cy) => {
      nz = Math.max(1, Math.min(4, nz)); if (Math.abs(nz - z) < 0.001) return;
      const r = nz / z, sl = wrap.scrollLeft, sy = wrap.scrollTop;
      z = nz; wrap.style.setProperty("--r4p-z", z.toFixed(3)); wrap.classList.toggle("r4p-zoomed", z > 1.01);
      wrap.scrollLeft = Math.max(0, (sl + cx) * r - cx); wrap.scrollTop = Math.max(0, (sy + cy) * r - cy);
    };
    const pt = (t) => { const rc = wrap.getBoundingClientRect(); return [t.clientX - rc.left, t.clientY - rc.top]; };
    wrap.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) { const [a, b] = e.touches, [ax, ay] = pt(a), [bx, by] = pt(b); pinch = { d: Math.hypot(ax - bx, ay - by) || 1, z, cx: (ax + bx) / 2, cy: (ay + by) / 2 }; pinched = true; }
    }, { passive: true });
    wrap.addEventListener("touchmove", (e) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = e.touches, [ax, ay] = pt(a), [bx, by] = pt(b);
      set(pinch.z * Math.hypot(ax - bx, ay - by) / pinch.d, pinch.cx, pinch.cy);
    }, { passive: false });
    // capture: while zoomed, or after a pinch, the plug-in's own swipe (next page) must not fire
    wrap.addEventListener("touchend", (e) => {
      const was = pinched || z > 1.01;
      if (e.touches.length < 2) pinch = null;
      if (!e.touches.length) {
        if (!pinched && e.changedTouches.length === 1) {
          const t = e.changedTouches[0], now = Date.now(), [x, y] = pt(t);
          if (now - tap.t < 320 && Math.hypot(x - tap.x, y - tap.y) < 30 && !(e.target.closest && e.target.closest("button, a"))) { set(z > 1.01 ? 1 : 2.5, x, y); tap.t = 0; }
          else tap = { t: now, x, y };
        }
        if (z < 1.08) set(1, 0, 0);
        pinched = false;
      }
      if (was) e.stopPropagation();
    }, { capture: true, passive: true });
    wrap.addEventListener("gesturestart", (e) => { e.preventDefault(); });
    wrap.__r4pz = { reset: () => { if (z !== 1) set(1, 0, 0); wrap.scrollLeft = 0; }, get z() { return z; }, set: (nz) => set(nz, wrap.clientWidth / 2, wrap.clientHeight / 2) };
  }

  // ---------- keeping it all in step with R4C ----------
  // the stored title "Post 2 · Thu 3 Dec · Two partners, on every file" shows as "Two partners, on every file", as in the
  // mock-ups (the type and the date are already on the chips and the "Goes out" line); the same in the green line after an
  // answer. Laptop untouched (phone only). Final pass, 26 Nov 2026.
  const shortT = (t) => { try { return (window.R4P && R4P.shortTitle(t)) || t; } catch (e) { return t; } };
  function shortTitles(card, kind) {
    if (kind === "post" || kind === "pick" || kind === "article") { const t = card.querySelector(":scope > .r4c-head .r4c-title, .r4p-lead .r4c-title"); if (t) txt(t, shortT(t.textContent)); }
    card.querySelectorAll(".r4c-flash p > b").forEach((b) => { const m = /^([^:]+): (.*)\.$/.exec(b.textContent); if (m) txt(b, `${m[1]}: ${shortT(m[2])}.`); });
  }
  // The "needs your answer" box, one clean box (Lee, 26 Nov 2026: "This part feels clumsy / repetitive"):
  // - the question itself is the heading ("Shall we go ahead with this plan?"), without "M7Alpha needs your answer."
  // - the "From M7Alpha:" grey inner box goes. A note that only says again what the piece is (its title, or a short label
  //   such as "Our plan for the next three weeks" / "What the LinkedIn ads did") is dropped; a real note shows as one plain
  //   line under the question, with no label. "A short label": 8 words or fewer, not a sentence (no . ? ! inside or at the
  //   end), no "you", "your" or "please", and it names the piece's kind or shares a word with its title.
  const STOP = new Set(["our", "the", "a", "an", "for", "of", "to", "this", "that", "here", "is", "and", "in", "on", "with", "what", "did", "do", "does", "how", "it"]);
  const words = (t) => String(t || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
  function noteRepeats(note, p) {
    const n = String(note || "").trim(); if (!n) return true;
    const c = p && p.panel && p.panel.c, d = (c && c.data) || {};
    const titles = [p && p.title, p && shortT(p.title), c && c.title, d.title, d.kind, c && c.kind, p && p.kindLabel, p && p.group];
    let client = ""; try { client = S.data.client.name; } catch (e) {}
    const tw = new Set(titles.flatMap(words)), nw = words(n).filter((w) => !words(client).includes(w));
    if (!nw.length || nw.every((w) => tw.has(w) || tw.has(w.replace(/s$/, "")))) return true;
    const label = n.split(/\s+/).length <= 8 && !/[.?!]/.test(n) && !/(you|your|please)/i.test(n);
    return label && nw.some((w) => tw.has(w) || tw.has(w.replace(/s$/, "")) || /^(plan|report|post|advert|ad|ads|carousel|story|reel|video|article|document|form)s?$/.test(w));
  }
  function tidyAsk(card, p) {
    card.querySelectorAll(".r4c-lead").forEach((lead) => {
      if (lead.closest(".r4c-done") || lead.dataset.r4pask) return;
      const b = lead.querySelector(":scope > b"); if (!b || !/^M7Alpha needs your (answer|go-ahead)\.?\s*$/i.test(b.textContent.trim())) return;
      b.remove(); lead.dataset.r4pask = "1"; lead.classList.add("r4p-askq");
      lead.textContent = lead.textContent.trim();
    });
    card.querySelectorAll(".r4c-from").forEach((f) => {
      if (f.dataset.r4pask) return; f.dataset.r4pask = "1";
      const lb = f.querySelector(":scope > b"); if (lb && /^From M7Alpha:?\s*$/i.test(lb.textContent.trim())) lb.remove();
      const note = f.textContent.trim();
      if (noteRepeats(note, p)) { f.hidden = true; return; }
      f.textContent = note; f.classList.add("r4p-asknote");
    });
  }
  function sync(card, kind, p) {
    shortTitles(card, kind);
    try { tidyAsk(card, p); } catch (e) {}
    if (kind === "end") return;
    if (kind === "post") { stageSize(card, kind, p); dots(card, p); }
    if (kind === "pick") { stageSize(card, kind, p); syncPick(card, p); }
    if (kind === "doc") syncDoc(card);
    // the sheet's copy of "This slide (2) / Whole post"
    const real = card.querySelector(".r4c-seg:not(.r4p-mseg):not(.r4p-optseg)"), mir = card.querySelector(".r4p-mseg");
    if (real && mir) { const rb = real.querySelectorAll(".r4c-segb"); mir.querySelectorAll(".r4c-segb").forEach((b, i) => { if (!rb[i]) return; txt(b, rb[i].textContent); attr(b, "aria-pressed", rb[i].getAttribute("aria-pressed")); }); }
    syncField(card, kind);
  }

  // ---------- the answered piece: a sheet from the bottom ----------
  function doSide(aside) {
    const head = aside.querySelector(":scope > .r4c-head"), sbody = aside.querySelector(":scope > .r4c-sbody");
    if (!head || !sbody) return;
    { const t = head.querySelector(".r4c-title"); if (t) txt(t, shortT(t.textContent)); }          // short title, as P10
    if (head.__r4p) return;
    head.__r4p = true;
    const grab = E("div", { class: "r4p-grab", "aria-hidden": "true" });
    aside.prepend(grab);
    const act = sbody.querySelector(".r4c-activity"), ta = act && act.querySelector(":scope > textarea.r4c-ta");
    if (ta) {
      const sendrow = act.querySelector(":scope > .r4c-sendrow"), status = act.querySelector(":scope > .r4c-status");
      const foot = E("div", { class: "r4p-foot" }, status || "", ta, sendrow || "");
      aside.append(foot);
      ta.rows = 1;
      ta.placeholder = "Spotted something? Tell us here.";          // one line at 16 px (the box under the activity says the rest)
      const typing = () => foot.classList.toggle("typing", !!ta.value.trim() || document.activeElement === ta);
      ta.addEventListener("input", typing); ta.addEventListener("focus", typing); ta.addEventListener("blur", () => setTimeout(typing, 150));
      typing();
    }
    const msg = act && act.querySelector(".r4c-msg");
    if (msg) { let on = false; try { on = typeof r3MsgOn === "function" && r3MsgOn(); } catch (e) {} hide(msg, !on); }
    dragDown(aside, [grab, head]);
    guard(aside);
  }
  function dragDown(aside, els) {
    let y0 = null, dy = 0;
    const start = (e) => { if (e.touches.length !== 1) return; y0 = e.touches[0].clientY; dy = 0; aside.style.transition = "none"; };
    const move = (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); aside.style.transform = dy ? `translateY(${Math.round(dy)}px)` : ""; if (dy > 6 && e.cancelable) e.preventDefault(); };
    const end = () => {
      if (y0 == null) return; y0 = null; aside.style.transition = "";
      if (dy > 90) { aside.style.transform = "translateY(105%)"; setTimeout(() => { try { R4C.close(); } catch (e) {} }, 170); }
      else aside.style.transform = "";
    };
    els.forEach((el) => { el.addEventListener("touchstart", start, { passive: true }); el.addEventListener("touchmove", move, { passive: false }); el.addEventListener("touchend", end); el.addEventListener("touchcancel", end); });
  }

  // a phone turned past 900 px (or back) with a card open: R4C draws it again for the new width
  try { MQ.addEventListener("change", () => { const s = st(); if (!s || !s.root || !s.id || !document.body.classList.contains("r4")) return; const id = s.id, row = s.run && s.run.key; try { R4C.close({ quiet: true }); } catch (e) {} setTimeout(() => { try { R4C.open(id, { rowKey: row, fromAddress: true }); } catch (e) {} }, 0); }); } catch (e) {}

  // Back (the phone's Back gesture or button) with the comment sheet open: the browser has already taken the piece's own
  // history step away, so the sheet closes (the words stay in the box, as with a tap outside) and that step is put back,
  // with the piece that shows now. Called first by r4p_shell.js's Back listener; true = handled. Final pass, 26 Nov 2026.
  function backFirst() {
    const card = cardEl; if (!card || !phone() || !card.isConnected) return false;
    const sh = card.querySelector(":scope > .r4p-sheet"); if (!sh || sh.hidden) return false;
    const b = card.__r4pBack || { href: location.href, state: history.state }, s = st();
    closeSheet(card, false);
    try {
      const u = new URL(b.href); if (s && s.id) u.searchParams.set("open", s.id);
      const state = Object.assign({}, b.state || {}); if (state.r4c && s && s.id) state.r4c = s.id;
      history.pushState(state, "", u);
    } catch (e) {}
    return true;
  }
  window.R4PC = { phone, backFirst, openSheet: (mode) => openSheet(cardEl, mode), closeSheet: (cancel) => closeSheet(cardEl, cancel), zoom: () => { const w = cardEl && cardEl.querySelector(".r4c-docwrap"); return w && w.__r4pz; } };
})();
