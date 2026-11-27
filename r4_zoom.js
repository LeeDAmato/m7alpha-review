/* [PART R4-zoom, 27 Nov 2026] Click a picture in an open card to see it full size (Lee, 27 Nov 2026: words drawn small
   inside a picture could not be read). Works in the client's card (r4_core.js) and our M7Alpha card (r4_tv.js), laptop
   and phone, without touching either: one click listener on the page picks up a click on the card's picture.
   - Not while pin mode is on (then a click places a pin), and never on a pin, a button or a video.
   - Opens fitted to the screen. Mouse wheel, pinch, + / − zoom (up to 4 times the picture's own size), drag moves it,
     double click switches between "fit" and "actual size", 0 = fit, 1 = actual size, Escape or × closes.
   - While it is open, keys and clicks stop here, so the card underneath doesn't close or change piece.
   window.R4ZOOM = { open(src, label), close(), isOpen() } */
(function () {
  "use strict";
  if (window.R4ZOOM) return;
  const PICS = ".r4c-fit img, .r4c-stage img";
  const Z = { el: null, img: null, s: 1, fit: 1, tx: 0, ty: 0, nw: 0, nh: 0, ptrs: new Map(), pinch: null, drag: null, pct: null };
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const ICON = {
    close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    minus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12M12 6v12"/></svg>',
  };
  const btn = (cls, label, html, fn) => { const b = mk("button", "r4z-b " + cls); b.type = "button"; b.title = label; b.setAttribute("aria-label", label); if (html) b.innerHTML = html; else b.textContent = label; b.addEventListener("click", (e) => { e.stopPropagation(); fn(); }); return b; };

  function view() { const r = Z.el.querySelector(".r4z-view").getBoundingClientRect(); return r; }
  function maxS() { return Math.max(4, Z.fit * 1.5); }
  function minS() { return Math.min(Z.fit, 1) * 0.5; }
  function clampPos() {
    const r = view(), w = Z.nw * Z.s, h = Z.nh * Z.s;
    Z.tx = w <= r.width ? (r.width - w) / 2 : Math.min(0, Math.max(r.width - w, Z.tx));
    Z.ty = h <= r.height ? (r.height - h) / 2 : Math.min(0, Math.max(r.height - h, Z.ty));
  }
  function draw() {
    clampPos();
    Z.img.style.transform = `translate(${Z.tx}px, ${Z.ty}px) scale(${Z.s})`;
    Z.pct.textContent = Math.round(Z.s * 100) + "%";
    Z.el.classList.toggle("r4z-big", Z.nw * Z.s > view().width + 1 || Z.nh * Z.s > view().height + 1);
  }
  // zoom to scale s keeping the point (cx, cy) of the screen still
  function zoomTo(s, cx, cy) {
    const r = view(); if (cx == null) { cx = r.width / 2; cy = r.height / 2; } else { cx -= r.left; cy -= r.top; }
    s = Math.max(minS(), Math.min(maxS(), s));
    const px = (cx - Z.tx) / Z.s, py = (cy - Z.ty) / Z.s;
    Z.s = s; Z.tx = cx - px * s; Z.ty = cy - py * s; draw();
  }
  function fitNow() { const r = view(); Z.fit = Math.min(r.width / Z.nw, r.height / Z.nh); Z.s = Z.fit; Z.tx = 0; Z.ty = 0; draw(); }
  function actual(cx, cy) { zoomTo(Z.fit >= 1 ? Math.min(maxS(), 2) : 1, cx, cy); }
  function toggle(cx, cy) { if (Math.abs(Z.s - Z.fit) < 0.01) actual(cx, cy); else fitNow(); }

  function open(src, label) {
    close();
    const box = mk("div", "r4z zoom"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Full size picture" + (label ? ": " + label : "")); box.tabIndex = -1;
    const bar = mk("div", "r4z-bar");
    const name = mk("span", "r4z-name", label || ""); name.title = label || "";
    Z.pct = mk("span", "r4z-pct", "");
    bar.append(name,
      btn("r4z-ic", "Zoom out", ICON.minus, () => zoomTo(Z.s / 1.4)), Z.pct, btn("r4z-ic", "Zoom in", ICON.plus, () => zoomTo(Z.s * 1.4)),
      btn("r4z-tx", "Fit", null, fitNow), btn("r4z-tx", "Actual size", null, () => zoomTo(1)),
      btn("r4z-ic r4z-x", "Close", ICON.close, close));
    const v = mk("div", "r4z-view");
    const img = mk("img"); img.alt = label || "Picture"; img.draggable = false; img.decoding = "async";
    const hint = mk("p", "r4z-hint", matchMedia("(pointer: coarse)").matches ? "Pinch to zoom · drag to move · double tap for actual size" : "Scroll to zoom · drag to move · double click for actual size · Esc to close");
    v.append(img); box.append(bar, v, hint);
    Z.el = box; Z.img = img;
    img.addEventListener("load", () => { Z.nw = img.naturalWidth || 1; Z.nh = img.naturalHeight || 1; img.style.width = Z.nw + "px"; img.style.height = Z.nh + "px"; fitNow(); box.classList.add("r4z-ready"); });
    img.src = src;
    // wheel: zoom around the pointer (a trackpad's two-finger scroll moves when zoomed in and Ctrl isn't held)
    v.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2 && Z.el.classList.contains("r4z-big")) { Z.tx -= e.deltaX; draw(); return; }
      zoomTo(Z.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX, e.clientY);
    }, { passive: false });
    v.addEventListener("dblclick", (e) => { e.preventDefault(); toggle(e.clientX, e.clientY); });
    v.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      v.setPointerCapture(e.pointerId); Z.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Z.ptrs.size === 2) { const [a, b] = [...Z.ptrs.values()]; Z.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: Z.s }; Z.drag = null; }
      else if (Z.ptrs.size === 1) Z.drag = { x: e.clientX, y: e.clientY, tx: Z.tx, ty: Z.ty, t: Date.now() };
      v.classList.add("r4z-down");
    });
    v.addEventListener("pointermove", (e) => {
      if (!Z.ptrs.has(e.pointerId)) return;
      Z.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Z.pinch && Z.ptrs.size >= 2) { const [a, b] = [...Z.ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomTo(Z.pinch.s * d / (Z.pinch.d || 1), (a.x + b.x) / 2, (a.y + b.y) / 2); }
      else if (Z.drag) { Z.tx = Z.drag.tx + e.clientX - Z.drag.x; Z.ty = Z.drag.ty + e.clientY - Z.drag.y; draw(); }
    });
    const up = (e) => {
      Z.ptrs.delete(e.pointerId);
      if (Z.ptrs.size < 2) Z.pinch = null;
      if (Z.ptrs.size === 1) { const [p] = [...Z.ptrs.values()]; Z.drag = { x: p.x, y: p.y, tx: Z.tx, ty: Z.ty }; }
      else if (!Z.ptrs.size) { Z.drag = null; v.classList.remove("r4z-down"); }
    };
    v.addEventListener("pointerup", up); v.addEventListener("pointercancel", up);
    // a tap or click on the dark space around the picture closes it, like the card's own dim
    v.addEventListener("click", (e) => { if (e.target === v && !Z.el.classList.contains("r4z-big") && Math.abs(Z.s - Z.fit) < 0.01) close(); });
    // nothing inside reaches the card underneath
    ["click", "pointerdown", "mousedown", "touchstart"].forEach((t) => box.addEventListener(t, (e) => e.stopPropagation()));
    document.body.append(box); box.focus({ preventScroll: true });
    addEventListener("resize", onResize);
  }
  function onResize() { if (!Z.el || !Z.nw) return; const was = Math.abs(Z.s - Z.fit) < 0.01; const r = view(); Z.fit = Math.min(r.width / Z.nw, r.height / Z.nh); if (was) fitNow(); else draw(); }
  function close() {
    if (!Z.el) return;
    Z.el.remove(); Z.el = null; Z.img = null; Z.ptrs.clear(); Z.pinch = Z.drag = null;
    removeEventListener("resize", onResize);
  }

  // keys: registered in the capture phase on window, so they run before the cards' own (which close the card on Escape
  // and change piece or slide on the arrows)
  addEventListener("keydown", (e) => {
    if (!Z.el) return;
    const k = e.key;
    if (k === "Escape") close();
    else if (k === "+" || k === "=") zoomTo(Z.s * 1.4);
    else if (k === "-" || k === "_") zoomTo(Z.s / 1.4);
    else if (k === "0") fitNow();
    else if (k === "1") zoomTo(1);
    else if (k === "ArrowLeft") { Z.tx += 80; draw(); }
    else if (k === "ArrowRight") { Z.tx -= 80; draw(); }
    else if (k === "ArrowUp") { Z.ty += 80; draw(); }
    else if (k === "ArrowDown") { Z.ty -= 80; draw(); }
    else if (k === "Tab") { /* stay in the viewer */ }
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);

  // the click on a card's picture
  function picOf(t) {
    if (!t || !t.closest) return null;
    if (t.closest(".r4pin-m, .r4pin-c, button, a, video, .r4z")) return null;
    const img = t.tagName === "IMG" ? t : null;
    if (!img || !img.matches(PICS)) return null;
    return img;
  }
  function labelFor(img) {
    const art = img.closest(".r4c-art") || img.closest("[class*='card']");
    const under = art && art.querySelector(".r4c-under");
    const title = (document.querySelector("#r4tv-title, .r4c-title") || {}).textContent || img.alt || "";
    const u = under ? under.textContent.replace(/^\s*\S+\s+\d+\s+of\s+\d+\s*·?\s*/i, "").trim() : "";
    return [title.trim(), u].filter(Boolean).join(" · ");
  }
  document.addEventListener("click", (e) => {
    if (Z.el || (window.R4PIN && R4PIN.on())) return;
    const img = picOf(e.target); if (!img || !img.complete || !img.naturalWidth) return;
    e.preventDefault(); e.stopPropagation();
    open(img.currentSrc || img.src, labelFor(img));
  }, true);
  // the cursor and a small "full size" mark tell people the picture opens
  const mark = () => document.querySelectorAll(PICS).forEach((i) => { if (!i.dataset.r4z && !i.closest(".r4z")) { i.dataset.r4z = "1"; i.title = i.title || "Click to see it full size"; } });
  new MutationObserver(mark).observe(document.documentElement, { childList: true, subtree: true });

  window.R4ZOOM = { open, close, isOpen: () => !!Z.el };
})();
