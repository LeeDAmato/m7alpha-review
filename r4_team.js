/* [PART R4-team, 26 Nov 2026] The grown tile on our team's All work page (Lee, 26 Nov 2026: tiles get hover cards with
   quick buttons, for clients AND our team; this file is the team's half; the clients' Content page is the main
   session's, r4_pages.js hvOpen). Second look, the same day, matching the clients' version (Lee's decisions):
   - The grown tile is the PICTURE ALONE: no panel, no title or date, no border or padding round it. A post grows 100%
     (twice the size), an article 50%, and an article carries its title and first line ON the picture (bottom left,
     over a dark shade). The coloured status strip goes while it is grown; the tile underneath keeps it.
   - The buttons float UNDER the picture with nothing behind them, left aligned, one row where they fit: the team actions
     that apply (the page's own WACT list and words; the main one in the page's teal), then Comment, Open, More.
   - Comment and the Drop question show under the picture too, and the card stays while they are in use.
   Only when our team is signed in (TEAM.on && !TEAM.client), on a laptop (>= 901 px) with a mouse ("(hover: hover)
   and (pointer: fine)"), on All work, and not while "Select several" is on. Phones, clients, our Client view: untouched.
   Resting on a tile 0.25 s grows it; moving onto a neighbour swaps in 0.06 s; leaving shrinks it back; Escape or a click
   outside closes it. Reduced motion: no animation. Every save goes through the page's own functions (workRun,
   openWork, workMenu), so it is exactly what the "⋯" menu saves. The page's drawWork, openWork, workRun (Drop only,
   while this card is open on that piece) and workComment (this card's piece only) are wrapped, never edited. */
(function () {
  "use strict";
  if (window.R4T) return;
  const Q = (q) => { try { return matchMedia(q); } catch (e) { return { matches: false }; } };
  const MOUSE = Q("(hover: hover) and (pointer: fine)"), WIDEQ = Q("(min-width: 901px)"), CALM = Q("(prefers-reduced-motion: reduce)");
  const OPEN_MS = 250, SWAP_MS = 60, LEAVE_MS = 90, GROW_MS = 190, SHRINK_MS = 150, GROW = 2, GROW_ART = 1.5, M = 10;
  let card = null;        // { el, inner, box, bar, tile, i, id, mode: "buttons" | "comment" | "ask", acting, moved, at, w, pos }
  let pend = null;        // { tile, t }: a card waiting to grow
  let closeT = 0, quietUntil = 0, last = null, hadMenu = false;
  const caps = new Map(), capsDone = new Map();       // piece id -> the article's first line (Promise / text once read)

  // ---------- when the cards may show ----------
  function allowed() {
    try {
      // [26 Nov, evening] Release 4's team Content (r4_tv.js) counts as All work however it was reached: live, Content
      // opened from the address or the menu kept the remembered tab ("review"), so the tiles never grew
      const onContent = S.tab === "work" || !!(window.R4TV && R4TV.on() && window.R4 && R4.page === "content" && document.querySelector("#work.r4tv-content"));
      return !!(TEAM.on && !TEAM.client && WIDEQ.matches && MOUSE.matches && !W.picking && onContent
        && document.getElementById("work") && !document.getElementById("wover")
        && !(typeof EMBED !== "undefined" && EMBED) && !(typeof INLIB !== "undefined" && INLIB));
    } catch (e) { return false; }
  }
  const modalOpen = () => { const m = document.getElementById("modal"); return !!(m && !m.hidden && m.childElementCount); };
  // the comment box, the Drop question, the "⋯" menu, the page's own box or a save in progress keep the card where it is
  const held = () => !!(modalOpen() || document.getElementById("wmenu") || (card && (card.acting || card.mode !== "buttons")));
  function pieceOf(tile) {
    const id = tile && !tile.classList.contains("wdoc") && tile.dataset.id; if (!id) return null;
    try { return W.items.find((x) => x.id === id) || W.dropped.find((x) => x.id === id) || null; } catch (e) { return null; }
  }
  const tileAt = (t) => (t && t.closest ? t.closest("#work .wt[data-id]:not(.wdoc)") : null);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const cname = () => { try { return S.data?.client?.name || "the client"; } catch (e) { return "the client"; } };
  const nb = (s) => String(s || "").replace(/ (\S+)$/, " $1");      // the last two words together: no word alone on a line

  // ---------- an article's first line ----------
  function firstLine(cap, title) {
    const t = String(title || "").trim().toLowerCase();
    for (const raw of String(cap || "").replace(/\r/g, "").split(/\n\s*\n/)) {
      if (/^\s*#/.test(raw)) continue;                          // a heading (the article's own title)
      const s = raw.replace(/\[pic:[^\]]*\]/g, "").replace(/<[^>]+>/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`>#]+/g, "").replace(/\s+/g, " ").trim();
      if (s && s.toLowerCase() !== t) return s.length > 300 ? s.slice(0, 300) : s;
    }
    return "";
  }
  function capOf(i) {
    if (!caps.has(i.id)) caps.set(i.id, (async () => {
      let s = "";
      try { const r = await TEAM.sb.from("items").select("caption").eq("id", i.id).maybeSingle(); s = firstLine(r.data && r.data.caption, i.title); }
      catch (e) {}
      capsDone.set(i.id, s); return s;
    })());
    return caps.get(i.id);
  }

  // ---------- drawing ----------
  function build(tile, i) {
    const thumb = tile.querySelector(".thumb"); if (!thumb) return null;
    const art = thumb.classList.contains("wart");
    const root = el("div", "work r4tg"); root.id = "r4tg"; root.dataset.id = i.id;
    root.setAttribute("role", "group"); root.setAttribute("aria-label", "Quick actions for " + i.title);
    const inner = el("div", tile.className.replace(/\bon\b/g, "") + " r4tg-in" + (art ? " r4tg-art" : ""));
    const box = el("div", "r4tg-box");
    const pic = el("button", "r4tg-pic"); pic.type = "button"; pic.setAttribute("aria-label", "Open " + i.title);
    pic.addEventListener("click", (e) => { e.stopPropagation(); act("open"); });
    let text = null;
    if (!art) {
      const copy = thumb.cloneNode(true); copy.classList.add("r4tg-thumb");
      copy.querySelectorAll("img").forEach((im) => { im.loading = "eager"; });
      pic.append(copy); box.append(pic);
    } else {
      // an article: its picture fills the box; its title and first line sit on it, bottom left, over a dark shade
      const im = thumb.querySelector("img");
      if (im) { const a = el("img", "r4tg-aimg"); a.src = im.currentSrc || im.src; a.alt = ""; a.decoding = "async"; pic.append(a); }
      else pic.classList.add("r4tg-noimg");
      const head = el("div", "r4tg-head");
      head.append(el("b", "", nb(i.title)));
      const s = capsDone.get(i.id) || "";
      text = el("span", "", nb(s)); text.hidden = !s; head.append(text);
      box.append(pic, el("span", "r4tg-shade"), head);
    }
    const bar = el("div", "r4tg-bar");
    inner.append(box, bar); root.append(inner);
    // right-click on the grown picture opens the same "⋯" menu the tile's right-click opens
    root.addEventListener("contextmenu", (e) => { e.preventDefault(); if (card && card.el === root && !card.acting && card.mode === "buttons") workMenu(card.i, card.more || root); });
    const c = { el: root, inner, box, bar, tile, i, id: i.id, art, text, mode: "buttons", acting: false, more: null, moved: false, at: last ? last.slice() : null };
    buttons(c);
    return c;
  }
  // the buttons: the team actions that apply (the "⋯" menu's own list and words), then Comment, Open, More
  function buttonsFor(i) {
    if (i.dropped_at) return [["back", "Put back", "main"], ["open", "Open", ""]];
    const out = [];
    if (WACT.move.can(i)) out.push(["move", WACT.move.say, "main"]);
    if (WACT.skip.can(i)) out.push(["skip", WACT.skip.say, out.length ? "" : "main"]);
    if (WACT.ok.can(i)) out.push(["ok", WACT.ok.say, "main"]);
    if (WACT.pull.can(i)) out.push(["pull", WACT.pull.say, ""]);
    if (WACT.comment.can(i)) out.push(["comment", "Comment", ""]);
    out.push(["open", "Open", ""], ["more", "More", ""]);
    return out;
  }
  function btn(c, kind, label, cls, fn) {
    const b = el("button", "r4tg-b" + (cls ? " " + cls : ""), label); b.type = "button"; b.dataset.act = kind;
    b.addEventListener("click", (e) => { e.stopPropagation(); (fn || ((ev) => act(kind, b, ev)))(e); });
    if (kind === "more") { c.more = b; b.setAttribute("aria-haspopup", "menu"); b.setAttribute("aria-label", "More actions for " + c.i.title); }
    return b;
  }
  function fill(c, mode, ...kids) {
    c.mode = mode;
    c.bar.replaceChildren(...kids.filter(Boolean));
    if (c.more && !c.bar.contains(c.more)) c.more = null;      // More is only kept while it is in the bar
    if (c.w) place(c, true);          // the bar changed height: the picture stays put, the rest stays on screen
  }
  function buttons(c) {
    c.more = null;
    const row = el("div", "r4tg-acts");
    for (const [k, label, cls] of buttonsFor(c.i)) row.append(btn(c, k, label, cls));
    fill(c, "buttons", row);
  }
  // Comment, under the picture: the same save as the page's comment box (workRun "comment" with the words)
  function askComment(c) {
    const ta = el("textarea", "r4tg-ta"); ta.rows = 3; ta.placeholder = "What should change?"; ta.setAttribute("aria-label", "Your comment on " + c.i.title);
    const send = btn(c, "send", "Send the comment", "main", async () => {
      const t = ta.value.trim(); if (!t) { ta.focus(); return; }
      await save(c, "comment", { comment: t.slice(0, 5000) });
    });
    const cancel = btn(c, "cancel", "Cancel", "", () => buttons(c));
    const row = el("div", "r4tg-acts"); row.append(send, cancel);
    fill(c, "comment", ta, row);
    ta.focus({ preventScroll: true });
  }
  // the Drop question, under the picture, in the page's own words; "Drop" then saves exactly as the page does
  function askDrop(c, opt) {
    const i = c.i, who = cname();
    const q = el("div", "r4tg-ask"); q.setAttribute("role", "alertdialog"); q.setAttribute("aria-label", "Drop " + i.title);
    q.append(el("b", "", opt.keep ? `Drop “${i.title}” as a duplicate of “${opt.keep.title}”?` : `Drop “${i.title}”?`));
    q.append(el("span", "", nb(opt.keep ? `It leaves All work, the cards and ${who}'s page. Nothing is deleted, and you can put it back.`
      : `It leaves All work, the cards and ${who}'s page, and the session is asked to archive the frames in Figma. Nothing is deleted, and you can put it back.`)));
    if (i.stage === "needs_client") q.append(el("span", "r4tg-warn", nb(`It is with ${who} right now, waiting for their answer. Dropping takes it off their page.`)));
    const row = el("div", "r4tg-acts");
    row.append(btn(c, "drop-yes", opt.keep ? "Drop as a duplicate" : "Drop", "danger", (e) => { if (e.detail > 0 && !c.moved) return; save(c, "drop", opt, true); }),
      btn(c, "drop-no", "Cancel", "", () => buttons(c)));
    fill(c, "ask", q, row);
    c.moved = false; c.at = last ? last.slice() : null;      // the question appeared under the pointer: "Drop" needs a deliberate move
  }
  // ---------- where it goes ----------
  // The grown picture sits on the tile's picture, buttons underneath. A tile low on the screen gets its buttons ABOVE
  // the picture, so the picture stays under the pointer and no button lands under a pointer resting on the tile.
  function bounds() {
    const vw = document.documentElement.clientWidth, vh = innerHeight;
    let l = M, t = M;
    const side = document.getElementById("sidenav");
    // [PART R4-tv, 26 Nov] Release 4's menu for our view is not fixed and sits 12 px in from the edge, inside the page's frame
    if (side && getComputedStyle(side).display !== "none" && (getComputedStyle(side).position === "fixed" || document.body.classList.contains("r4"))) { const r = side.getBoundingClientRect(); if (r.right > 0 && r.left < 40) l = Math.max(l, r.right + M); }
    for (const q of ["#teambar", "header.top"]) {
      const e = document.querySelector(q); if (!e) continue;
      const cs = getComputedStyle(e); if (cs.display === "none" || !/fixed|sticky/.test(cs.position)) continue;
      const r = e.getBoundingClientRect(); if (r.height && r.top <= 1 && r.bottom > 0) t = Math.max(t, r.bottom + M);
    }
    return { l, t, r: vw - M, b: vh - M };
  }
  // the tile's picture where it rests: the tile lifts 2 px under the pointer (.card:hover), and then the lifted card is
  // the picture's offset parent, so the layout offsets are added up to the tile (the lift does not move them)
  function thumbRect(tile) {
    const tr = tile.getBoundingClientRect(), tp = tile.querySelector(".thumb"), pr = (tp || tile).getBoundingClientRect();
    let y = 0;
    for (let e = tp; e && e !== tile; ) {
      const op = e.offsetParent; y += e.offsetTop;
      if (!op || (op !== tile && !tile.contains(op))) { y = null; break; }
      if (op !== tile) y += op.clientTop;
      e = op;
    }
    return { left: pr.left, width: pr.width, height: pr.height, top: tp && y != null ? tr.top + y : pr.top };
  }
  function place(c, keepPic) {
    const th = thumbRect(c.tile), B = bounds();
    let w = c.w || Math.round(th.width * (c.art ? GROW_ART : GROW));
    if (!c.w) {
      w = Math.max(Math.min(w, B.r - B.l), Math.min(th.width, B.r - B.l));
      c.box.style.aspectRatio = th.width.toFixed(2) + " / " + th.height.toFixed(2);
    }
    c.el.style.width = w + "px";
    let H = c.inner.offsetHeight;
    // too tall for the screen: the picture gives way, never smaller than the tile's own
    if (!c.w && H > B.b - B.t) {
      const per = c.box.offsetHeight / w, over = H - (B.b - B.t);
      w = Math.max(Math.round(th.width), Math.round(w - over / Math.max(per, .5)));
      c.el.style.width = w + "px"; H = c.inner.offsetHeight;
    }
    const P = c.box.offsetHeight, barH = H - P;
    const cy = keepPic && c.pos ? c.pos.top + c.pos.off + P / 2 : th.top + th.height / 2;
    // buttons below or above: whichever moves the picture least from where it should be (below when both fit). Off the
    // bottom of the screen that is "above", so the picture stays under a resting pointer and no button lands there
    const goal = cy - P / 2;
    const way = (upw) => { const t = Math.max(B.t, Math.min(goal - (upw ? barH : 0), B.b - H)); return { t, up: upw, d: Math.abs(t + (upw ? barH : 0) - goal) }; };
    const dn = way(false), ab = way(true), pick = ab.d < dn.d - .5 ? ab : dn;
    const top = pick.t, up = pick.up;
    let left = keepPic && c.pos ? c.pos.left : th.left + th.width / 2 - w / 2;
    left = Math.max(B.l, Math.min(left, B.r - w));
    c.inner.classList.toggle("r4tg-up", up);
    const nowH = c.inner.offsetHeight, off = up ? nowH - P : 0;
    c.el.style.left = Math.round(left) + "px"; c.el.style.top = Math.round(top) + "px";
    c.w = w; c.pos = { left: Math.round(left), top: Math.round(top), off, up };
    return th;
  }
  // the transform that lays the grown picture exactly over the tile's picture (the start of growing, the end of shrinking)
  const toTile = (c, th) => { const s = th.width / c.w; return `translate(${th.left - c.pos.left}px, ${th.top - c.pos.top - c.pos.off * s}px) scale(${s})`; };
  function open(tile) {
    pend = null;
    if (!tile.isConnected || !allowed() || held()) return;
    try { if (W.busy) return; } catch (e) { return; }
    if (last) { const at = document.elementFromPoint(last[0], last[1]); if (!at || tileAt(at) !== tile) return; }      // still under the pointer?
    const i = pieceOf(tile); if (!i) return;
    if (card) { if (card.tile === tile) return; shut(card, "back"); }
    const c = build(tile, i); if (!c) return;
    card = c; clearTimeout(closeT);
    document.body.append(c.el);
    const th = place(c);
    if (c.art && c.text.hidden) capOf(i).then((s) => {
      if (card !== c || !s) return;
      c.text.textContent = nb(s); c.text.hidden = false;
    });
    if (CALM.matches || !c.inner.animate) return;
    c.inner.animate([{ transform: toTile(c, th) }, { transform: "none" }], { duration: GROW_MS, easing: "cubic-bezier(.2,.75,.25,1)" });
    c.bar.animate([{ opacity: 0, transform: `translateY(${c.pos.up ? 6 : -6}px)` }, { opacity: 1, transform: "none" }], { duration: 170, delay: 70, easing: "ease-out", fill: "backwards" });
  }
  // how: "back" shrinks onto its tile, "fade" fades where it is, "now" goes at once
  function shut(c, how) {
    if (!c) return;
    if (card === c) card = null;
    clearTimeout(closeT);
    c.el.style.pointerEvents = "none"; c.el.removeAttribute("id"); c.el.classList.add("r4tg-going");
    const gone = () => { c.el.remove(); };
    if (how === "now" || CALM.matches || !c.inner.animate || !c.pos) return gone();
    const th = how === "back" && c.tile.isConnected ? thumbRect(c.tile) : null;
    const run = [c.bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 80, easing: "ease-in", fill: "forwards" })];
    if (th && th.width) run.push(c.inner.animate([{ transform: "none" }, { transform: toTile(c, th) }], { duration: SHRINK_MS, easing: "cubic-bezier(.4,0,.7,1)", fill: "forwards" }));
    else run.push(c.inner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-in", fill: "forwards" }));
    Promise.all(run.map((a) => a.finished)).then(gone, gone);
    setTimeout(gone, 600);
  }
  function cancelOpen() { if (pend) { clearTimeout(pend.t); pend = null; } }
  function want(tile, ms) {
    if (pend && pend.tile === tile) return;
    cancelOpen();
    const i = pieceOf(tile); if (!i) return;
    if (tile.querySelector(".thumb.wart")) capOf(i);          // start reading the article's text while the pointer rests
    pend = { tile, t: setTimeout(() => open(tile), ms) };
  }
  function later(ms) { clearTimeout(closeT); closeT = setTimeout(() => { if (card && !held()) shut(card, "back"); }, ms); }

  // ---------- the buttons ----------
  // A dropped piece is left out of what the piece's window reads (get_review, part 19), so its window would say
  // "Nothing here is waiting for you". Open shows its picture in the page's own full-screen view instead.
  function openDropped(i) {
    const m = (i.media || []).find((x) => x.type === "image") || (i.media || []).find((x) => x.poster) || null;
    const path = m ? (m.type === "image" ? m.path : m.poster) : i.thumb;
    shut(card, "now");
    if (!path) { showToast("This dropped piece has no picture to show. Put it back to open its card."); hideToastLater(5000); return; }
    openZoom(mediaUrl(path), i.title);
  }
  async function save(c, kind, opt, confirmed) {
    if (!c || c.acting) return;
    try { if (W.busy) return; } catch (x) { return; }
    c.acting = true; c.el.classList.add("r4tg-busy");
    c.el.querySelectorAll("button, textarea").forEach((x) => { x.disabled = true; });
    try { await (confirmed ? runConfirmed(kind, [c.i], opt || {}) : workRun(kind, [c.i], opt || {})); } catch (e) {}
    // saved: the page's redraw has closed the card already. Not saved: the card stays as it was, controls back on
    if (card === c) { c.acting = false; c.el.classList.remove("r4tg-busy"); c.el.querySelectorAll("button, textarea").forEach((x) => { x.disabled = false; }); }
  }
  function act(kind, b, e) {
    const c = card; if (!c || c.acting) return;
    const i = c.i;
    if (kind === "open") { if (i.dropped_at) openDropped(i); else openWork(i); return; }
    if (c.mode !== "buttons") return;                                                                  // the picture still opens; the rest waits
    if (kind === "more") { if (hadMenu) { hadMenu = false; return; } workMenu(i, b || c.el); return; }      // a second press closes it
    if (kind === "comment") { askComment(c); return; }
    // a save needs the mouse to have moved since the card appeared: a click aimed at the tile underneath never saves
    if (e && e.detail > 0 && !c.moved) return;
    save(c, kind);
  }

  // ---------- the pointer, keys and page ----------
  function onMove(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    last = [e.clientX, e.clientY];
    if (!allowed()) { cancelOpen(); if (card && !held()) shut(card, "fade"); return; }
    const t = e.target;
    if (card && card.el.contains(t)) {
      clearTimeout(closeT); cancelOpen();
      if (!card.moved && (!card.at || Math.hypot(e.clientX - card.at[0], e.clientY - card.at[1]) > 3)) card.moved = true;
      return;
    }
    if (held()) { cancelOpen(); return; }
    if (Date.now() < quietUntil) return;
    const tile = tileAt(t);
    if (tile && pieceOf(tile)) {
      if (card && card.tile === tile) { clearTimeout(closeT); cancelOpen(); return; }
      want(tile, card ? SWAP_MS : OPEN_MS);
      return;
    }
    cancelOpen();
    if (card) later(LEAVE_MS);
  }
  let swallow = false;
  function onDown(e) {
    if (!card) { if (e.button === 0) cancelOpen(); return; }
    const t = e.target;
    if (card.el.contains(t)) { hadMenu = !!(card.more && card.more.contains(t) && document.getElementById("wmenu")); return; }
    if (t.closest && t.closest("#wmenu, #modal, #toast, .zoom")) return;
    // the comment box or the Drop question is open: a click outside does nothing (a tile under it must not open and
    // lose the words); Escape or Cancel close them
    if (card.mode !== "buttons" && !card.acting) {
      e.preventDefault(); e.stopPropagation(); swallow = true;
      const ta = card.bar.querySelector("textarea"); if (ta) ta.focus({ preventScroll: true });
      return;
    }
    if (held()) return;
    shut(card, "fade");
  }
  const eat = (e) => { if (!swallow) return; e.preventDefault(); e.stopPropagation(); if (e.type === "click" || e.type === "contextmenu") swallow = false; };
  function onKey(e) {
    if (e.key !== "Escape") return;
    cancelOpen();
    if (!card || card.acting || modalOpen() || document.getElementById("wmenu")) return;
    if (card.mode !== "buttons") { e.stopPropagation(); buttons(card); return; }      // Escape leaves the comment box or the question first
    shut(card, "back");
  }
  function onScroll() {
    cancelOpen(); quietUntil = Date.now() + 180;
    if (card && !held()) shut(card, "fade");
  }
  document.addEventListener("pointermove", onMove, { capture: true, passive: true });
  // on the window and set up now, so it runs before the "⋯" menu's own outside-click listener (added when it opens)
  addEventListener("pointerdown", onDown, true);
  for (const ev of ["mousedown", "mouseup", "click", "contextmenu"]) addEventListener(ev, eat, true);
  addEventListener("pointerup", () => { if (swallow) setTimeout(() => { swallow = false; }, 0); }, true);      // no click followed (a drag)
  addEventListener("keydown", onKey, true);
  addEventListener("scroll", onScroll, { capture: true, passive: true });
  addEventListener("resize", () => { cancelOpen(); if (card && !held()) shut(card, "now"); });
  document.addEventListener("mouseout", (e) => { if (e.relatedTarget) return; cancelOpen(); if (card && !held()) later(LEAVE_MS); });      // the pointer left the window

  // ---------- the page's own functions, wrapped (never edited) ----------
  // a redraw (after a save, a filter, "Show our checks") replaces the tiles: the card goes, unless the page's own box is
  // open for it (Duplicate of…), in which case it follows its piece to the new tile
  function redrawn() {
    cancelOpen();
    if (!card) return;
    if ((modalOpen() || card.mode !== "buttons") && !card.acting) {
      const t = document.querySelector('#work .wt[data-id="' + card.id + '"]'), i = t && pieceOf(t);
      if (t && i) { card.tile = t; card.i = i; return; }
    }
    shut(card, "fade");
  }
  let baseRun = null;
  // the page's Drop asks twice with the browser's own box; here the card asked already, so those two say yes
  function runConfirmed(kind, pieces, opt) {
    const c0 = window.confirm; window.confirm = () => true;
    try { return baseRun(kind, pieces, opt); } finally { window.confirm = c0; }      // the page asks before its first wait
  }
  try {
    if (typeof drawWork === "function") { const base = drawWork; drawWork = function () { const r = base.apply(this, arguments); try { redrawn(); } catch (e) {} return r; }; }
    if (typeof openWork === "function") { const base = openWork; openWork = function () { cancelOpen(); if (card) shut(card, "now"); return base.apply(this, arguments); }; }
    if (typeof workRun === "function") {
      baseRun = workRun;
      // Drop (from More, or from "Duplicate of…") on the piece this card shows: the question goes under the picture
      workRun = function (kind, pieces, opt) {
        if (kind === "drop" && card && !card.acting && pieces && pieces.length === 1 && pieces[0].id === card.id) { askDrop(card, opt || {}); return Promise.resolve(); }
        return baseRun.apply(this, arguments);
      };
    }
    if (typeof workComment === "function") {
      const base = workComment;
      // "Comment…" from the More menu on this card's piece: the box goes under the picture too
      workComment = function (i) { if (card && i && i.id === card.id && !card.acting) return askComment(card); return base.apply(this, arguments); };
    }
  } catch (e) {}
  window.R4T = { card: () => (card ? { id: card.id, mode: card.mode, acting: card.acting, up: !!(card.pos && card.pos.up), buttons: [...card.bar.querySelectorAll(".r4tg-b")].map((b) => b.textContent) } : null),
    close: () => { cancelOpen(); if (card) shut(card, "now"); }, allowed };
})();
