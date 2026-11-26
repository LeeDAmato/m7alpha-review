/* [PART R4-pin, 26 Nov 2026] Pin a comment on the artwork, Figma style, inside Release 4's card (client card r4_core.js and
   our team card r4_tv.js). Lee: "cant one just pin comment on the artwork without having to refresh window or load a new
   one? … i want it to work like figma makes it work". No second window, no reload.
   The pins are Release 3's own: a note whose marks are { strokes: [], pins: [{ x, y, text }] } (x and y are fractions of
   the picture, 0 to 1), saved for the slide shown (its media id as the variant). The callers save them with the same
   submit_feedback call Release 3's Pin tool makes; this file only draws and asks.
   window.R4PIN = {
     attach(box, { pins, onPost(x, y, text) -> Promise<bool>, hint })  markers on box (the element the picture fills) and,
                                       while pin mode is on, a click layer; pins: [{ x, y, text, who, when }] numbered in order
     on() / set(bool) / toggle()       pin mode (the cursor becomes a pin); Escape leaves it
     highlight(n)                      lights marker n and opens its comment
   } */
(function () {
  "use strict";
  if (window.R4PIN) return;
  const P = { on: false, boxes: new Set(), composer: null };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const when = (iso) => { try { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
  function set(v) {
    P.on = !!v; document.body.classList.toggle("r4pin-on", P.on);
    if (!P.on) closeComposer();
    document.querySelectorAll("[data-r4pin-toggle]").forEach((b) => { b.setAttribute("aria-pressed", String(P.on)); const l = b.querySelector(".r4pin-tl"); if (l) l.textContent = P.on ? "Done pinning" : (b.dataset.r4pinLabel || "Pin a comment"); });
    document.querySelectorAll(".r4pin-hint").forEach((h) => { h.hidden = !P.on; });
  }
  function closeComposer() { if (P.composer) { P.composer.remove(); P.composer = null; } }
  function closeBubbles(except) { document.querySelectorAll(".r4pin-m.open").forEach((m) => { if (m !== except) { m.classList.remove("open"); m.querySelector(".r4pin-b")?.remove(); } }); }
  function bubble(m, p) {
    if (m.querySelector(".r4pin-b")) return;
    const b = el("div", "r4pin-b"); b.setAttribute("role", "tooltip");
    b.append(el("b", "", p.text || "(no words)"), el("span", "", [p.who, when(p.when)].filter(Boolean).join(" · ")));
    if (p.x > .62) b.classList.add("left");
    if (p.y > .7) b.classList.add("up");
    m.append(b);
  }
  function attach(box, o) {
    if (!box) return;
    o = o || {};
    box.classList.add("r4pin-box");
    box.querySelectorAll(":scope > .r4pin-layer, :scope > .r4pin-m").forEach((x) => x.remove());
    (o.pins || []).forEach((p, k) => {
      const num = k + 1 + (o.start || 0);
      const m = el("button", "r4pin-m"); m.type = "button"; m.dataset.n = String(num);
      m.style.left = (p.x * 100).toFixed(3) + "%"; m.style.top = (p.y * 100).toFixed(3) + "%";
      m.setAttribute("aria-label", `Pin ${num}: ${p.text || "no words"}${p.who ? ", " + p.who : ""}`);
      m.append(el("span", "r4pin-n", String(num)));
      m.addEventListener("mouseenter", () => bubble(m, p));
      m.addEventListener("mouseleave", () => { if (!m.classList.contains("open")) m.querySelector(".r4pin-b")?.remove(); });
      m.addEventListener("click", (e) => { e.stopPropagation(); const was = m.classList.contains("open"); closeBubbles(m); m.classList.toggle("open", !was); if (!was) bubble(m, p); else m.querySelector(".r4pin-b")?.remove(); });
      box.append(m);
    });
    if (!o.onPost) return;
    const layer = el("div", "r4pin-layer"); layer.setAttribute("aria-hidden", "true");
    layer.addEventListener("click", (e) => {
      if (!P.on) return;
      e.preventDefault(); e.stopPropagation();
      const r = box.getBoundingClientRect(); if (!r.width || !r.height) return;
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      compose(box, x, y, o);
    });
    box.append(layer);
    P.boxes.add(box);
  }
  function compose(box, x, y, o) {
    closeComposer(); closeBubbles();
    const c = el("div", "r4pin-c"); c.style.left = (x * 100).toFixed(3) + "%"; c.style.top = (y * 100).toFixed(3) + "%";
    if (x > .55) c.classList.add("left"); if (y > .6) c.classList.add("up");
    c.setAttribute("role", "dialog"); c.setAttribute("aria-label", "Your comment on this spot");
    const dot = el("span", "r4pin-m r4pin-new"); dot.append(el("span", "r4pin-n", "+"));
    const card = el("div", "r4pin-cc");
    const ta = el("textarea", "r4pin-ta"); ta.rows = 2; ta.maxLength = 2000; ta.placeholder = o.placeholder || "Write your comment"; ta.setAttribute("aria-label", "Your comment on this spot");
    const msg = el("p", "r4pin-msg");
    const post = el("button", "r4pin-post", "Post"); post.type = "button";
    const cancel = el("button", "r4pin-cancel", "Cancel"); cancel.type = "button";
    const row = el("div", "r4pin-row"); row.append(cancel, post);
    card.append(ta, msg, row); c.append(dot, card);
    const send = async () => {
      const t = ta.value.trim(); if (!t) { ta.focus(); return; }
      post.disabled = cancel.disabled = ta.disabled = true; msg.textContent = "Saving…";
      let ok = false; try { ok = await o.onPost(+x.toFixed(4), +y.toFixed(4), t.slice(0, 2000)); } catch (e) { ok = false; }
      if (ok === false) { post.disabled = cancel.disabled = ta.disabled = false; msg.textContent = "That didn't save. Please try again."; ta.focus(); return; }
      if (P.composer === c) closeComposer();
    };
    post.addEventListener("click", (e) => { e.stopPropagation(); send(); });
    cancel.addEventListener("click", (e) => { e.stopPropagation(); closeComposer(); });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); send(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeComposer(); }
      e.stopPropagation();
    });
    c.addEventListener("click", (e) => e.stopPropagation());
    box.append(c); P.composer = c;
    setTimeout(() => ta.focus({ preventScroll: true }), 20);
  }
  function highlight(n) {
    const m = [...document.querySelectorAll(".r4pin-m[data-n]")].find((x) => x.dataset.n === String(n)); if (!m) return;
    closeBubbles(m); m.classList.add("open", "flash"); m.querySelector(".r4pin-b") || m.dispatchEvent(new Event("mouseenter"));
    setTimeout(() => m.classList.remove("flash"), 1200);
  }
  // C turns pin mode on or off while a card with a picture is open; Escape leaves it (after closing an open comment box)
  addEventListener("keydown", (e) => {
    const t = e.target; if (t && t.closest && t.closest("textarea, input, select, [contenteditable]")) return;
    if (e.key === "Escape" && P.on) { e.preventDefault(); e.stopImmediatePropagation(); if (P.composer) closeComposer(); else set(false); return; }      // the card's own Escape (close) must not run too
    if ((e.key === "c" || e.key === "C") && !e.ctrlKey && !e.metaKey && !e.altKey && document.querySelector("#r4tvc .r4pin-layer, .r4c-root .r4pin-layer")) { e.preventDefault(); set(!P.on); }
  }, true);
  document.addEventListener("click", (e) => { if (!e.target.closest || !e.target.closest(".r4pin-m")) closeBubbles(); }, true);
  // the card closed: pin mode ends
  new MutationObserver(() => { if (P.on && !document.querySelector("#r4tvc, .r4c-root")) set(false); }).observe(document.body, { childList: true });
  window.R4PIN = { attach, on: () => P.on, set, toggle: () => set(!P.on), highlight, closeComposer };
})();
