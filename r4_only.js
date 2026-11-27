/* [PART R4-only, 27 Nov 2026] A personal link can show only some pages (Lee, 27 Nov 2026: "selectively hide pages from
   clients depending on link I give them ... a link to Roots client Matthew ... that only shows 'Content'").
   The database lists the pages a person may see as "nav:<page>" rows in studio_person_pages (studio_pages_for hands them to
   the page, which adds them to PAGES_OK). With none, nothing changes: every page shows, as before. With some, the menu
   (laptop) and the tabs (phone) show only those pages, and any other page the person reaches (the address, a button on
   another page) moves them to the first allowed page. Editors and shared links never get a limit.
   window.R4ONLY = { pages() } */
(function () {
  "use strict";
  if (window.R4ONLY) return;
  const ORDER = ["home", "content", "calendar", "reports", "tasks", "docs", "leads", "brand", "library"];
  const WORD = { home: "home", content: "content", calendar: "calendar", reports: "reports", tasks: "tasks", documents: "docs", leads: "leads", brand: "brand", library: "library" };
  function pages() {
    try {
      if (typeof PAGES_OK === "undefined" || !PAGES_OK || !PAGES_OK.size) return null;
      if (typeof TEAM !== "undefined" && TEAM && TEAM.on) return null;          // our team always sees everything
      const s = new Set([...PAGES_OK].filter((p) => /^nav:/.test(p)).map((p) => p.slice(4)));
      if (!s.size || ORDER.slice(0, 5).every((p) => s.has(p))) return null;
      return s;
    } catch (e) { return null; }
  }
  const first = (s) => ORDER.find((p) => s.has(p)) || "content";
  function current() {
    try { if (window.R4 && R4.page) return R4.page; } catch (e) {}
    const w = (new URLSearchParams(location.search).get("page") || "").toLowerCase();
    return w === "dashboard" ? "home" : w === "review" ? "content" : WORD[w] || (w ? w : null);
  }
  function apply() {
    const s = pages();
    document.body && document.body.classList.toggle("r4only", !!s);
    if (!s) return;
    document.querySelectorAll("#sidenav .r4-item").forEach((b) => {
      const w = WORD[(b.querySelector(".r4-l")?.textContent || "").trim().toLowerCase()];
      if (w) b.hidden = !s.has(w);
    });
    document.querySelectorAll("#r4ps-tabs .r4ps-tab").forEach((b) => { const k = b.dataset.k; if (k && k !== "more") b.hidden = !s.has(k); });
    const now = current();
    if (now && ORDER.includes(now) && !s.has(now)) { try { R4.go(first(s), { replace: true }); } catch (e) {} }
  }
  // the menu's own styles set display on these buttons, which beats the plain hidden attribute (found 27 Nov on the live site)
  const css = document.createElement("style");
  css.textContent = "body.r4only #sidenav .r4-item[hidden], body.r4only #r4ps-tabs .r4ps-tab[hidden] { display: none !important; }";
  (document.head || document.documentElement).append(css);
  let t = 0;
  const later = () => { if (!t) t = setTimeout(() => { t = 0; apply(); }, 60); };
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener("popstate", later);
  setInterval(apply, 1500);      // PAGES_OK fills in after the person's link is checked
  window.R4ONLY = { pages };
})();
