/* Client Studio: Documents page, document cards on the Review page, and the drop box (builder 2, 24 Nov 2026).
   Plugs in through window.StudioPanelsQueue (PANEL_CONTRACT_2026-11-24.md, section 4). Needs setup_25.
   One global only: window.M7Docs. CSS classes start with dc-. Saved on the device only under m7r-dc:.
   24 Nov 2026 (setup_27, Lee: "shared link is the same as personal link"): with no personal link, everything here works
   on the client's shared link (ctx.code) too. Reads send p_token null; writes also send p_name, the name typed once on
   the page (ctx.visitorName(); ctx.askName() is called when a write needs one and none is typed yet). */
(function () {
  "use strict";
  if (window.M7Docs) return;

  const KIND = { proposal: "Proposal", plan: "Plan", guide: "Guide", report: "Report", document: "Document" };
  const LOCKED = "Open your personal link to see this. Lost it? Ask M7Alpha.";
  const ICON = {
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5M10 13h6M10 17h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V8m0 0-4.5 4.5M12 8l4.5 4.5M5 4h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // ---------- small helpers ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("m7r-dc:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("m7r-dc:" + k, JSON.stringify(v)); } catch (e) {} },
  };
  const day = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); };
  const when = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : day(iso) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
  const mb = (n) => !n ? "" : n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + " MB";
  const answerBy = (ctx, d) => !d ? null : (ctx.fmtAnswerBy ? ctx.fmtAnswerBy(d) : "Please answer by " + day(d + "T12:00:00"));
  // the same date line for a document they only need to read: "Please read it by ..." / "Reading was due ..."
  const dueLine = (ctx, doc) => {
    const t = answerBy(ctx, doc.answer_by);
    if (!t) return doc.ask === "answer" ? "M7Alpha would like your answer on this." : "M7Alpha would like you to read this.";
    return doc.ask === "answer" ? t : t.replace(/^Please answer by/i, "Please read it by").replace(/^Answer was due/i, "Reading was due");
  };
  const icon = (ctx, name, cls) => ctx.h("span", { class: "dc-ic" + (cls ? " " + cls : ""), html: ICON[name] });
  const fileUrl = (ctx, d, download) => ctx.mediaUrl(d.file_path) + (download ? "?download=" + encodeURIComponent(d.file_name || "document.pdf") : "");
  // A visitor: a personal link (ctx.token) or, from setup_27 (Lee, 24 Nov 2026), the client's shared link (ctx.code only).
  const isVisitor = (ctx) => !ctx.team && !!(ctx.token || ctx.code);
  const busy = (btn, on) => { if (!btn) return; btn.disabled = on; btn.classList.toggle("dc-busy", on); };
  // the name typed once on the page (shared link only); the page gives it through ctx.visitorName()
  const typedName = (ctx) => {
    try { const n = typeof ctx.visitorName === "function" ? ctx.visitorName() : ctx.reviewerName; return String(n || "").trim(); } catch (e) { return ""; }
  };
  // Link arguments for a write. Personal link: exactly as before. Shared link: p_token null plus the typed name; when
  // none is typed yet and the call needs one, the page is asked (ctx.askName()). Null = no name, don't send.
  async function writeArgs(ctx, needName) {
    if (ctx.token) return { p_token: ctx.token };
    let n = typedName(ctx);
    if (!n && needName && typeof ctx.askName === "function") { try { n = String((await ctx.askName()) || "").trim(); } catch (e) { n = ""; } }
    if (!n && needName) return null;
    return n ? { p_token: null, p_name: n } : { p_token: null };
  }
  const NAME_FIRST = "Please type your name first, so M7Alpha knows who it's from.";

  async function call(ctx, fn, args) {
    const r = await ctx.rpc(fn, args);
    if (r && r.error) throw new Error(r.error);
    return r;
  }
  // open or download: recorded for us; on the shared link with the typed name if there is one (never asks)
  async function recordOpen(ctx, doc, how) {
    const a = await writeArgs(ctx, false);
    return ctx.rpc("open_document", Object.assign({ p_client_code: ctx.code, p_doc: doc.id, p_how: how }, a));
  }
  // Part 29 (Lee, 24 Nov 2026): "Download the full version (PDF)", only when the document has one. The first download
  // by each person or typed name is recorded for us (open_document with p_how 'full_download').
  function fullLink(ctx, doc) {
    const f = doc && doc.full;
    if (!f || !f.file_path) return null;
    return ctx.h("a", { class: "dc-full", href: ctx.mediaUrl(f.file_path) + "?download=" + encodeURIComponent(f.file_name || "full-version.pdf"),
      download: f.file_name || "full-version.pdf",
      onclick: () => { if (isVisitor(ctx)) recordOpen(ctx, doc, "full_download").catch(() => {}); } },
      icon(ctx, "down"), "Download the full version (PDF)" + (f.size ? " · " + mb(f.size) : ""));
  }
  function locked(ctx, el) {
    el.replaceChildren(ctx.h("p", { class: "dc-locked", text: LOCKED }));
  }

  // ---------- the reader ----------
  let openReader = null;    // only one at a time
  function reader(doc, ctx, opts) {
    opts = opts || {};
    if (openReader) openReader.close(true);
    const h = ctx.h;
    const pages = doc.pages || [];
    let zoom = store.get("zoom", 1);
    const counter = h("span", { class: "dc-count", "aria-live": "polite" }, pages.length > 1 ? `Page 1 of ${pages.length}` : "");
    const body = h("div", { class: "dc-rbody", tabindex: "0" });
    const sheet = h("div", { class: "dc-sheet" });
    pages.forEach((p, i) => sheet.append(h("img", { class: "dc-page", src: ctx.mediaUrl(p.path), alt: `Page ${i + 1} of ${pages.length}`, width: p.w, height: p.h,
      loading: i < 2 ? "eager" : "lazy", decoding: "async", "data-n": i + 1 })));
    if (!pages.length) sheet.append(h("p", { class: "dc-locked", text: "This document has no pages to show. Use Download to open it." }));
    body.append(sheet);
    const setZoom = (z) => { zoom = Math.min(3, Math.max(1, Math.round(z * 4) / 4)); sheet.style.setProperty("--dc-zoom", zoom); store.set("zoom", zoom); zl.textContent = Math.round(zoom * 100) + "%"; };
    const zl = h("span", { class: "dc-zl" });
    const dl = h("a", { class: "dc-btn dc-ghost", href: fileUrl(ctx, doc, true), download: doc.file_name || "document.pdf",
      onclick: () => { if (isVisitor(ctx)) recordOpen(ctx, doc, "download").catch(() => {}); } },
      icon(ctx, "down"), h("span", { class: "dc-lbl" }, "Download"));
    const bar = h("div", { class: "dc-rbar" },
      h("div", { class: "dc-rtitle" }, h("b", { text: doc.title }), counter),
      h("div", { class: "dc-rtools" },
        h("button", { class: "dc-round", type: "button", "aria-label": "Smaller", onclick: () => setZoom(zoom - 0.25) }, icon(ctx, "minus")),
        zl,
        h("button", { class: "dc-round", type: "button", "aria-label": "Bigger", onclick: () => setZoom(zoom + 0.25) }, icon(ctx, "plus")),
        dl,
        h("button", { class: "dc-round dc-close", type: "button", "aria-label": "Close", onclick: () => close() }, icon(ctx, "x"))));
    const foot = doc.ask === "answer" && doc.waiting && isVisitor(ctx) ? answerBox(doc, ctx, () => close()) : null;
    const full = fullLink(ctx, doc);
    const box = h("div", { class: "dc-reader", role: "dialog", "aria-modal": "true", "aria-label": doc.title }, bar,
      full ? h("div", { class: "dc-rfull" }, full) : null, body, foot ? h("div", { class: "dc-rfoot" }, foot) : null);
    document.body.append(box);
    document.documentElement.classList.add("dc-noscroll");
    setZoom(zoom);
    const prevFocus = document.activeElement;
    body.focus({ preventScroll: true });

    // page counter
    let io = null;
    if (pages.length > 1 && "IntersectionObserver" in window) {
      io = new IntersectionObserver((es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) counter.textContent = `Page ${vis.target.dataset.n} of ${pages.length}`;
      }, { root: body, threshold: [0.25, 0.5, 0.75] });
      sheet.querySelectorAll(".dc-page").forEach((p) => io.observe(p));
    }
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
    document.addEventListener("keydown", onKey);
    // the phone's back button closes the reader instead of leaving the page
    let pushed = false;
    try { history.pushState({ dcReader: doc.id }, ""); pushed = true; } catch (e) {}
    const onPop = () => close(true);
    window.addEventListener("popstate", onPop);

    function close(fromHistory) {
      if (!box.isConnected) return;
      box.remove(); io && io.disconnect();
      document.removeEventListener("keydown", onKey); window.removeEventListener("popstate", onPop);
      document.documentElement.classList.remove("dc-noscroll");
      if (pushed && !fromHistory) { try { history.back(); } catch (e) {} }
      openReader = null;
      try { prevFocus && prevFocus.focus({ preventScroll: true }); } catch (e) {}
      if (opts.onClose) opts.onClose();
    }
    openReader = { close, el: box };

    // first-opened time, for us only (nothing comes back to the page about it)
    if (isVisitor(ctx)) {
      recordOpen(ctx, doc, "open")
        .then((r) => { if (r && r.ok && opts.onOpened) opts.onOpened(r); }).catch(() => {});
    }
    return openReader;
  }

  // "Looks good" or a comment, for a document Lee asked them to answer
  function answerBox(doc, ctx, done, noAsk) {     // noAsk: the card already says it above (Lee, 24 Nov 2026: shown twice)
    const h = ctx.h;
    const ta = h("textarea", { class: "dc-ta", rows: "3", maxlength: "4000", placeholder: "Your comment (what to change, a question...)", "aria-label": "Your comment" });
    const wrap = h("div", { class: "dc-answer" });
    const send = async (decision, btn) => {
      const comment = ta.value.trim();
      if (decision === "comment" && !comment) { ta.focus(); ctx.toast("Write your comment first."); return; }
      const link = await writeArgs(ctx, true);
      if (!link) { ctx.toast(NAME_FIRST); return; }
      busy(btn, true);
      try {
        await call(ctx, "answer_document", Object.assign({ p_client_code: ctx.code, p_doc: doc.id, p_decision: decision, p_comment: comment || null }, link));
        wrap.replaceChildren(h("p", { class: "dc-thanks" }, icon(ctx, "ok"), decision === "approve" ? " Thanks. We've noted it looks good." : " Thanks. Your comment is with M7Alpha."));
        ctx.toast("Sent to M7Alpha");
        ctx.refresh && ctx.refresh();
        done && setTimeout(done, 900);
      } catch (e) { busy(btn, false); ctx.toast(e.message === "name" ? NAME_FIRST : "That didn't send. Please try again."); }
    };
    const ok = h("button", { class: "dc-btn dc-ok", type: "button", onclick: (e) => send("approve", e.currentTarget) }, icon(ctx, "ok"), "Looks good");
    const cm = h("button", { class: "dc-btn dc-ghost", type: "button", onclick: (e) => send("comment", e.currentTarget) }, "Send comment");
    wrap.append(...(noAsk ? [] : [h("p", { class: "dc-ask", text: "M7Alpha would like your answer on this." })]), h("div", { class: "dc-row" }, ok), ta, h("div", { class: "dc-row" }, cm));
    return wrap;
  }

  // ---------- the drop box ----------
  function storageBase(ctx) {
    // the address of the files store, taken from the page's own picture address helper
    const u = ctx.mediaUrl("x");
    return u.slice(0, u.indexOf("/storage/v1/")) + "/storage/v1/object/";
  }
  function storageKey(ctx) {
    if (ctx.storageKey) return ctx.storageKey;
    try { return typeof CONFIG !== "undefined" ? CONFIG.key : null; } catch (e) { return null; }   // the page's own public key
  }
  function putFile(ctx, slot, file, onProgress) {
    if (ctx.upload) return ctx.upload(slot.bucket, slot.path, file, onProgress);
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open("POST", storageBase(ctx) + slot.bucket + "/" + slot.path.split("/").map(encodeURIComponent).join("/"));
      const key = storageKey(ctx);
      if (key) { x.setRequestHeader("apikey", key); x.setRequestHeader("Authorization", "Bearer " + key); }
      x.setRequestHeader("x-upsert", "false");
      x.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error("HTTP " + x.status)));
      x.onerror = () => reject(new Error("network"));
      x.send(file);
    });
  }
  const UPLOAD_ERR = { too_big: "This file is over 500 MB. Please ask us for another way to send it.", file_type: "We can't take this kind of file.",
    too_many: "Too many files sent today. Please try again tomorrow.", empty: "This file is empty.", not_allowed: LOCKED, name: NAME_FIRST };

  async function sendFiles(ctx, files, list, jobId, after) {
    const h = ctx.h;
    const link = await writeArgs(ctx, true);
    for (const f of files) {
      const bar = h("i", { class: "dc-prog" });
      const st = h("span", { class: "dc-st", text: "Waiting" });
      const row = h("li", { class: "dc-up" }, h("span", { class: "dc-fn", text: f.name }), h("span", { class: "dc-sz", text: mb(f.size) }), st, h("span", { class: "dc-track" }, bar));
      list.prepend(row);
      if (!link) { row.classList.add("dc-bad"); st.textContent = NAME_FIRST; continue; }
      try {
        const slot = await ctx.rpc("start_upload", Object.assign({ p_client_code: ctx.code, p_file_name: f.name, p_size: f.size, p_job: jobId || null }, link));
        if (!slot || slot.error) { row.classList.add("dc-bad"); st.textContent = UPLOAD_ERR[slot && slot.error] || "This file didn't go. Please try again."; continue; }
        st.textContent = "Sending";
        await putFile(ctx, slot, f, (p) => { bar.style.width = Math.round(p * 100) + "%"; st.textContent = `Sending ${Math.round(p * 100)}%`; });
        bar.style.width = "100%";
        const fin = await ctx.rpc("finish_upload", { p_token: ctx.token || null, p_client_code: ctx.code, p_upload: slot.upload_id });
        if (fin && fin.error) throw new Error(fin.error);
        row.classList.add("dc-done"); st.replaceChildren(icon(ctx, "ok"), " Sent to M7Alpha");
      } catch (e) {
        row.classList.add("dc-bad"); st.textContent = "Didn't go. Please try again.";
      }
    }
    after && after();
  }

  function dropZone(ctx, opts) {
    opts = opts || {};
    const h = ctx.h;
    const input = h("input", { type: "file", multiple: true, class: "dc-hide", tabindex: "-1", "aria-hidden": "true" });
    const list = h("ul", { class: "dc-ups" });
    const go = (files) => { files = Array.from(files || []); if (files.length) sendFiles(ctx, files, list, opts.jobId, opts.after); input.value = ""; };
    input.addEventListener("change", () => go(input.files));
    const btn = h("button", { class: "dc-btn " + (opts.small ? "dc-ghost dc-sm" : "dc-main"), type: "button", onclick: () => input.click() },
      icon(ctx, "up"), opts.label || "Choose files");
    const zone = h("div", { class: "dc-zone" + (opts.small ? " dc-zone-sm" : "") },
      opts.small || (ctx.phone && ctx.phone()) ? null : h("p", { class: "dc-zhint", text: "Drop files here, or choose them." }),
      btn, input, list);
    ["dragenter", "dragover"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add("dc-over"); }));
    ["dragleave", "drop"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove("dc-over"); }));
    zone.addEventListener("drop", (e) => go(e.dataTransfer && e.dataTransfer.files));
    return zone;
  }

  // ---------- the Documents page ----------
  function docTile(doc, ctx, reload) {
    const h = ctx.h;
    const open = () => reader(doc, ctx, { onOpened: () => { if (doc.waiting && doc.ask === "read") ctx.refresh && ctx.refresh(); }, onClose: reload });
    return h("article", { class: "dc-doc" + (doc.waiting ? " dc-waiting" : "") },
      h("button", { class: "dc-thumb", type: "button", "aria-label": "Read " + doc.title, onclick: open },
        doc.thumb ? h("img", { src: ctx.mediaUrl(doc.thumb), alt: "", loading: "lazy", decoding: "async" }) : icon(ctx, "doc")),
      h("div", { class: "dc-info" },
        h("span", { class: "dc-kind", text: (KIND[doc.kind] || "Document") + (doc.page_count ? ` · ${doc.page_count} page${doc.page_count === 1 ? "" : "s"}` : "") }),
        h("h3", { class: "dc-title", text: doc.title }),
        doc.note ? h("p", { class: "dc-note", text: doc.note }) : null,
        doc.waiting ? h("p", { class: "dc-due" + (doc.answer_by && new Date(doc.answer_by + "T23:59:59") < new Date() ? " dc-late" : ""),
          text: dueLine(ctx, doc) }) : null,
        h("p", { class: "dc-date", text: "Added " + day(doc.created_at) + (doc.file_size ? " · " + mb(doc.file_size) : "") }),
        h("div", { class: "dc-row" },
          h("button", { class: "dc-btn dc-main", type: "button", onclick: open }, "Read"),
          h("a", { class: "dc-btn dc-ghost", href: fileUrl(ctx, doc, true), download: doc.file_name || "document.pdf",
            onclick: () => { recordOpen(ctx, doc, "download").catch(() => {}); } },
            icon(ctx, "down"), "Download")),
        fullLink(ctx, doc) ? h("p", { class: "dc-fullrow" }, fullLink(ctx, doc)) : null));
  }

  async function renderClientPage(el, ctx) {
    const h = ctx.h;
    const list = h("div", { class: "dc-list" }, h("p", { class: "dc-wait", text: "Loading your documents..." }));
    const sent = h("ul", { class: "dc-sent" });
    const loadSent = async () => {
      try {
        const r = await call(ctx, "get_uploads", { p_token: ctx.token || null, p_client_code: ctx.code, p_job: null });
        sent.replaceChildren(...(r.uploads || []).slice(0, 12).map((u) => h("li", {},
          h("span", { class: "dc-fn", text: u.file_name }), h("span", { class: "dc-sz", text: [mb(u.size), u.name, day(u.sent_at)].filter(Boolean).join(" · ") }))));
        sentHead.hidden = !(r.uploads || []).length;
      } catch (e) {}
    };
    const sentHead = h("h3", { class: "dc-h3", text: "Sent so far", hidden: true });
    const load = async () => {
      try {
        const r = await call(ctx, "get_documents", { p_token: ctx.token || null, p_client_code: ctx.code });
        const docs = r.documents || [];
        list.replaceChildren(...(docs.length ? docs.map((d) => docTile(d, ctx, load))
          : [h("p", { class: "dc-empty", text: "Nothing here yet. When M7Alpha sends you a proposal, plan, guide or report, it shows here." })]));
      } catch (e) {
        if (String(e.message) === "not_allowed") return locked(ctx, el);
        list.replaceChildren(h("p", { class: "dc-empty", text: "Your documents didn't load. Please refresh the page." }));
      }
    };
    el.replaceChildren(h("section", { class: "dc-page-wrap" },
      h("header", { class: "dc-head" },
        h("h2", { class: "dc-h2", text: "Documents" }),
        h("p", { class: "dc-lede", text: "Proposals, plans, guides and reports from M7Alpha. Tap one to read it here, or download it." })),
      list,
      h("section", { class: "dc-drop", "aria-label": "Send us files" },
        h("h2", { class: "dc-h2", text: "Send us files" }),
        h("p", { class: "dc-lede", text: "Your own photos, videos or news. They go straight to the M7Alpha team." }),
        dropZone(ctx, { after: loadSent }), sentHead, sent)));
    await Promise.all([load(), loadSent()]);
  }

  // what we see, signed in: every document, whether it is shown, its card, and who opened it first and when
  async function renderTeamPage(el, ctx) {
    const h = ctx.h;
    const list = h("div", { class: "dc-list" }, h("p", { class: "dc-wait", text: "Loading..." }));
    const ups = h("ul", { class: "dc-sent" });
    const clientName = (ctx.clients && ctx.clients.find && (ctx.clients.find((c) => c.code === ctx.code) || {}).name) || "The client";
    const act = async (btn, steps, msg) => {
      busy(btn, true);
      try { for (const [fn, args] of steps) await call(ctx, fn, args); ctx.toast(msg); await load(); ctx.refresh && ctx.refresh(); }
      catch (e) { busy(btn, false); ctx.toast("That didn't work: " + e.message); }
    };
    const teamDoc = (d) => {
      const state = d.hidden_at ? "Taken off their pages" : !d.shared_at ? "Not shown to them yet" : d.waiting ? "Card on their Review page, waiting" : d.ask_client_at ? "Card done" : "On their Documents page";
      const date = h("input", { type: "date", class: "dc-date-in", "aria-label": "Answer by", value: d.answer_by_set || "" });
      const ask = (mode) => async (e) => {
        const btn = e.currentTarget;
        const ok = await ctx.confirm(`${clientName} will see this on their Review page${mode === "answer" ? " and be asked for an answer" : ""}.`, mode === "answer" ? "Ask for an answer" : "Ask them to read it");
        if (!ok) return;
        act(btn, [["document_set_ask", { p_id: d.id, p_ask: mode }], ["ask_client", { p_kind: "document", p_id: d.id, p_answer_by: date.value || null }]], "Card is on their Review page");
      };
      const opens = (d.opens || []).map((o) => h("li", {}, `${o.name || "Someone"}: first opened ${when(o.first_opened_at)}` + (o.open_count > 1 ? `, ${o.open_count} times` : "") + (o.downloaded_at ? ", downloaded" : "")));
      const answers = (d.answers || []).map((a) => h("li", {}, `${a.name}${a.shared ? " (shared link)" : ""}:${a.decision === "approve" ? "Looks good" : "Comment"}${a.comment ? " - " + a.comment : ""} (${when(a.created_at)})`));
      return h("article", { class: "dc-doc dc-team" },
        h("button", { class: "dc-thumb", type: "button", "aria-label": "Read " + d.title, onclick: () => reader(d, ctx) },
          d.thumb ? h("img", { src: ctx.mediaUrl(d.thumb), alt: "", loading: "lazy" }) : icon(ctx, "doc")),
        h("div", { class: "dc-info" },
          h("span", { class: "dc-kind", text: (KIND[d.kind] || "Document") + ` · ${d.page_count} page${d.page_count === 1 ? "" : "s"} · version ${d.version}` }),
          h("h3", { class: "dc-title", text: d.title }),
          d.note ? h("p", { class: "dc-note", text: d.note }) : null,
          h("p", { class: "dc-state", text: state + (d.ask_client_at ? ` (asked ${when(d.ask_client_at)}${d.answer_by_set ? ", answer by " + day(d.answer_by_set + "T12:00:00") : ""})` : "") }),
          opens.length ? h("ul", { class: "dc-opens", "aria-label": "Opened by" }, opens) : h("p", { class: "dc-date", text: d.shared_at ? "Not opened yet." : "" }),
          answers.length ? h("ul", { class: "dc-opens", "aria-label": "Answers" }, answers) : null,
          d.full ? h("p", { class: "dc-fullrow" }, fullLink(ctx, d)) : h("p", { class: "dc-date", text: "No full version. A session adds one with panel_docs_admin.py doc-full." }),
          d.full ? ((d.full_downloads || []).length
            ? h("ul", { class: "dc-opens", "aria-label": "Full version downloaded by" }, d.full_downloads.map((f) => h("li", {},
                `${f.name}: first downloaded the full version ${when(f.first_at)}` + (f.count > 1 ? `, ${f.count} times` : ""))))
            : h("p", { class: "dc-date", text: "Full version not downloaded yet." })) : null,
          h("p", { class: "dc-ournote", text: "Only M7Alpha sees who opened it and when." }),
          h("div", { class: "dc-row dc-wrap" },
            !d.shared_at || d.hidden_at
              ? h("button", { class: "dc-btn dc-ghost", type: "button", onclick: async (e) => { const btn = e.currentTarget; if (await ctx.confirm(`${clientName} will see this on their Documents page.`, "Show it")) act(btn, [["document_share", { p_id: d.id, p_on: true }]], "Shown on their Documents page"); } }, "Show on their Documents page")
              : h("button", { class: "dc-btn dc-ghost", type: "button", onclick: (e) => act(e.currentTarget, [["document_share", { p_id: d.id, p_on: false }]], "Taken off their pages") }, "Take it off their pages"),
            d.waiting
              ? h("button", { class: "dc-btn dc-ghost", type: "button", onclick: (e) => act(e.currentTarget, [["document_unask", { p_id: d.id }]], "Card taken back") }, "Take the card back")
              : [h("label", { class: "dc-lab" }, "Answer by ", date),
                 h("button", { class: "dc-btn dc-main", type: "button", onclick: ask("read") }, "Ask them to read it"),
                 h("button", { class: "dc-btn dc-main", type: "button", onclick: ask("answer") }, "Ask for an answer")])));
    };
    async function load() {
      try {
        const r = await call(ctx, "get_documents_team", { p_client_code: ctx.code });
        list.replaceChildren(...((r.documents || []).length ? r.documents.map(teamDoc)
          : [h("p", { class: "dc-empty", text: "No documents for this client yet. A session adds one with panel_docs_admin.py doc-add." })]));
      } catch (e) { list.replaceChildren(h("p", { class: "dc-empty", text: "Documents didn't load: " + e.message })); }
      try {
        const u = await call(ctx, "get_uploads", { p_token: null, p_client_code: ctx.code, p_job: null });
        ups.replaceChildren(...((u.uploads || []).length ? u.uploads.map((x) => h("li", {}, h("span", { class: "dc-fn", text: x.file_name }),
          h("span", { class: "dc-sz", text: [mb(x.size), x.name + (x.shared ? " (shared link)" : ""), when(x.sent_at), x.status === "filed" ? "in Dropbox" : "waiting to go to Dropbox"].filter(Boolean).join(" · ") })))
          : [h("li", { class: "dc-empty", text: "Nothing sent in the last 60 days." })]));
      } catch (e) {}
    }
    el.replaceChildren(h("section", { class: "dc-page-wrap" },
      h("header", { class: "dc-head" }, h("h2", { class: "dc-h2", text: "Documents" }),
        h("p", { class: "dc-lede", text: "What this client can read here. Nothing shows to them until you press a button below." })),
      list,
      h("section", { class: "dc-drop" }, h("h2", { class: "dc-h2", text: "Files they sent us" }), ups)));
    await load();
  }

  // ---------- document cards on the Review page ----------
  async function loadCards(ctx) {
    if (!ctx.token && !ctx.code && !ctx.team) return [];   // shared link too (setup_27)
    try {
      const r = await ctx.rpc("get_document_cards", { p_token: ctx.token || null, p_client_code: ctx.code });
      return r && !r.error ? (r.cards || []) : [];
    } catch (e) { return []; }
  }

  function renderCard(card, el, ctx) {
    const h = ctx.h;
    const doc = Object.assign({}, card.data || {}, { id: card.id, title: card.title, note: card.note, answer_by: card.answer_by, waiting: card.waiting });
    const open = () => reader(doc, ctx, { onOpened: () => { if (doc.ask === "read") ctx.refresh && ctx.refresh(); } });
    const pc = doc.page_count || (doc.pages || []).length;
    el.classList.add("dc-cardhost");
    // The document fills the card like a post's picture does (Lee, 24 Nov 2026: "leaving a lot of empty space instead of
    // filling the frame"): every page at full width, running down the card's own scrolling frame; the words and buttons
    // sit beside it on a laptop and under it on a phone. A tap on a page opens the full-screen reader.
    const pg = doc.pages || [];
    el.replaceChildren(h("div", { class: "dc-card dc-card-full" },
      h("div", { class: "dc-cpages", role: "group", "aria-label": "Pages of " + card.title },
        ...(pg.length ? pg.map((p, i) => h("img", { class: "dc-cpage", src: ctx.mediaUrl(p.path), alt: `Page ${i + 1} of ${pg.length}`, width: p.w, height: p.h,
              loading: i < 2 ? "eager" : "lazy", decoding: "async", onclick: open }))
          : [h("button", { class: "dc-cthumb", type: "button", "aria-label": "Open " + card.title, onclick: open },
              doc.thumb ? h("img", { src: ctx.mediaUrl(doc.thumb), alt: "" }) : icon(ctx, "doc"))])),
      h("div", { class: "dc-cbody" },
        h("span", { class: "dc-kind", text: "Document · " + (KIND[doc.kind] || "Document") + (pc ? ` · ${pc} page${pc === 1 ? "" : "s"}` : "") }),
        h("h3", { class: "dc-title", text: card.title }),
        card.note ? h("p", { class: "dc-note" }, h("b", { text: "From M7Alpha: " }), card.note) : null,
        h("p", { class: "dc-due" + (card.answer_by && new Date(card.answer_by + "T23:59:59") < new Date() ? " dc-late" : ""),
          text: dueLine(ctx, doc) }),
        fullLink(ctx, doc) ? h("p", { class: "dc-fullrow" }, fullLink(ctx, doc)) : null,
        ctx.team ? h("p", { class: "dc-ournote", text: (doc.opens || []).length ? (doc.opens || []).map((o) => `${o.name}: first opened ${when(o.first_opened_at)}`).join(" · ") : "Not opened yet (only we see this)." }) : null,
        h("div", { class: "dc-row" }, h("button", { class: "dc-btn dc-main", type: "button", onclick: open }, "Open full screen")),
        doc.ask === "answer" && isVisitor(ctx) ? answerBox(doc, ctx, null, true) : (doc.ask === "read" && isVisitor(ctx) ? h("p", { class: "dc-hint", text: "This card goes once you've opened it." }) : null))));
  }

  // ---------- the attach button builder 1's task card asks for ----------
  function dropButton(ctx, opts) {
    if (!ctx || ctx.team || !(ctx.token || ctx.code)) return null;    // personal or shared link (setup_27)
    return dropZone(ctx, { small: true, jobId: opts && opts.jobId, label: "Attach files", after: opts && opts.after });
  }

  window.M7Docs = { dropButton, openReader: (doc, ctx) => reader(doc, ctx) };

  (window.StudioPanelsQueue ||= []).push({
    name: "docs",
    type: "Documents",
    page: {
      label: "Documents",
      needsPerson: false,           // setup_27: the shared client link sees Documents too (Lee, 24 Nov 2026)
      render(el, ctx) {
        el.classList.add("dc-pagehost");
        if (ctx.team) return renderTeamPage(el, ctx);
        if (!ctx.token && !ctx.code) return locked(ctx, el);
        return renderClientPage(el, ctx);
      },
    },
    load: loadCards,
    render: renderCard,
  });
})();
