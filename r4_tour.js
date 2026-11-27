/* [PART R4-tour, 26 Nov 2026] Release 4: the "How it works" cards (laptop, client view). Owner: the tour builder.
   Lee, 26 Nov 2026: "update the 'how to' cards, constrain them to a max of 5 cards for every page".
   Loads after r4_merge.js and before r4_team.js. Reads only: it never writes to the database and never sends anything.
   window.R4TOUR = {
     has(pageKey)              true when there is a set for that page: "home", "content", "calendar", "reports", "tasks",
                               "card" (r4_shell.js shows "How it works" in the menu when this is true)
     open(pageKey, { manual }) plays that page's set now ("card": the set for the card that is open). manual: from a button,
                               so it plays even if seen before. Returns true when it showed something.
   }
   - Each set has AT MOST 5 cards. Each card lights up the real part of the screen (a hole in a dim layer, with a lime
     ring) and says what it does in a few short sentences. A card whose part is not on screen (no tasks, no figures...)
     is left out.
   - The opened piece has three sets, because the card is different for each: "card" (posts, carousels, two sizes,
     adverts, articles), "card-doc" (plans, reports and other documents) and "card-pick" (pick one). "How it works" in
     the menu cannot be reached while the card covers the page, so a small "?" button in the card's header plays it.
   - By itself, each set shows ONCE per person (this browser, as Release 3's tour), the first time they come to that page
     or open a waiting piece of that kind, 0.9 s after the screen has settled. Never on our team's own view (R4D.on() is
     false there), never on a phone (under 901 px), never while a card, side panel, grown tile, calendar card, message
     box, name box or passcode screen is open, and never in a browser driven by a test (navigator.webdriver) unless the
     address has &tour=1 (Release 3's rule, so other checks' screenshots stay clean).
   - Buttons: Back / Next (or Got it on the last card). The x (Later) and Escape close it: it comes back on their next
     visit. "Don't show again" stops every set from showing by itself (the menu's How it works still plays them).
     Got it marks that set as seen. Keys: right or down = Next, left or up = Back, Escape = Later; Tab stays in the box.
   - Stored: localStorage "m7r-tour:r4:<set>" = 1 (seen), "m7r-tour:r4:off" = 1 (don't show again); sessionStorage
     "m7r-tourlater:r4:<set>" = 1 (later, this visit only). */
(function () {
  "use strict";
  if (window.R4TOUR) return;

  // ---------- the words (one idea per sentence; measured: Flesch-Kincaid grade 8 or under, see NOTES_TOUR.md) ----------
  const W = {
    home: {
      hero: ["Start here", "This black box shows what we need from you next. Click Open to see it."],
      heroCalm: ["Start here", "This box shows what we need from you next. Right now, nothing is waiting."],
      more: ["Also waiting for you", "Here are the other things we need from you."],
      moreContent: "Click Go to Content to see posts and adverts.",
      moreOpen: "Click Open to see a plan or a report.",
      month: ["Your month in numbers", "These boxes show your leads this month. A lead is a person who asked about your service. Click a box to see your reports."],
      soon: ["Coming up", "These posts go out next. Click one to see it. Click Open the Calendar to see the whole month."],
      soonNone: ["Coming up", "Posts that go out soon show here. Click Open the Calendar to see the whole month."],
      help: ["Questions? Write to us", "Click Message M7Alpha to send us a note. Click How it works to see these tips again."],
      helpOnly: ["See these tips again", "Click How it works to see these tips again, on any page."],
    },
    content: {      // [27 Nov 2026] Lee: about this page only (filters, a closer look); approve, download and next are in the open card
      find: ["Find a piece fast", "Type a word to search. Or click a button to see one kind, or one task. Click All to see everything again."],
      tile: ["Take a closer look", "Move your mouse over a picture to see it bigger. Click it to open the full piece."],
    },
    calendar: {
      nav: ["Month or week", "Use the arrows to move a month at a time. Click Week to see seven days. Click Today to come back."],
      piece: ["Each piece on its day", "Each post sits on the day it goes out. Click it to see a small card. Then click Open to see it in full."],
      none: ["Each piece on its day", "Your posts show on the day they go out. Use the arrows to find a month with posts."],
      key: ["What the colours mean", "Each colour shows where a piece stands. The words next to each dot tell you what it means."],
    },
    reports: {
      list: ["Your reports", "Every report we send you is kept here. Click one to read it."],
      wait: ["Waiting for your answer", "The “Waiting for you” label means we need your answer. Open it, read it, then click the button that fits."],
      docs: ["Plans and other papers", "Your plans and other papers from us are here too. You can read them again at any time."],
    },
    tasks: {
      yours: ["What we need from you", "These are the tasks we need from you. Tick the circle when one is done."],
      yoursNoTick: ["What we need from you", "These are the tasks we need from you. We tick each one off when it is done."],
      ours: ["What we are doing", "These are the tasks we are doing for you right now."],
      open: ["Open a task", "Click a task to see more about it. You can write us a comment there."],
      add: ["Ask for something new", "Click Add a task to give us a new job. You can also give one to someone on your team."],
    },
    card: {
      answer: ["Say yes, or ask for changes", "Click Approve if it's ready. Or click Ask for changes and tell us what to fix."],      // Lee's agreed words, 27 Nov
      saveNext: ["Save it, then the next one", "Click Download to save every picture at full size. Click Next piece to keep going."],
      undo: ["Changed your mind?", "After you approve, the next piece opens by itself. A green line shows at the top. Click Undo there to take it back."],
      note: ["Leave a comment", "First choose {opts}. Then write your note and click Send."],
      noteOne: ["Leave a comment", "Write your note in the box. Then click Send."],
      caption: ["The words that go out", "This is the caption that goes out with the post. Want other words? Write them in a comment."],
      adText: ["The words that go out", "This is the text that goes out with the advert. Want other words? Write them in a comment."],
      article: ["Read it all", "Scroll down to read the whole article. Then give us your answer."],
      next: ["Go to the next piece", "Click Next piece to move along the row. The number shows where you are."],
    },
    "card-doc": {
      pages: ["Read every page", "Click a page, or use the arrows, to read each page."],
      answer: ["Give us your answer", "When you have read it, click the button that fits. Your answer comes straight to us."],
      note: ["Comment on a page", "First choose {opts}. Then write your note and click Send."],
      save: ["Keep a copy", "Click {btn} to save it on your computer."],
      next: ["Go to the next piece", "Click Next piece to move along the row. The number shows where you are."],
    },
    "card-pick": {
      pick: ["Pick the one you like", "Look at each option. Click Pick this one under the one you like best."],
      arrows: ["See one at a time", "Use the arrows to see each option on its own, bigger."],
      send: ["Send your answer", "Add a comment if you like. Then click Send my answer."],
      undo: ["Changed your mind?", "After you send, the next piece opens by itself. Click Undo on the green line to take it back."],
      next: ["Go to the next piece", "Click Next piece to move along the row. The number shows where you are."],
    },
  };

  // ---------- small helpers ----------
  const P = new URLSearchParams(location.search);
  const TEST_OK = !navigator.webdriver || P.get("tour") === "1";
  const KEY = (set) => "m7r-tour:r4:" + set, OFF = "m7r-tour:r4:off", LATER = (set) => "m7r-tourlater:r4:" + set;
  const lget = (k) => { try { if (typeof store !== "undefined") return store.get(k); return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lset = (k, v) => { try { if (typeof store !== "undefined") return store.set(k, v); localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const ssget = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssset = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };
  const E = (tag, attrs, ...kids) => {
    const x = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (v == null || v === false) return; if (k === "text") x.textContent = v; else if (k === "html") x.innerHTML = v; else if (k.startsWith("on")) x[k] = v; else x.setAttribute(k, v === true ? "" : v); });
    kids.flat().forEach((k) => { if (k != null && k !== false && k !== "") x.append(k); });
    return x;
  };
  const vis = (e) => {
    if (!e || !e.isConnected || e.closest("[hidden]")) return false;
    const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) return false;
    const cs = getComputedStyle(e); return cs.visibility !== "hidden" && cs.display !== "none";
  };
  const all = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const first = (sel, root) => all(sel, root).find(vis) || null;
  const txt = (e) => String((e && e.textContent) || "").replace(/\s+/g, " ").trim();
  const orList = (xs) => (xs.length <= 1 ? xs[0] || "" : xs.slice(0, -1).join(", ") + " or " + xs[xs.length - 1]);
  function contentTile() {
    const rows = all("#app .r4p-content > .r4p-row").filter(vis);
    const inView = (t) => { const r = t.getBoundingClientRect(), sc = t.closest(".r4p-tiles"), sr = sc ? sc.getBoundingClientRect() : r; return r.left >= sr.left - 1 && r.right <= sr.right + 1; };
    for (const row of rows) {
      const ts = all("button.r4p-tile:not(.r4p-tilew)", row).filter((t) => vis(t) && inView(t));
      const t = ts.find((x) => x.querySelector(".r4p-c-wait")) || ts[0];
      if (t) return t;
    }
    return null;
  }
  const step = (pair, el, extra) => (el ? Object.assign({ t: pair[0], b: pair[1], el }, extra || {}) : null);
  const r4on = () => { try { return !!(window.R4D && R4D.on()) && document.body.classList.contains("r4"); } catch (e) { return false; } };
  const cardSt = () => { try { return window.R4C && R4C._state && R4C._state.root ? R4C._state : null; } catch (e) { return null; } };
  const cardOpen = () => { try { return !!(window.R4C && R4C.isOpen && R4C.isOpen()); } catch (e) { return false; } };
  const cardEl = () => { const C = cardSt(); return C && C.mode === "card" ? C.card : null; };
  // the page now: Release 4's own pages, or the Release 3 page that shows (as r4_shell.js reads it)
  function pageKey() {
    try { if (window.R4 && R4.page) return R4.page; if (S.lib) return "library"; if (S.panel) return S.panel; if (S.r3page === "reports") return "reports"; } catch (e) {}
    return null;
  }
  // the set for the card that is open: null for the side panel (an answered piece) and the end-of-row screen
  function cardFam() {
    const C = cardSt(); if (!C || C.mode !== "card" || C.end || !C.card || C.card.querySelector(".r4c-endbody")) return null;
    return C.shape === "doc" ? "card-doc" : C.shape === "pick" ? "card-pick" : "card";
  }
  // is the open card a piece still waiting for this person's answer?
  function cardWaiting() {
    const c = cardEl(); if (!c) return false;
    if (first(".r4c-answer:not(.r4c-done) .r4c-btn:not([disabled])", c)) return true;
    if (first(".r4c-pickb:not([disabled])", c)) return true;
    return false;
  }

  // ---------- the sets: at most 5 cards each; a card returns null when its part is not on screen ----------
  const SETS = {
    home: [
      () => { const hero = first("#app .r4p-hero"); return hero && step(first(".r4p-go", hero) ? W.home.hero : W.home.heroCalm, hero); },
      () => {
        const tasks = all("#app .r4p-main > .r4p-task").filter(vis); if (!tasks.length) return null;
        const head = first("#app .r4p-main > .r4p-sec");
        const btns = tasks.map((t) => txt(t.querySelector(".r4p-btn")));
        const b = [W.home.more[1], btns.some((x) => /^Go to Content/.test(x)) ? W.home.moreContent : "", btns.some((x) => /^Open$/.test(x)) ? W.home.moreOpen : ""].filter(Boolean).join(" ");
        return { t: W.home.more[0], b, el: [head, ...tasks].filter(Boolean) };
      },
      () => { const k = first("#app .r4p-kpis"); if (!k) return null; const sec = k.previousElementSibling && k.previousElementSibling.classList.contains("r4p-sec") ? k.previousElementSibling : null; return step(W.home.month, [sec, k].filter(Boolean)); },
      () => {
        const soon = first("#app .r4p-soon"); if (!soon) return null;
        const box = soon.parentElement, head = box && box.querySelector(":scope > .r4p-sec"), cal = box && first(".r4p-right .r4p-btn", box);
        return step(soon.classList.contains("r4p-none") ? W.home.soonNone : W.home.soon, [head, soon, cal].filter(Boolean));
      },
      helpStep,
    ],
    content: [
      () => {
        const r = first("#app .r4p-content"); if (!r) return null;
        const parts = [first(".r4m-sw", r), ...all(".r4p-filters", r), first(".r4m-types", r)].filter((x) => x && vis(x));
        return parts.length ? step(W.content.find, parts) : null;
      },
      () => { const t = contentTile(); return t ? step(W.content.tile, t) : null; },
    ],
    calendar: [
      () => step(W.calendar.nav, first("#app .r4p-calnav")),
      () => {
        const evs = all("#app .r4p-calendar .r4p-ev").filter((e) => { if (!vis(e)) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
        const ev = evs.find((e) => e.classList.contains("r4p-ev-wait")) || evs[0];
        if (ev) return step(W.calendar.piece, ev);
        return step(W.calendar.none, first("#app .r4p-cal, #app .r4p-week"));
      },
      () => step(W.calendar.key, first("#app .r4p-legend")),
    ],
    reports: [
      () => sectionStep("Reports", W.reports.list),
      () => step(W.reports.wait, all("#r3reports .r3rep").find((b) => vis(b) && b.querySelector(".r3wait"))),
      () => sectionStep("Documents", W.reports.docs),
    ],
    tasks: [
      () => { const s = taskSec(/^Your side/); if (!s) return null; return step(first("button.tk-tick", s) ? W.tasks.yours : W.tasks.yoursNoTick, s); },
      () => step(W.tasks.ours, taskSec(/^With M7Alpha/)),
      () => step(W.tasks.open, first("#app .tk-page .tk-name")),
      () => step(W.tasks.add, first("#app .tk-head .tk-primary")),
    ],
    card: [
      () => { const c = cardEl(); return c && step(W.card.answer, first(".r4c-answer:not(.r4c-done)", c)); },
      () => noteStep(W.card),
      () => {
        const c = cardEl(); if (!c) return null;
        const cap = first(".r4c-caption", c);
        if (cap) return step(/advert/i.test(txt(cap.querySelector("h3"))) ? W.card.adText : W.card.caption, cap);
        return step(W.card.article, first(".r4c-paper", c));
      },
      () => {      // [27 Nov 2026] Lee: Content's tips 3 and 4 open with the card: Download and Next piece together
        const c = cardEl(); if (!c) return null;
        const parts = [first(".r4dl-all", c), first(".r4c-nav", c)].filter((x) => x && vis(x));
        return parts.length ? step(W.card.saveNext, parts) : null;
      },
    ],
    "card-doc": [
      () => { const c = cardEl(); return c && step(W["card-doc"].pages, first(".r4c-dochead", c)); },
      () => { const c = cardEl(); return c && step(W["card-doc"].answer, first(".r4c-answer:not(.r4c-done)", c)); },
      () => noteStep(W["card-doc"]),
      () => {
        const c = cardEl(), b = c && first(".r4c-dlbtn", c); if (!b) return null;
        const name = txt(b) || "Download PDF";
        return { t: W["card-doc"].save[0], b: W["card-doc"].save[1].replace("{btn}", name), el: b };
      },
      () => { const c = cardEl(); return c && step(W["card-doc"].next, first(".r4c-nav", c)); },
    ],
    "card-pick": [
      () => {          // the "Pick this one" buttons (the whole stage fills the screen, so the box could only sit on it)
        const c = cardEl(); if (!c) return null; const bs = all(".r4c-picks .r4c-pickb", c).filter(vis);
        return bs.length ? step(W["card-pick"].pick, bs) : null;
      },
      () => { const c = cardEl(); if (!c) return null; const rs = all(".r4c-pickmain > .r4c-round", c).filter(vis); return rs.length ? step(W["card-pick"].arrows, rs) : null; },
      () => { const c = cardEl(); return c && step(W["card-pick"].send, first(".r4c-pickbar", c)); },
      () => { const c = cardEl(); if (!c || !first(".r4c-nav", c)) return null; return step(W["card-pick"].undo, first(".r4c-pickbar .r4c-main", c)); },
      () => { const c = cardEl(); return c && step(W["card-pick"].next, first(".r4c-nav", c)); },
    ],
  };
  function helpStep() {
    const help = all("#sidenav .r4-foot-b").find((b) => vis(b) && /How it works/.test(txt(b)));
    const msg = first("#sidenav .r4-msg");
    if (help && msg) return step(W.home.help, [help, msg]);
    return help ? step(W.home.helpOnly, help) : null;
  }
  function sectionStep(word, pair) {
    const h2 = all("#r3reports > h2").find((x) => vis(x) && txt(x) === word); if (!h2) return null;
    const grid = h2.nextElementSibling && h2.nextElementSibling.classList.contains("r3grid") ? h2.nextElementSibling : null;
    return grid && vis(grid) ? step(pair, [h2, grid]) : null;
  }
  function taskSec(re) { return all("#app .tk-page .tk-sec").find((s) => vis(s) && re.test(txt(s.querySelector(".tk-sechead h2")))) || null; }
  function noteStep(words) {
    const c = cardEl(), box = c && first(".r4c-comments", c); if (!box) return null;
    const opts = all(".r4c-segb", box).filter(vis).map((b) => txt(b).replace(/\s*\(\d+\)\s*$/, ""));
    if (opts.length > 1) return { t: words.note[0], b: words.note[1].replace("{opts}", orList(opts)), el: box };
    return step(W.card.noteOne, box);
  }
  const setOf = (k) => (k === "card" ? cardFam() : k);

  // ---------- the player ----------
  let T = null;          // the tour on screen
  const ICON = {
    x: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>',
  };
  function start(set, manual) {
    const fns = SETS[set]; if (!fns) return false;
    if (T) stop();
    const live = fns.filter((f) => { try { return !!f(); } catch (e) { return false; } });
    if (!live.length) return false;
    // the dim layer is one shape with a hole cut for each lit part (several parts far apart get a hole each), and a lime
    // ring round each hole
    const dim = document.createElementNS("http://www.w3.org/2000/svg", "svg"); dim.setAttribute("class", "r4t-dim"); dim.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("fill-rule", "evenodd"); dim.append(path);
    const rings = E("div", { class: "r4t-rings", "aria-hidden": "true" });
    const tip = E("div", { class: "r4t-tip", role: "dialog", "aria-modal": "true", "aria-labelledby": "r4t-t", "aria-describedby": "r4t-b" });
    const root = E("div", { class: "r4t", "data-set": set });
    root.append(dim, rings, tip);
    const hole = { dim, path, rings };
    root.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    root.addEventListener("pointerdown", (e) => { if (!tip.contains(e.target)) { e.preventDefault(); nudge(); } });
    T = { set, manual: !!manual, steps: live, k: 0, dir: 1, cur: null, root, hole, tip, prevFocus: document.activeElement, raf: 0, mo: null, page: pageKey(), placed: false, scrollY: window.scrollY };
    document.body.append(root);
    document.body.classList.add("r4t-on");
    addEventListener("keydown", onKey, true);
    addEventListener("resize", onResize);
    addEventListener("scroll", later, true);
    addEventListener("popstate", onPop);
    T.mo = new MutationObserver(later);
    const app = document.getElementById("app"); if (app) T.mo.observe(app, { childList: true, subtree: true });
    const nav = document.getElementById("sidenav"); if (nav) T.mo.observe(nav, { childList: true });          // the menu is drawn again now and then
    T.mo.observe(document.body, { childList: true });          // a card opening or closing (r4_core.js adds it to body)
    const c = cardEl(); if (c) T.mo.observe(c, { childList: true, subtree: true });
    // pictures that finish loading move the page without any event: look again twice a second while the box shows
    T.tick = setInterval(later, 500);
    show(0, 1);
    return true;
  }
  function nudge() {          // a click on the dim part: the box gives a small shake, so the person sees where to answer
    if (!T || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    T.tip.classList.remove("r4t-nudge"); void T.tip.offsetWidth; T.tip.classList.add("r4t-nudge");
  }
  function show(k, dir) {
    if (!T) return;
    if (k < 0) k = 0;
    if (k >= T.steps.length) return finish();
    let s = null; try { s = T.steps[k](); } catch (e) {}
    if (!s) {          // its part has gone meanwhile: go on in the same direction
      if (dir < 0 && k > 0) return show(k - 1, -1);
      if (k < T.steps.length - 1) return show(k + 1, 1);
      return finish();
    }
    T.k = k; T.dir = dir; T.cur = s;
    const els = [].concat(s.el).filter(Boolean);
    // bring the whole part into view: its last piece, then its first
    try { els[els.length - 1].scrollIntoView({ block: "nearest", inline: "nearest" }); els[0].scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {}
    // and not hard against the screen's edge: a part that fits is brought to the middle (so its ring and the box have room)
    try {
      const top = Math.min(...els.map((e) => e.getBoundingClientRect().top)), bot = Math.max(...els.map((e) => e.getBoundingClientRect().bottom));
      if ((top < 24 || bot > innerHeight - 24) && bot - top < innerHeight - 64) {
        scrollBy_(els[0], (top + bot) / 2 - innerHeight / 2);
      }
    } catch (e) {}
    const n = T.steps.length, last = k === n - 1;
    const next = E("button", { type: "button", class: "r4t-btn r4t-main r4t-next", onclick: () => (last ? finish() : show(T.k + 1, 1)) }, last ? "Got it" : "Next");
    const back = k > 0 ? E("button", { type: "button", class: "r4t-btn r4t-back", onclick: () => show(T.k - 1, -1) }, "Back") : null;
    const never = T.manual ? null : E("button", { type: "button", class: "r4t-never", onclick: never_ }, "Don’t show again");
    const dots = E("span", { class: "r4t-dots", "aria-hidden": "true" }, ...T.steps.map((_, i) => E("i", { class: "r4t-dot" + (i === k ? " r4t-dot-on" : i < k ? " r4t-dot-done" : "") })));
    const chips = s.chips ? E("div", { class: "r4t-chips" }, ...s.chips.map((c, i) => E("span", { class: "r4t-chip" + (i === 0 ? " main" : "") }, c))) : null;
    T.tip.replaceChildren(
      E("div", { class: "r4t-top" }, E("span", { class: "r4t-n", text: `${k + 1} of ${n}` }), dots, E("span", { class: "r4t-sp" }),
        E("button", { type: "button", class: "r4t-x", "aria-label": "Later", title: "Later: show it next time", html: ICON.x, onclick: () => stop("later") })),
      E("div", { class: "r4t-words", "aria-live": "polite" }, E("h3", { id: "r4t-t", class: "r4t-t", text: s.t }), E("p", { id: "r4t-b", class: "r4t-b", text: nw(s.b) }), chips, s.b2 ? E("p", { class: "r4t-b r4t-b2", text: nw(s.b2) }) : null),
      E("div", { class: "r4t-foot" }, never, E("span", { class: "r4t-sp" }), back, next));
    T.tip.classList.remove("r4t-in"); void T.tip.offsetWidth; T.tip.classList.add("r4t-in");
    T.hole.rings.replaceChildren();          // new rings for the new part (they fade in)
    place();
    requestAnimationFrame(() => requestAnimationFrame(place)); setTimeout(place, 320);
    try { next.focus({ preventScroll: true }); } catch (e) {}
  }
  // scroll whatever scrolls this element (a box inside the card, or the page) by `by` pixels
  function scrollBy_(el, by) {
    let sc = el.parentElement;
    while (sc && sc !== document.body) { const o = getComputedStyle(sc).overflowY; if (/(auto|scroll)/.test(o) && sc.scrollHeight > sc.clientHeight + 2) break; sc = sc.parentElement; }
    if (sc && sc !== document.body) sc.scrollBy({ top: by, behavior: "instant" }); else window.scrollBy({ top: by, behavior: "instant" });
  }
  // no word alone on the last line: the last two words are kept together
  const nw = (s) => { s = String(s || ""); const i = s.lastIndexOf(" "); return i > 0 ? s.slice(0, i) + " " + s.slice(i + 1) : s; };
  function later() { if (!T || T.raf) return; T.raf = requestAnimationFrame(() => { if (T) { T.raf = 0; place(); } }); }
  function contextGone() {
    if (!T) return true;
    if (!r4on() || innerWidth < 901) return true;
    if (T.set.startsWith("card")) return cardFam() !== T.set;
    return pageKey() !== T.set || cardOpen();          // a card opened over the page (Back, a link): the page's set gives way
  }
  function place() {
    if (!T) return;
    if (contextGone()) return stop("later");
    let els = [].concat(T.cur.el).filter((e) => e && e.isConnected && vis(e));
    if (!els.length) {          // the page drew itself again: find the part again
      let s = null; try { s = T.steps[T.k](); } catch (e) {}
      if (!s) return show(T.k + (T.dir < 0 ? -1 : 1), T.dir);
      T.cur = s; els = [].concat(s.el).filter(Boolean);
      // the words may differ now (e.g. a task was finished): redraw them
      const tt = T.tip.querySelector(".r4t-t"), bb = T.tip.querySelector("#r4t-b");
      if (tt) tt.textContent = s.t; if (bb) bb.textContent = nw(s.b);
    }
    const vw = document.documentElement.clientWidth, vh = innerHeight, pad = 8;
    // one rectangle per lit part, padded and kept on screen; parts that touch or nearly touch (under 40 px apart) are one
    // a part taller than the box it scrolls in (a long article) is lit only where it can be seen
    const seenRect = (e) => { const r = e.getBoundingClientRect(); let l = r.left, t = r.top, rt = r.right, b = r.bottom;
      for (let a = e.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a); if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const ar = a.getBoundingClientRect(); l = Math.max(l, ar.left); t = Math.max(t, ar.top); rt = Math.min(rt, ar.right); b = Math.min(b, ar.bottom); }
      return { left: l, top: t, right: Math.max(l, rt), bottom: Math.max(t, b) }; };
    let R = els.map((e) => { const r = seenRect(e); let rad = 14; try { rad = Math.min(26, Math.max(12, (parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0) + pad)); } catch (x) {}
      return { l: Math.max(6, r.left - pad), t: Math.max(6, r.top - pad), r: Math.min(vw - 6, r.right + pad), b: Math.min(vh - 6, r.bottom + pad), rad }; })
      .filter((h) => h.r - h.l >= 8 && h.b - h.t >= 8);
    if (!R.length) R = [{ l: vw / 2 - 4, r: vw / 2 + 4, t: vh / 2 - 4, b: vh / 2 + 4, rad: 4 }];
    const near = (x, y) => x.l - 40 <= y.r && y.l - 40 <= x.r && x.t - 40 <= y.b && y.t - 40 <= x.b;
    for (let again = true; again;) {
      again = false;
      outer: for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (near(R[i], R[j])) {
        R[i] = { l: Math.min(R[i].l, R[j].l), t: Math.min(R[i].t, R[j].t), r: Math.max(R[i].r, R[j].r), b: Math.max(R[i].b, R[j].b), rad: Math.max(R[i].rad, R[j].rad) };
        R.splice(j, 1); again = true; break outer;
      }
    }
    const rr = (h) => { const r = Math.min(h.rad, (h.r - h.l) / 2, (h.b - h.t) / 2), x = h.l, y = h.t, w = h.r - h.l, ht = h.b - h.t;
      return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + ht - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + ht}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + ht - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`; };
    const fw = innerWidth, fh = innerHeight;          // the dim covers the whole window, the scroll bar too (same pixels as the page)
    T.hole.dim.setAttribute("viewBox", `0 0 ${fw} ${fh}`); T.hole.dim.setAttribute("width", fw); T.hole.dim.setAttribute("height", fh);
    T.hole.path.setAttribute("d", `M0 0H${fw}V${fh}H0Z` + R.map(rr).join(""));
    const ringEls = [...T.hole.rings.children];
    while (ringEls.length < R.length) { const x = E("div", { class: "r4t-ring" }); T.hole.rings.append(x); ringEls.push(x); }
    ringEls.forEach((x, i) => { const h = R[i]; if (!h) { x.remove(); return; }
      Object.assign(x.style, { left: h.l + "px", top: h.t + "px", width: h.r - h.l + "px", height: h.b - h.t + "px", borderRadius: Math.min(h.rad, (h.r - h.l) / 2, (h.b - h.t) / 2) + "px" }); });
    const H = R.reduce((a, h) => ({ l: Math.min(a.l, h.l), t: Math.min(a.t, h.t), r: Math.max(a.r, h.r), b: Math.max(a.b, h.b) }), { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });
    // the box of words goes beside the lit parts, never over one: below, above, right or left of them all, then of each
    const tip = T.tip, tw = tip.offsetWidth, th = tip.offsetHeight, gap = 16, m = 14;
    const cX = (x) => Math.max(m, Math.min(vw - tw - m, x)), cY = (y) => Math.max(m, Math.min(vh - th - m, y));
    const around = (h) => { const cx = (h.l + h.r) / 2, cy = (h.t + h.b) / 2;
      return { below: { x: cX(cx - tw / 2), y: h.b + gap }, above: { x: cX(cx - tw / 2), y: h.t - gap - th }, right: { x: h.r + gap, y: cY(cy - th / 2) }, left: { x: h.l - gap - tw, y: cY(cy - th / 2) } }; };
    const tall = H.b - H.t > vh * 0.45;
    const order = tall ? ["right", "left", "below", "above"] : ["below", "above", "right", "left"];
    const C = [H, ...(R.length > 1 ? R : [])].flatMap((h) => { const c = around(h); return order.map((k) => Object.assign({ k }, c[k])); });
    const hit = (c) => R.reduce((sum, h) => sum + Math.max(0, Math.min(c.x + tw, h.r + 4) - Math.max(c.x, h.l - 4)) * Math.max(0, Math.min(c.y + th, h.b + 4) - Math.max(c.y, h.t - 4)), 0);
    const fits = (c) => c.x >= m - .5 && c.y >= m - .5 && c.x + tw <= vw - m + .5 && c.y + th <= vh - m + .5 && hit(c) === 0;
    let pos = C.find(fits) || null;
    if (!pos && !T.cur.moved && H.b - H.t + th + gap + 2 * m <= vh) {          // room for both one above the other: scroll once to make it
      T.cur.moved = true;
      const down = H.b - (vh - m - th - gap), up = m + th + gap - H.t;
      if (down > 0 && H.t - down >= 6) { scrollBy_(els[0], down); return later(); }
      if (up > 0 && H.b + up <= vh - 6) { scrollBy_(els[0], -up); return later(); }
    }
    if (!pos) pos = C.map((c) => Object.assign({}, c, { x: cX(c.x), y: cY(c.y) })).sort((x, y) => hit(x) - hit(y))[0];          // no free place: the least covered
    const side = pos.k;
    Object.assign(tip.style, { left: Math.round(pos.x) + "px", top: Math.round(pos.y) + "px" });
    tip.dataset.side = side;
    if (!T.placed) { T.placed = true; T.root.classList.add("r4t-ready"); }
  }
  function onKey(e) {
    if (!T) return;
    const k = e.key;
    if (k === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); stop("later"); return; }
    if (k === "Tab") {          // focus stays in the box
      const f = all("button:not([disabled])", T.tip).filter((x) => x.offsetParent !== null);
      if (f.length) {
        const a = f[0], z = f[f.length - 1], inside = T.tip.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === a || !inside)) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && (document.activeElement === z || !inside)) { e.preventDefault(); a.focus(); }
      }
      e.stopImmediatePropagation(); return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); e.stopImmediatePropagation(); T.tip.querySelector(".r4t-next")?.click(); return; }
    if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); e.stopImmediatePropagation(); T.tip.querySelector(".r4t-back")?.click(); return; }
    if (k === "Enter" || k === " ") { if (!T.tip.contains(document.activeElement)) { e.preventDefault(); T.tip.querySelector(".r4t-next")?.click(); } e.stopImmediatePropagation(); return; }
    e.stopImmediatePropagation();          // the page's own keys (J / K, the card's arrows) wait until the box is closed
  }
  function onResize() { if (!T) return; if (!r4on() || innerWidth < 901) return stop("later"); later(); }
  function onPop() { if (T) setTimeout(() => { if (T && contextGone()) stop("later"); else later(); }, 80); }
  function finish() { if (!T) return; lset(KEY(T.set), 1); stop(); }
  function never_() { if (!T) return; lset(OFF, 1); lset(KEY(T.set), 1); stop(); }
  function stop(how) {
    if (!T) return;
    const t = T; T = null;
    if (how === "later") ssset(LATER(t.set), "1");
    removeEventListener("keydown", onKey, true); removeEventListener("resize", onResize); removeEventListener("scroll", later, true); removeEventListener("popstate", onPop);
    if (t.mo) t.mo.disconnect(); if (t.raf) cancelAnimationFrame(t.raf); clearInterval(t.tick);
    t.root.remove(); document.body.classList.remove("r4t-on");
    // a page's set puts the page back where the person had it (the cards may have scrolled it to a part further down)
    if (!t.set.startsWith("card")) { try { if (pageKey() === t.set && !cardOpen()) window.scrollTo({ top: t.scrollY, behavior: "instant" }); } catch (e) {} }
    AUTO.sig = ""; AUTO.at = 0; AUTO.quietUntil = Date.now() + 1500;
    clearTimeout(AUTO.timer); AUTO.timer = setTimeout(tick, 1550);          // look again as soon as the quiet time is over (a card opened over the page)
    // focus goes back to what had it (the menu's How it works, the card), else the card or the page's heading
    const pf = t.prevFocus;
    const back = pf && pf.isConnected && pf !== document.body ? pf : cardEl() || document.querySelector("#app h1");
    try { if (back) { if (!back.matches("a[href], button, input, textarea, select, [tabindex]")) back.setAttribute("tabindex", "-1"); back.focus({ preventScroll: true }); } } catch (e) {}
  }

  // ---------- by itself, once ----------
  const AUTO = { sig: "", at: 0, timer: 0, quietUntil: 0 };
  function blocked() {
    const de = document.documentElement;
    if (de.classList.contains("r4-boot") || de.classList.contains("r4-bootn")) return true;          // "Loading your work…"
    const modal = document.getElementById("modal"); if (modal && !modal.hidden) return true;          // the name box and other boxes
    if (first("#app > .gate, #app .gate")) return true;          // the passcode screen
    if (document.getElementById("tour")) return true;          // Release 3's own tour
    // a grown tile (Content) or a Calendar card: only on their own page (a grown tile left behind by a mouse that has not
    // moved since does not hold up the next page's set)
    const pk = pageKey();
    if ((pk === "content" && first(".r4p-hv")) || (pk === "calendar" && first(".r4p-pop"))) return true;
    const mb = document.getElementById("r3msgbox"); if (mb && !mb.hidden) return true;          // the message box
    if (first("#lcard, #lview, .dc-reader, .zoom")) return true;
    try { if (S.story >= 0) return true; } catch (e) {}
    if (document.visibilityState === "hidden") return true;
    return false;
  }
  function pageReady(k) {
    if (k === "home") return !!first("#app > .r4p-home .r4p-hero");
    if (k === "content") return !!first("#app > .r4p-content");
    if (k === "calendar") return !!first("#app > .r4p-calendar .r4p-calnav");
    if (k === "reports") { const r = first("#r3reports"); return !!r && !all(".r3none", r).some((x) => /Loading/.test(txt(x))); }
    if (k === "tasks") return !!first("#app .tk-page .tk-sec");
    return false;
  }
  function wanted() {
    if (!TEST_OK || T || Date.now() < AUTO.quietUntil) return null;
    if (!r4on() || innerWidth < 901) return null;
    try { if (TEAM.on && !TEAM.client) return null; } catch (e) {}
    if (lget(OFF)) return null;
    if (blocked()) return null;
    if (cardOpen()) {
      const fam = cardFam(); if (!fam || !cardWaiting()) return null;          // the side panel, the end screen, an answered piece
      if (lget(KEY(fam)) || ssget(LATER(fam))) return null;
      return { set: fam, sig: fam + "|" + (cardSt().id || "") };
    }
    const k = pageKey(); if (!k || !SETS[k] || !pageReady(k)) return null;
    if (lget(KEY(k)) || ssget(LATER(k))) return null;
    return { set: k, sig: k };
  }
  function tick() {
    clearTimeout(AUTO.timer); AUTO.timer = 0;
    const w = wanted();
    if (!w) { AUTO.sig = ""; return; }
    const now = Date.now();
    if (w.sig !== AUTO.sig) { AUTO.sig = w.sig; AUTO.at = now; }
    if (now - AUTO.at >= 900) { AUTO.sig = ""; start(w.set, false); return; }
    AUTO.timer = setTimeout(tick, 960 - (now - AUTO.at));
  }
  let soon = 0;
  const poke = () => { if (T) return; clearTimeout(soon); soon = setTimeout(tick, 200); };
  function watch() {
    try { new MutationObserver(poke).observe(document.body, { childList: true }); } catch (e) {}
    const app = document.getElementById("app"); if (app) { try { new MutationObserver(poke).observe(app, { childList: true }); } catch (e) {} }
    addEventListener("popstate", poke); addEventListener("resize", poke);
    setInterval(() => { if (!T && !AUTO.timer) tick(); }, 1500);
    poke();
  }

  // ---------- the "?" in the opened card's header (the menu is under the card there) ----------
  const HELP_SVG = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.6 7.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><path d="M10 14.6h.01" stroke-width="2.6"/></svg>';
  function addHelp() {
    const c = cardEl(); if (!c || !cardFam()) return;
    const hr = c.querySelector(".r4c-head .r4c-hr"); if (!hr || hr.querySelector(".r4t-help")) return;
    const x = hr.querySelector(".r4c-x");
    const b = E("button", { type: "button", class: "r4t-help", "aria-label": "How it works", title: "How it works", html: HELP_SVG, onclick: () => R4TOUR.open("card", { manual: true }) });
    if (x) x.before(b); else hr.append(b);
  }
  function watchCard() {
    let seen = null, mo = null;
    const look = () => {
      const c = cardEl();
      if (c !== seen) { if (mo) mo.disconnect(); mo = null; seen = c; if (c) { mo = new MutationObserver(addHelp); mo.observe(c, { childList: true }); } }
      if (c) addHelp();
    };
    try { new MutationObserver(look).observe(document.body, { childList: true }); } catch (e) {}
    look();
  }

  // ---------- the public part ----------
  window.R4TOUR = {
    has(k) { return !!k && (k === "card" || (Object.prototype.hasOwnProperty.call(SETS, k) && !String(k).startsWith("card"))); },
    open(k, o) {
      o = o || {};
      if (!r4on()) return false;
      const set = setOf(k === "card" || (cardOpen() && cardFam() && k == null) ? "card" : k);
      if (!set || !SETS[set]) return false;
      // a part of the page that is open over everything closes first (a grown tile, a Calendar card)
      try { if (window.R4P && R4P.closePop) R4P.closePop(); } catch (e) {}
      document.querySelectorAll(".r4p-hv").forEach((x) => x.remove());
      const ok = start(set, !!o.manual);
      if (!ok && o.manual) { try { showToast("There is nothing to show on this page yet."); hideToastLater(3500); } catch (e) {} }
      return ok;
    },
    close() { stop("later"); },
    isOpen() { return !!T; },
    // for checks: every card's words, and the steps each set would show now
    _words() {
      const out = [];
      for (const [set, o] of Object.entries(W)) for (const [id, v] of Object.entries(o)) {
        if (/Chips$/.test(id)) continue;          // button names shown as small pictures, not sentences
        if (Array.isArray(v) && typeof v[0] === "string" && v.length >= 2) out.push({ set, id, title: v[0], text: v.slice(1).join(" ") });
        else if (typeof v === "string") out.push({ set, id, title: "", text: v });
      }
      return out;
    },
    _now(k) { const set = setOf(k); return (SETS[set] || []).map((f) => { try { const s = f(); return s ? { t: s.t, b: s.b + (s.b2 ? " " + s.b2 : "") } : null; } catch (e) { return null; } }); },
  };
  function boot() {
    watch(); watchCard();
    try { if (r4on()) renderSideNav(); } catch (e) {}          // the menu may have been drawn before this file: show How it works
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else setTimeout(boot, 0);
})();
