/* [PART R4-dl, 27 Nov 2026] Download the picture or video in an open card at full quality (Lee, 27 Nov 2026: "can we make
   assets in the content downloadable at full quality?"). Works in the client's card (r4_core.js) and our card (r4_tv.js)
   without touching either: a small "Download" button sits in the top right corner of each picture box (.r4c-fit), and in the
   full-size viewer (r4_zoom.js). The file is the one stored at upload, untouched: the storage address with ?download=<name>,
   which makes the storage send it as a file to save rather than open. Never on pins or while pin mode is on.
   window.R4DL = { url(src, name), nameFor(el) } */
(function () {
  "use strict";
  if (window.R4DL) return;
  const ICON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  const slug = (t) => String(t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, " ").trim().replace(/\s+/g, " ").slice(0, 80) || "Client Studio";
  function srcOf(el) { return el ? (el.currentSrc || el.src || "") : ""; }
  function extOf(src) { const m = /\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(String(src).split("?")[0]); return m ? m[1].toLowerCase() : "jpg"; }
  function url(src, name) {
    if (!/\/storage\/v1\/object\/public\//.test(src)) return src;   // only our storage understands ?download=
    const u = new URL(src, location.href); u.searchParams.set("download", name); return u.toString();
  }
  function nameFor(media) {
    const title = (document.querySelector("#r4tv-title, .r4c-title") || {}).textContent || "";
    const art = media.closest(".r4c-art"), under = art && art.querySelector(".r4c-under");
    const fig = media.closest(".r4c-fig"), cap = fig && fig.querySelector("figcaption b");
    const extra = cap ? cap.textContent : under ? under.textContent.replace(/^\D*?(\d+)\s+of\s+\d+\s*·?\s*/i, "$1 ").trim() : "";
    return slug([title.trim(), extra].filter(Boolean).join(" - ")) + "." + extOf(srcOf(media));
  }
  function button(media, cls) {
    const a = document.createElement("a");
    a.className = "r4dl " + (cls || ""); a.innerHTML = ICON + "<span>Download</span>";
    a.title = "Download at full quality"; a.setAttribute("aria-label", "Download at full quality");
    a.rel = "noopener";
    const set = () => { const s = srcOf(media); const n = nameFor(media); a.href = url(s, n); a.setAttribute("download", n); };
    set(); a.addEventListener("pointerenter", set); a.addEventListener("focus", set);
    a.addEventListener("click", (e) => { set(); e.stopPropagation(); });
    ["pointerdown", "mousedown", "touchstart"].forEach((t) => a.addEventListener(t, (e) => e.stopPropagation()));
    return a;
  }
  // "Download all" for a piece with more than one file: carousel slides, pages, two sizes, versions (Lee, 27 Nov 2026)
  function openPiece() {
    const team = document.querySelector("#r4tvc[data-id] .r4c-card") ? document.querySelector("#r4tvc[data-id]") : null;
    try {
      if (team && typeof W !== "undefined") return (W.items || []).concat(W.dropped || []).find((x) => x.id === team.dataset.id) || null;
      const id = window.R4C && R4C._state && R4C._state.id;
      if (id && typeof S !== "undefined" && S.data) for (const r of S.data.rounds || []) for (const it of r.items || []) if (it.id === id) return it;
    } catch (e) {}
    return null;
  }
  function fileUrl(path) { return typeof mediaUrl === "function" ? mediaUrl(path) : path; }
  function downloadAll(it, btn) {
    const title = slug(it.title || "Client Studio");
    const files = (it.media || []).filter((m) => m && m.path && m.type !== "text");
    btn.classList.add("busy");
    files.forEach((m, n) => setTimeout(() => {
      const src = fileUrl(m.path), name = slug(`${title} - ${n + 1} ${String(m.label || "").replace(/^\s*\d+[\s.:)-]+/, "")}`) + "." + extOf(m.path);
      const a = document.createElement("a"); a.href = url(src, name); a.setAttribute("download", name); a.style.display = "none";
      document.body.append(a); a.click(); a.remove();
      if (n === files.length - 1) setTimeout(() => btn.classList.remove("busy"), 600);
    }, n * 700));
  }
  // where the one button goes: the card's top bar, left of "Previous" (Lee, 27 Nov 2026); on a phone (under 900 px, where
  // the top bar is the phone's own) it sits under the picture
  function markAll() {
    const card = document.querySelector("#r4tvc .r4c-card, .r4c-root .r4c-card"); if (!card) return;
    const art = card.querySelector(".r4c-art"), hr = card.querySelector(":scope > .r4c-head > .r4c-hr");
    const phone = matchMedia("(max-width: 900px)").matches;
    const home = phone || !hr ? art : hr;
    const it = openPiece(), files = it ? (it.media || []).filter((m) => m && m.path && m.type !== "text") : [];
    const have = card.querySelector(".r4dl-all");
    if (!files.length || !home) { if (have) have.remove(); return; }
    if (have && have.dataset.for === it.id + files.length && have.parentElement === home) return;
    if (have) have.remove();
    const b = document.createElement("button"); b.type = "button"; b.className = "r4dl r4dl-all" + (home === hr ? " r4dl-top" : ""); b.dataset.for = it.id + files.length;
    const word = files.length > 1 ? `Download all ${files.length}` : "Download";
    b.innerHTML = ICON + `<span>${word}</span>`; b.title = word + " at full quality";
    b.addEventListener("click", (e) => { e.stopPropagation(); downloadAll(it, b); });
    if (home === hr) hr.prepend(b); else home.append(b);
  }
  function mark() {
    markAll();
    // one Download button per card (Lee, 27 Nov 2026: "only one download button, and it automatically downloads every
    // image/reel in a card"): the small icons that sat on each picture are gone
    document.querySelectorAll(".r4c-fit > .r4dl-box").forEach((b) => b.remove());
    // the full-size viewer's bar
    const z = document.querySelector(".r4z .r4z-bar");
    if (z && !z.querySelector(".r4dl")) {
      const img = document.querySelector(".r4z .r4z-view img"), x = z.querySelector(".r4z-x");
      if (img) z.insertBefore(button(img, "r4dl-bar"), x);
    }
  }
  let t = 0; new MutationObserver(() => { if (!t) t = requestAnimationFrame(() => { t = 0; mark(); }); }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  document.addEventListener("DOMContentLoaded", mark);
  window.R4DL = { url, nameFor };
})();
