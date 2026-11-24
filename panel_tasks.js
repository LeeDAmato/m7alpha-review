/* Client Studio: Tasks (builder 1, 24 Nov 2026; PANEL_CONTRACT_2026-11-24.md).
   - The Tasks page: a client with a personal link sees their own client's tasks, adds one, picks who it is for and the
     due date, comments, and ticks their own tasks done. From setup_27 (Lee, 24 Nov 2026) the client's shared link does
     the same, with the name typed once on the page (ctx.visitorName() / ctx.askName()); the one-line "personal link"
     gate now shows only when there is no client code at all.
   - Our side of Tasks (signed-in editors): every task, our notes, who has a personal link, and "Put on their Review
     page" (ask_client), which only a signed-in editor can do.
   - Task cards on the Review page: what we need, the answer-by date, a reply box, the drop box button (only when the
     Documents panel offers it) and Done. Same stored task as the Tasks page, so Done in either place clears both.
   Every read and write goes through database functions that check the link first (setup_24_tasks_people.sql).
   One global: window.M7Tasks. Classes start with tk-. Browser keys start with m7r-tk:. */
(function () {
  "use strict";
  const TEAM_NAMES = ["Lee", "Maurice", "M7Alpha"];
  const st = { tasks: null, people: [], open: new Set(), adding: false, showDone: false, err: null, team: null, busy: false };

  // ---------- small helpers ----------
  const skey = (k) => "m7r-tk:" + k;
  const sget = (k, d) => { try { const v = localStorage.getItem(skey(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const sset = (k, v) => { try { localStorage.setItem(skey(k), JSON.stringify(v)); } catch (e) {} };
  function dayDiff(d) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(d + "T00:00:00") - t) / 864e5);
  }
  function dueText(d) {
    if (!d) return "";
    const n = dayDiff(d), dt = new Date(d + "T12:00:00");
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    if (n === -1) return "Yesterday";
    if (n > 1 && n < 7) return dt.toLocaleDateString("en-GB", { weekday: "long" });
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(dt.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
  }
  // "Please answer by Thursday 27 Nov" / "Answer was due Thursday 27 Nov" (the host's own, when it gives one)
  function answerBy(ctx, d) {
    if (!d) return "";
    if (typeof ctx.fmtAnswerBy === "function") { try { const s = ctx.fmtAnswerBy(d); if (s) return s; } catch (e) {} }
    const dt = new Date(d + "T12:00:00");
    const day = dt.toLocaleDateString("en-GB", { weekday: "long" }) + " " + dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return dayDiff(d) < 0 ? "Answer was due " + day : "Please answer by " + day;
  }
  const when = (iso) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const initials = (n) => (n || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const clientName = (ctx) => {
    const c = (ctx.clients || []).find((x) => (x.code || x.link_code) === ctx.code);
    return ctx.clientName || c?.name || "the client";
  };
  async function call(ctx, fn, args) {
    const r = await ctx.rpc(fn, args);
    if (r && r.error) { const e = new Error(r.error); e.code = r.error; throw e; }
    return r;
  }
  const say = (ctx, text) => { try { ctx.toast(text); } catch (e) {} };
  const NAME_FIRST = "Please type your name first, so M7Alpha knows who it's from.";
  const sorry = (ctx, e) => say(ctx, e && e.code === "not_allowed"
    ? "This link no longer opens your tasks. Please ask M7Alpha for your link."
    : e && e.code === "name" ? NAME_FIRST
    : "That didn't save. Please check your connection and try again.");
  // setup_27 (Lee, 24 Nov 2026: "shared link is the same as personal link"): a personal link (ctx.token) or the
  // client's shared link (ctx.code only) both open Tasks. Reads send p_token null on the shared link.
  const canSee = (ctx) => !!(ctx.token || ctx.code);
  const typedName = (ctx) => {
    try { const n = typeof ctx.visitorName === "function" ? ctx.visitorName() : ctx.reviewerName; return String(n || "").trim(); } catch (e) { return ""; }
  };
  // Link arguments for a write. Personal link: exactly as before. Shared link: p_token null plus p_name, the name typed
  // once on the page; if none yet the page is asked (ctx.askName()). Throws code "name" when there is still none.
  async function writeArgs(ctx) {
    if (ctx.token) return { p_token: ctx.token };
    let n = typedName(ctx);
    if (!n && typeof ctx.askName === "function") { try { n = String((await ctx.askName()) || "").trim(); } catch (e) { n = ""; } }
    if (!n) { const e = new Error("name"); e.code = "name"; throw e; }
    return { p_token: null, p_name: n };
  }
  async function write(ctx, fn, args) { return call(ctx, fn, Object.assign({ p_client_code: ctx.code }, args, await writeArgs(ctx))); }
  const TICK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.4 3 3 6-6.4"/></svg>';
  const btn = (ctx, label, cls, onclick, extra = {}) => ctx.h("button", { type: "button", class: "tk-btn " + (cls || ""), onclick, ...extra }, label);

  // ---------- the shared client link: one line, and "I lost my link" ----------
  function needPerson(el, ctx) {
    const h = ctx.h;
    const msg = h("p", { class: "tk-hint", "aria-live": "polite" });
    const box = h("div", { class: "tk-lost", hidden: true });
    const email = h("input", { type: "email", class: "tk-input", placeholder: "Your email address", "aria-label": "Your email address", autocomplete: "email", maxlength: "200" });
    const send = btn(ctx, "Tell M7Alpha", "tk-primary", async () => {
      const v = email.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { msg.textContent = "Please type your email address."; email.focus(); return; }
      send.disabled = true; msg.textContent = "Sending…";
      try {
        await ctx.rpc("studio_lost_link", { p_client_code: ctx.code, p_email: v });
        box.hidden = true; lost.hidden = true;
        msg.textContent = "Thank you. Ask M7Alpha, we'll send it again.";
      } catch (e) { send.disabled = false; msg.textContent = "That didn't go through. Please ask M7Alpha for your link."; }
    });
    box.append(h("label", { class: "tk-lab", text: "Type the email we have for you. We'll let the team know." }), email, h("div", { class: "tk-row" }, send));
    const lost = h("button", { type: "button", class: "tk-link", text: "I lost my link", onclick: () => { box.hidden = false; lost.hidden = true; email.focus(); } });
    el.replaceChildren(h("div", { class: "tk-page" }, h("div", { class: "tk-box tk-gate" },
      h("p", { class: "tk-gatep", text: "Open your personal link to see this. Lost it? Ask M7Alpha." }), lost, box, msg)));
  }

  // ---------- the client's Tasks page ----------
  async function loadClient(ctx) {
    const r = await call(ctx, "studio_tasks", { p_token: ctx.token || null, p_client_code: ctx.code });
    st.tasks = r.tasks || []; st.people = r.people || []; st.err = null;
  }
  function renderClient(el, ctx) {
    const h = ctx.h;
    if (!canSee(ctx)) return needPerson(el, ctx);
    if (!el.querySelector(".tk-page")) el.replaceChildren(h("div", { class: "tk-page" }, h("p", { class: "tk-hint", text: "Loading your tasks…" })));
    st.showDone = sget("done", false);
    loadClient(ctx).then(() => drawClient(el, ctx), (e) => {
      el.replaceChildren(h("div", { class: "tk-page" }, h("div", { class: "tk-box tk-gate" },
        h("p", { class: "tk-gatep", text: e.code === "not_allowed" ? "This link no longer opens your tasks. Lost it? Ask M7Alpha." : "Your tasks didn't load. Please check your connection and try again." }),
        e.code === "not_allowed" ? null : btn(ctx, "Try again", "tk-primary", () => renderClient(el, ctx)))));
    });
  }
  function drawClient(el, ctx) {
    const h = ctx.h, tasks = st.tasks || [], name = clientName(ctx);
    const open = tasks.filter((t) => !t.done), done = tasks.filter((t) => t.done);
    const yours = open.filter((t) => t.for_client), ours = open.filter((t) => !t.for_client);
    const late = open.filter((t) => t.due_on && dayDiff(t.due_on) < 0).length;
    const sec = (title, sub, list, empty) => h("section", { class: "tk-sec" },
      h("div", { class: "tk-sechead" }, h("h2", { text: title }), h("span", { class: "tk-n", text: list.length || "" })),
      sub ? h("p", { class: "tk-sub", text: sub }) : null,
      h("div", { class: "tk-list" }, list.length ? list.map((t) => clientRow(t, el, ctx)) : h("p", { class: "tk-empty", text: empty })));
    const page = h("div", { class: "tk-page" },
      h("div", { class: "tk-head" },
        h("div", {}, h("h1", { class: "tk-h1", text: "Tasks" }),
          h("p", { class: "tk-lede", text: `${open.length} open for ${name}${late ? `, ${late} late` : ""}. Add a task for us, or for someone on your side.` })),
        st.adding ? null : btn(ctx, "+ Add a task", "tk-primary", () => { st.adding = true; drawClient(el, ctx); })),
      st.adding ? addForm(el, ctx) : null,
      sec("Your side", "Things we need from you.", yours, "Nothing waits on you right now."),
      sec("With M7Alpha", "Things we're doing for you.", ours, "Nothing open with us right now."),
      done.length ? h("section", { class: "tk-sec" },
        h("button", { type: "button", class: "tk-link", "aria-expanded": String(st.showDone),
          text: st.showDone ? `Hide done (${done.length})` : `Show done (${done.length})`,
          onclick: () => { st.showDone = !st.showDone; sset("done", st.showDone); drawClient(el, ctx); } }),
        st.showDone ? h("div", { class: "tk-list" }, done.map((t) => clientRow(t, el, ctx))) : null) : null);
    el.replaceChildren(page);
    page.querySelector(".tk-add input")?.focus();
  }
  function clientRow(t, el, ctx) {
    const h = ctx.h, isOpen = st.open.has(t.id), n = (t.comments || []).length;
    const late = !t.done && t.due_on && dayDiff(t.due_on) < 0;
    const tick = t.can_tick
      ? h("button", { type: "button", class: "tk-tick" + (t.done ? " on" : ""), html: TICK, "aria-label": t.done ? "Mark as not done" : "Mark as done", title: t.done ? "Mark as not done" : "Mark as done",
          onclick: () => setDone(t, !t.done, el, ctx) })
      : h("span", { class: "tk-tick tk-ours" + (t.done ? " on" : ""), html: TICK, title: t.done ? "Done" : "M7Alpha ticks this one" });
    const row = h("div", { class: "tk-task" + (t.done ? " done" : "") + (isOpen ? " open" : ""), "data-task": t.id },
      h("div", { class: "tk-line" }, tick,
        h("button", { type: "button", class: "tk-name", "aria-expanded": String(isOpen), onclick: () => { isOpen ? st.open.delete(t.id) : st.open.add(t.id); drawClient(el, ctx); } },
          h("span", { class: "tk-t", text: t.title }),
          h("span", { class: "tk-meta" },
            t.assignee ? h("span", { class: "tk-who" }, h("i", { class: "tk-av" + (t.for_client ? " cl" : ""), text: initials(t.assignee) }), t.for_me ? "You" : t.assignee) : h("span", { class: "tk-who", text: "Nobody yet" }),
            t.due_on ? h("span", { class: "tk-due" + (late ? " late" : dayDiff(t.due_on) === 0 && !t.done ? " today" : ""), text: (late ? "Was due " : "Due ") + dueText(t.due_on) }) : null,
            n ? h("span", { class: "tk-c", text: n + (n === 1 ? " comment" : " comments") }) : null,
            t.asked ? h("span", { class: "tk-tag", text: "On your Review page" }) : null))));
    if (isOpen) row.append(detail(t, el, ctx, () => drawClient(el, ctx)));
    return row;
  }
  function detail(t, el, ctx, redraw) {
    const h = ctx.h;
    const ta = h("textarea", { class: "tk-input", rows: "3", placeholder: "Write a comment for M7Alpha", "aria-label": "Write a comment", maxlength: "5000" });
    ta.value = sget("draft:" + t.id, "");
    ta.addEventListener("input", () => sset("draft:" + t.id, ta.value || null));
    const send = btn(ctx, "Send", "tk-primary", async () => {
      const body = ta.value.trim(); if (!body) { ta.focus(); return; }
      send.disabled = true;
      try {
        const r = await write(ctx, "studio_task_comment", { p_job: t.id, p_body: body });
        (t.comments ||= []).push(r.comment); sset("draft:" + t.id, null); say(ctx, "Sent. M7Alpha has your comment."); redraw();
      } catch (e) { send.disabled = false; sorry(ctx, e); }
    });
    return h("div", { class: "tk-detail" },
      t.notes ? h("p", { class: "tk-notes", text: t.notes }) : null,
      h("p", { class: "tk-small", text: "Added by " + (t.added_by || "M7Alpha") + " · " + when(t.created_at) + (t.done_at ? " · done " + when(t.done_at) : "") }),
      h("div", { class: "tk-cs" }, (t.comments || []).map((c) => h("div", { class: "tk-cm" },
        h("i", { class: "tk-av" + (TEAM_NAMES.includes(c.author) ? "" : " cl"), text: initials(c.author) }),
        h("div", {}, h("div", { class: "tk-cmh" }, h("b", { text: c.author }), h("small", { text: when(c.created_at) })), h("p", { text: c.body }))))),
      ta, h("div", { class: "tk-row" }, send,
        t.can_tick ? btn(ctx, t.done ? "Mark as not done" : "Done", "", () => setDone(t, !t.done, el, ctx)) : null));
  }
  async function setDone(t, done, el, ctx) {
    if (done && !(await ctx.confirm(`Mark “${t.title}” as done?`, "Yes, it's done"))) return;
    try {
      const r = await write(ctx, "studio_task_done", { p_job: t.id, p_done: done });
      Object.assign(t, r.task); say(ctx, done ? "Marked as done. Thank you!" : "Marked as not done.");
      drawClient(el, ctx); try { ctx.refresh(); } catch (e) {}
    } catch (e) { sorry(ctx, e); }
  }
  function addForm(el, ctx) {
    const h = ctx.h;
    const title = h("input", { type: "text", class: "tk-input", placeholder: "What needs doing? e.g. Send the new price list", "aria-label": "The task", maxlength: "300" });
    const notes = h("textarea", { class: "tk-input", rows: "3", placeholder: "Anything else we should know (optional)", "aria-label": "Details", maxlength: "5000" });
    const who = h("select", { class: "tk-input", "aria-label": "Who is it for?" },
      h("option", { value: "m7alpha", text: "M7Alpha" }),
      st.people.map((p) => h("option", { value: p.id, text: p.me ? p.name + " (you)" : p.name })));
    const due = h("input", { type: "date", class: "tk-input", "aria-label": "Due date" });
    const msg = h("p", { class: "tk-hint", "aria-live": "polite" });
    const save = btn(ctx, "Add the task", "tk-primary", async () => {
      if (!title.value.trim()) { msg.textContent = "Please write the task."; title.focus(); return; }
      save.disabled = true; msg.textContent = "Saving…";
      try {
        const r = await write(ctx, "studio_task_add", { p_title: title.value.trim(),
          p_notes: notes.value.trim() || null, p_for: who.value, p_due: due.value || null });
        if (!r.again) st.tasks.push(r.task);
        st.adding = false; say(ctx, "Added. M7Alpha can see it now."); drawClient(el, ctx);
      } catch (e) { save.disabled = false; msg.textContent = e.code === "title" ? "Please write the task." : e.code === "date" ? "Please pick a date from today on." : e.code === "name" ? NAME_FIRST : "That didn't save. Please check your connection and try again."; }
    });
    title.addEventListener("keydown", (e) => { if (e.key === "Escape") { st.adding = false; drawClient(el, ctx); } });
    return h("div", { class: "tk-box tk-add" },
      h("label", { class: "tk-lab", text: "The task" }), title,
      h("label", { class: "tk-lab", text: "Details" }), notes,
      h("div", { class: "tk-two" },
        h("label", { class: "tk-lab" }, "Who is it for?", who),
        h("label", { class: "tk-lab" }, "Due date", due)),
      h("div", { class: "tk-row" }, save, btn(ctx, "Cancel", "", () => { st.adding = false; drawClient(el, ctx); })), msg);
  }

  // ---------- our side of Tasks (signed-in editors) ----------
  async function loadTeam(ctx) {
    const r = await call(ctx, "studio_tasks_team", { p_client_code: ctx.code });
    st.team = r;
  }
  function renderTeam(el, ctx) {
    const h = ctx.h;
    if (!el.querySelector(".tk-page")) el.replaceChildren(h("div", { class: "tk-page" }, h("p", { class: "tk-hint", text: "Loading the tasks…" })));
    loadTeam(ctx).then(() => drawTeam(el, ctx), (e) => el.replaceChildren(h("div", { class: "tk-page" }, h("div", { class: "tk-box tk-gate" },
      h("p", { class: "tk-gatep", text: "The tasks didn't load: " + (e.message || e) }), btn(ctx, "Try again", "tk-primary", () => renderTeam(el, ctx))))));
  }
  function drawTeam(el, ctx) {
    const h = ctx.h, d = st.team || {}, tasks = d.tasks || [], people = d.people || [], name = clientName(ctx);
    const open = tasks.filter((t) => !t.done_at), done = tasks.filter((t) => t.done_at);
    const asked = open.filter((t) => t.ask_client_at).length;
    const inp = h("input", { type: "text", class: "tk-input", placeholder: "Write a task, then press Enter", "aria-label": "New task", maxlength: "300" });
    inp.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter" || !inp.value.trim()) return;
      const title = inp.value.trim(); inp.disabled = true;
      try { await call(ctx, "studio_task_team_save", { p_client_code: ctx.code, p_id: null, p_patch: { title } }); await loadTeam(ctx); drawTeam(el, ctx); el.querySelector(".tk-tadd input")?.focus(); }
      catch (err) { inp.disabled = false; say(ctx, "That task didn't save: " + err.message); }
    });
    const page = h("div", { class: "tk-page tk-teamside" },
      h("div", { class: "tk-head" }, h("div", {}, h("h1", { class: "tk-h1", text: "Tasks" }),
        h("p", { class: "tk-lede", text: `${open.length} open, ${asked} on ${name}'s Review page. ${name} sees every task not marked "ours only", never our notes or time taken.` }))),
      h("div", { class: "tk-box tk-people" },
        h("b", { text: "People with a personal link" }),
        people.length ? h("ul", {}, people.map((p) => h("li", {},
          h("i", { class: "tk-av cl", text: initials(p.name) }), h("span", { class: "tk-pn", text: p.name }),
          h("small", { text: (p.link_on ? "link on" : "link off") + " · " + (p.last_seen_at ? "last seen " + when(p.last_seen_at) : "not opened yet") }))))
          : h("p", { class: "tk-hint", text: "Nobody yet. Add someone with panel_tasks_admin.py person-add, then print their link with person-link." })),
      h("div", { class: "tk-box tk-tadd" }, inp),
      h("div", { class: "tk-list" }, open.length ? open.map((t) => teamRow(t, el, ctx)) : h("p", { class: "tk-empty", text: "No open tasks." })),
      done.length ? h("button", { type: "button", class: "tk-link", text: st.showDone ? `Hide done (${done.length})` : `Show done (${done.length})`, onclick: () => { st.showDone = !st.showDone; drawTeam(el, ctx); } }) : null,
      st.showDone ? h("div", { class: "tk-list" }, done.map((t) => teamRow(t, el, ctx))) : null,
      (d.events || []).length ? h("div", { class: "tk-box tk-events" }, h("b", { text: "Latest from " + name }),
        h("ul", {}, d.events.slice(0, 6).map((e) => h("li", {}, h("small", { text: when(e.created_at) }), " ", e.summary || e.kind)))) : null);
    el.replaceChildren(page);
  }
  function teamRow(t, el, ctx) {
    const h = ctx.h, d = st.team, isOpen = st.open.has(t.id), name = clientName(ctx);
    const save = async (patch, ok) => {
      try { await call(ctx, "studio_task_team_save", { p_client_code: ctx.code, p_id: t.id, p_patch: patch }); await loadTeam(ctx); drawTeam(el, ctx); if (ok) say(ctx, ok); }
      catch (e) { say(ctx, "That didn't save: " + e.message); }
    };
    const who = h("select", { class: "tk-input tk-sm", "aria-label": "Who is it for" },
      h("option", { value: "", text: "Nobody yet" }),
      h("optgroup", { label: "M7Alpha" }, TEAM_NAMES.map((n) => h("option", { value: n, text: n, selected: !t.for_person && t.assignee === n }))),
      (d.people || []).length ? h("optgroup", { label: name }, d.people.map((p) => h("option", { value: p.id, text: p.name, selected: t.for_person === p.id }))) : null);
    who.addEventListener("change", () => save({ for: who.value }));
    const due = h("input", { type: "date", class: "tk-input tk-sm", "aria-label": "Due date", value: t.due_on || "" });
    due.addEventListener("change", () => save({ due_on: due.value || "" }));
    let askBtn = null;
    if (!t.done_at && t.client_sees && t.for_person) {
      askBtn = t.ask_client_at
        ? btn(ctx, "Take off their Review page", "", async () => {
            if (!(await ctx.confirm(`Take “${t.title}” off ${name}'s Review page? It stays on their Tasks page.`, "Take it off"))) return;
            try { await call(ctx, "studio_task_unask", { p_id: t.id }); await loadTeam(ctx); drawTeam(el, ctx); } catch (e) { say(ctx, "That didn't save: " + e.message); }
          })
        : btn(ctx, "Put on their Review page", "tk-primary", async () => {
            const by = t.due_on ? " Answer by " + dueText(t.due_on) + "." : "";
            if (!(await ctx.confirm(`${name} will see this. Put “${t.title}” on their Review page as a card for ${t.assignee}?${by}`, "Put it on"))) return;
            try { await call(ctx, "ask_client", { p_kind: "task", p_id: t.id, p_answer_by: t.due_on || null }); await loadTeam(ctx); drawTeam(el, ctx);
                  say(ctx, `On ${name}'s Review page now. Their session will give you a reminder to send.`); }
            catch (e) { say(ctx, "That didn't save: " + e.message); }
          });
    }
    const row = h("div", { class: "tk-task" + (t.done_at ? " done" : "") + (isOpen ? " open" : ""), "data-task": t.id },
      h("div", { class: "tk-line" },
        h("button", { type: "button", class: "tk-tick" + (t.done_at ? " on" : ""), html: TICK, "aria-label": t.done_at ? "Mark as not done" : "Mark as done", onclick: () => save({ done: !t.done_at }) }),
        h("button", { type: "button", class: "tk-name", "aria-expanded": String(isOpen), onclick: () => { isOpen ? st.open.delete(t.id) : st.open.add(t.id); drawTeam(el, ctx); } },
          h("span", { class: "tk-t", text: t.title }),
          h("span", { class: "tk-meta" },
            t.client_sees ? h("span", { class: "tk-tag sees", text: name + " sees it" }) : h("span", { class: "tk-tag ours", text: "Ours only" }),
            t.ask_client_at && !t.done_at ? h("span", { class: "tk-tag asked", text: "On their Review page" }) : null,
            t.added_by && !TEAM_NAMES.includes(t.added_by) && (t.added_by_person || t.added_via === "shared") ? h("span", { class: "tk-small", text: "added by " + t.added_by + (t.added_via === "shared" ? " (shared link)" : "") }) : null,
            (t.comments || []).length ? h("span", { class: "tk-c", text: t.comments.length + (t.comments.length === 1 ? " comment" : " comments") }) : null)),
        h("span", { class: "tk-ctl" }, who, due)));
    if (isOpen) {
      const notes = h("textarea", { class: "tk-input", rows: "2", placeholder: "Description, as the client will read it", "aria-label": "Description" }); notes.value = t.notes || "";
      notes.addEventListener("change", () => save({ notes: notes.value }, "Saved"));
      const tnote = h("textarea", { class: "tk-input", rows: "2", placeholder: "Our own notes, never shown to the client", "aria-label": "Team note" }); tnote.value = t.team_note || "";
      tnote.addEventListener("change", () => save({ team_note: tnote.value }, "Saved"));
      const sees = h("input", { type: "checkbox", checked: !!t.client_sees });
      sees.addEventListener("change", () => save({ client_sees: sees.checked }));
      const cbox = h("textarea", { class: "tk-input", rows: "2", placeholder: "Write a comment", "aria-label": "Write a comment", maxlength: "5000" });
      const teamOnly = h("input", { type: "checkbox" });
      const send = btn(ctx, "Comment", "tk-primary", async () => {
        if (!cbox.value.trim()) { cbox.focus(); return; }
        try { await call(ctx, "studio_task_team_comment", { p_id: t.id, p_body: cbox.value.trim(), p_internal: teamOnly.checked }); await loadTeam(ctx); drawTeam(el, ctx); }
        catch (e) { say(ctx, "That comment didn't save: " + e.message); }
      });
      row.append(h("div", { class: "tk-detail" },
        askBtn ? h("div", { class: "tk-row" }, askBtn) : (!t.done_at && t.client_sees && !t.for_person ? h("p", { class: "tk-hint", text: `To put it on ${name}'s Review page, choose one of their people above.` }) : null),
        h("label", { class: "tk-lab" }, "Description", notes),
        h("label", { class: "tk-check" }, sees, ` ${name} sees this task`),
        h("div", { class: "tk-ourbox" }, h("label", { class: "tk-lab" }, "Our notes (never shown to the client)", tnote)),
        h("div", { class: "tk-cs" }, (t.comments || []).map((c) => h("div", { class: "tk-cm" + (c.internal ? " int" : "") },
          h("i", { class: "tk-av" + (TEAM_NAMES.includes(c.author) ? "" : " cl"), text: initials(c.author) }),
          h("div", {}, h("div", { class: "tk-cmh" }, h("b", { text: c.author }), h("small", { text: when(c.created_at) }), c.internal ? h("span", { class: "tk-tag ours", text: "Team only" }) : null, c.via === "shared" ? h("span", { class: "tk-small", text: "shared link" }) : null), h("p", { text: c.body }))))),
        cbox, h("div", { class: "tk-row" }, send, h("label", { class: "tk-check" }, teamOnly, " Team only"))));
    } else if (askBtn) row.querySelector(".tk-meta").after(h("span", { class: "tk-askrow" }, askBtn));
    return row;
  }

  // ---------- task cards on the Review page ----------
  async function loadCards(ctx) {
    if (!canSee(ctx)) return [];   // shared link too (setup_27)
    try { const r = await call(ctx, "get_task_cards", { p_token: ctx.token || null, p_client_code: ctx.code }); return r.cards || []; }
    catch (e) { return []; }
  }
  function renderCard(card, el, ctx) {
    const h = ctx.h, t = card.data || {}, late = card.answer_by && dayDiff(card.answer_by) < 0;
    const ta = h("textarea", { class: "tk-input", rows: "3", placeholder: "Reply to M7Alpha", "aria-label": "Reply to M7Alpha", maxlength: "5000" });
    ta.value = sget("draft:" + card.id, "");
    ta.addEventListener("input", () => sset("draft:" + card.id, ta.value || null));
    const msg = h("p", { class: "tk-hint", "aria-live": "polite" });
    const list = h("div", { class: "tk-cs" });
    const drawComments = () => list.replaceChildren(...(t.comments || []).slice(-4).map((c) => h("div", { class: "tk-cm" },
      h("i", { class: "tk-av" + (TEAM_NAMES.includes(c.author) ? "" : " cl"), text: initials(c.author) }),
      h("div", {}, h("div", { class: "tk-cmh" }, h("b", { text: c.author }), h("small", { text: when(c.created_at) })), h("p", { text: c.body })))));
    drawComments();
    const reply = btn(ctx, "Send reply", "", async () => {
      const body = ta.value.trim(); if (!body) { ta.focus(); return; }
      reply.disabled = true; msg.textContent = "Sending…";
      try {
        const r = await write(ctx, "studio_task_comment", { p_job: card.id, p_body: body });
        (t.comments ||= []).push(r.comment); ta.value = ""; sset("draft:" + card.id, null); drawComments();
        msg.textContent = "Sent. M7Alpha has your reply."; reply.disabled = false;
      } catch (e) { reply.disabled = false; msg.textContent = ""; sorry(ctx, e); }
    });
    const done = btn(ctx, "Done", "tk-primary tk-done", async () => {
      if (!(await ctx.confirm(`Mark “${card.title}” as done? It leaves your Review page and shows as done on Tasks.`, "Yes, it's done"))) return;
      done.disabled = true;
      try {
        const extra = ta.value.trim();
        if (extra) { await write(ctx, "studio_task_comment", { p_job: card.id, p_body: extra }); sset("draft:" + card.id, null); }
        await write(ctx, "studio_task_done", { p_job: card.id, p_done: true });
        say(ctx, "Done. Thank you!"); try { ctx.refresh(); } catch (e) {}
      } catch (e) { done.disabled = false; sorry(ctx, e); }
    });
    let attach = null;
    try { if (window.M7Docs && typeof window.M7Docs.dropButton === "function") attach = window.M7Docs.dropButton(ctx, { jobId: card.id }); } catch (e) { attach = null; }
    el.classList.add("tk-cardhost");
    el.replaceChildren(h("article", { class: "tk-card", "data-task": card.id },
      h("div", { class: "tk-eyebrow" }, h("span", { class: "tk-dot" }), t.for_me ? "A task for you" : "A task for " + (t.assignee || "your team")),
      h("h2", { class: "tk-ctitle", text: card.title }),
      card.note ? h("p", { class: "tk-notes", text: card.note }) : null,
      card.answer_by ? h("p", { class: "tk-by" + (late ? " late" : ""), text: answerBy(ctx, card.answer_by) }) : null,
      (t.comments || []).length ? h("div", { class: "tk-sub", text: "Messages" }) : null, list,
      ta, h("div", { class: "tk-row" }, reply, attach, h("span", { class: "tk-sp" }), done), msg,
      h("button", { type: "button", class: "tk-link", text: "See all your tasks", onclick: () => { try { ctx.open("tasks"); } catch (e) {} } })));
  }

  // ---------- the page, and the registration ----------
  function renderPage(el, ctx) {
    if (ctx.team && !ctx.clientView) return renderTeam(el, ctx);
    return renderClient(el, ctx);
  }
  window.M7Tasks = {
    needPerson,                   // the one line for the shared link, with "I lost my link": other panels may reuse it
    answerBy: (d, ctx) => answerBy(ctx || {}, d),
    _state: st,
  };
  (window.StudioPanelsQueue ||= []).push({
    name: "tasks",
    type: "Tasks",
    page: { label: "Tasks", needsPerson: false, render: renderPage },   // setup_27: the shared link sees Tasks too
    load: loadCards,
    render: renderCard,
  });
})();
