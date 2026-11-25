/* Client Studio: the Brand page (builder 4, 25 Nov 2026). HELPERS_CONTRACT_new_pages_2026-11-25.md, page "brand".
   Plugs in through window.StudioPanelsQueue (PANEL_CONTRACT_2026-11-24.md, section 4). Needs setup_32 and setup_35.
   One global only: window.M7Brand. CSS classes start with br-. Nothing is saved on the device.
   The page shows the client's brand record exactly as the client's session filled it (panel_brand_admin.py) and nothing
   else: a part with nothing in it is left out, never filled with a guess. The full guide lives in the client's Figma
   file, Brand page; the page links to it. Data comes only from get_brand, which the database lets through for a
   signed-in editor or a personal link with the Brand page switched on (never a shared link). */
(function () {
  "use strict";
  if (window.M7Brand) return;

  const ICON = {
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" fill="none" stroke="currentColor" stroke-width="1.9"/></svg>',
    tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  };
  const HEX = /^#[0-9a-f]{6}$/i;
  const FIGMA = /^https:\/\/(www\.)?figma\.com\//;

  const txt = (v) => (typeof v === "string" ? v.trim() : "");
  const has = (v) => Array.isArray(v) && v.length > 0;
  function ic(h, name) { const s = h("span", { class: "br-ic" }); s.innerHTML = ICON[name]; return s; }
  function kb(n) { return !n ? "" : n < 1048576 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1048576).toFixed(1) + " MB"; }
  function ext(name) { const m = /\.([a-z0-9]{1,5})$/i.exec(name || ""); return m ? m[1].toUpperCase() : "File"; }
  function isPicture(f) { return /^image\//.test(f.ctype || "") || /\.(png|jpe?g|webp|svg)$/i.test(f.file_name || ""); }
  function fileUrl(ctx, path) { return path ? ctx.mediaUrl(path) : ""; }
  function downloadUrl(ctx, f) { return fileUrl(ctx, f.file_path) + "?download=" + encodeURIComponent(f.file_name || "file"); }
  // light or dark words on a colour swatch (relative brightness)
  function onColour(hex) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return L > 0.36 ? "br-on-light" : "br-on-dark";
  }
  function weightOf(style) { const m = /\b([1-9]00)\b/.exec(style || ""); if (m) return m[1];
    const s = (style || "").toLowerCase(); return /extra ?bold|heavy|black/.test(s) ? "800" : /semi ?bold/.test(s) ? "600" : /bold/.test(s) ? "700" : /medium/.test(s) ? "500" : /light/.test(s) ? "300" : "400"; }
  function lines(h, text, cls) {
    const parts = txt(text).split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return h("ul", { class: "br-lines " + (cls || "") }, parts.map((p) => h("li", { text: p })));
    return parts.length ? h("p", { class: "br-text " + (cls || ""), text: parts[0] }) : null;
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
    try { const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch (e) { return false; }
  }

  // ---------- a bigger look at a picture ----------
  function lightbox(ctx, f) {
    const h = ctx.h, prev = document.activeElement;
    const close = () => { box.remove(); document.removeEventListener("keydown", key); prev?.focus?.(); };
    const key = (e) => { if (e.key === "Escape") close(); };
    const box = h("div", { class: "br-lb", role: "dialog", "aria-modal": "true", "aria-label": f.title || "Picture", onclick: (e) => { if (e.target === box) close(); } },
      h("figure", { class: "br-lb-fig" },
        h("img", { src: fileUrl(ctx, f.file_path), alt: f.title || "" }),
        h("figcaption", {}, h("b", { text: f.title || "" }), f.note ? h("span", { text: f.note }) : null)),
      h("button", { type: "button", class: "br-lb-x", "aria-label": "Close", onclick: close }, ic(h, "x")));
    document.body.append(box); document.addEventListener("keydown", key); box.querySelector(".br-lb-x").focus();
  }

  // ---------- the parts ----------
  function section(h, id, title, intro, ...body) {
    const kids = body.flat().filter(Boolean);
    if (!kids.length && !txt(intro)) return null;
    return h("section", { class: "br-sec", id: "br-" + id, "aria-labelledby": "br-h-" + id },
      h("h3", { class: "br-h3", id: "br-h-" + id, text: title }), lines(h, intro, "br-intro"), ...kids);
  }

  function logoPart(ctx, files, intro) {
    const h = ctx.h;
    const logos = files.filter((f) => f.kind === "logo");
    return section(h, "logo", "Logo", intro, logos.length ? h("div", { class: "br-logos" }, logos.map((f) =>
      h("figure", { class: "br-logo" },
        h("div", { class: "br-logo-show" }, isPicture(f) ? h("img", { src: fileUrl(ctx, f.preview_path || f.file_path), alt: f.title || "Logo", loading: "lazy" }) : ic(h, "file")),
        h("figcaption", { class: "br-logo-cap" },
          h("b", { class: "br-name", text: f.title || f.file_name }),
          f.note ? h("span", { class: "br-small", text: f.note }) : null,
          h("a", { class: "br-btn br-ghost br-sm", href: downloadUrl(ctx, f), download: f.file_name || "", target: "_blank", rel: "noopener" },
            ic(h, "down"), `Download ${ext(f.file_name)}`, f.file_size ? h("span", { class: "br-kb", text: kb(f.file_size) }) : null))))) : null);
  }

  function colourPart(ctx, colours, intro) {
    const h = ctx.h;
    const ok = (colours || []).filter((c) => HEX.test(txt(c.hex)));
    return section(h, "colours", "Colours", intro, ok.length ? h("div", { class: "br-swatches" }, ok.map((c) => {
      const hex = c.hex.toUpperCase();
      const b = h("button", { type: "button", class: "br-swatch", "aria-label": `Copy ${c.name || ""} ${hex}`.replace(/\s+/g, " "), title: "Tap to copy the code" },
        h("span", { class: "br-chip " + onColour(hex), style: `background:${hex}` }, h("span", { class: "br-copyhint" }, ic(h, "copy"), h("span", { class: "br-copied", text: "Copy" }))),
        h("span", { class: "br-sw-body" },
          h("b", { class: "br-name", text: c.name || hex }),
          h("code", { class: "br-hex", text: hex }),
          c.use ? h("span", { class: "br-small", text: c.use }) : null));
      b.addEventListener("click", async () => {
        const done = await copyText(hex);
        const lab = b.querySelector(".br-copied");
        if (done) { lab.textContent = "Copied"; b.classList.add("br-did"); setTimeout(() => { lab.textContent = "Copy"; b.classList.remove("br-did"); }, 1600); }
        ctx.toast?.(done ? `Copied ${hex}` : `The code is ${hex}`);
      });
      return b;
    })) : null);
  }

  function fontPart(ctx, fonts, intro) {
    const h = ctx.h;
    const ok = (fonts || []).filter((f) => txt(f.name));
    return section(h, "fonts", "Fonts", intro, ok.length ? h("div", { class: "br-fonts" }, ok.map((f) =>
      h("div", { class: "br-font" },
        h("div", { class: "br-sample", style: `font-family:"${f.name.replace(/["\\]/g, "")}", var(--font, "Plus Jakarta Sans"), sans-serif; font-weight:${weightOf(f.style)}`, "aria-hidden": "true", text: "Aa" }),
        h("div", { class: "br-font-body" },
          h("b", { class: "br-name", text: f.name }),
          f.style ? h("span", { class: "br-style", text: f.style }) : null,
          f.use ? h("span", { class: "br-small", text: f.use }) : null)))) : null);
  }

  function voicePart(ctx, voice, intro) {
    const h = ctx.h;
    const ok = (voice || []).filter((v) => txt(v.say));
    return section(h, "voice", "How we sound", intro, ok.length ? h("div", { class: "br-pairs", role: "list" },
      h("div", { class: "br-pair br-pair-head", "aria-hidden": "true" }, h("span", { text: "Say this" }), h("span", { text: "Not that" })),
      ok.map((v) => h("div", { class: "br-pair", role: "listitem" },
        h("div", { class: "br-say" }, h("span", { class: "br-mark br-yes" }, ic(h, "tick")), h("span", {}, h("span", { class: "br-cue", text: "Say this: " }), h("b", { text: v.say }))),
        h("div", { class: "br-not" }, v.not ? [h("span", { class: "br-mark br-no" }, ic(h, "cross")), h("span", {}, h("span", { class: "br-cue", text: "Not that: " }), h("s", { text: v.not }))] : null),
        v.why ? h("p", { class: "br-why", text: v.why }) : null))) : null);
  }

  function pictures(ctx, list, good) {
    const h = ctx.h;
    if (!list.length) return null;
    return h("div", { class: "br-ex-group" },
      h("p", { class: "br-ex-label " + (good ? "br-ex-good" : "br-ex-bad") }, h("span", { class: "br-mark " + (good ? "br-yes" : "br-no") }, ic(h, good ? "tick" : "cross")),
        good === null ? "Examples" : good ? "Like this" : "Not like this"),
      h("div", { class: "br-examples" }, list.map((f) => h("figure", { class: "br-ex" + (good === false ? " br-ex-isbad" : "") },
        h("button", { type: "button", class: "br-ex-pic", "aria-label": `Look closer: ${f.title || "picture"}`, onclick: () => lightbox(ctx, f) },
          h("img", { src: fileUrl(ctx, f.preview_path || f.file_path), alt: f.title || "", loading: "lazy" })),
        h("figcaption", {}, h("b", { class: "br-name", text: f.title || "" }), f.note ? h("span", { class: "br-small", text: f.note }) : null)))));
  }

  function photoPart(ctx, files, intro) {
    const pics = (k) => files.filter((f) => f.kind === k && isPicture(f));
    return section(ctx.h, "photo", "Photo style", intro, pictures(ctx, pics("good"), true), pictures(ctx, pics("bad"), false));
  }

  function rulesPart(ctx, sizes, rules, intro) {
    const h = ctx.h;
    const sz = (sizes || []).filter((s) => txt(s.name) || txt(s.size));
    const rl = (rules || []).filter((r) => txt(r.text));
    const ratio = (s) => { const m = /(\d{3,4})\s*[x×]\s*(\d{3,4})/i.exec(s || ""); return m ? [+m[1], +m[2]] : null; };
    return section(h, "rules", "Posts and adverts", intro,
      sz.length ? h("div", { class: "br-sizes" }, sz.map((s) => {
        const r = ratio(s.size), H = 66, W = r ? Math.round(H * r[0] / r[1]) : 52;
        return h("div", { class: "br-size" },
          h("span", { class: "br-frame", style: `width:${W}px;height:${H}px`, "aria-hidden": "true" }),
          h("div", { class: "br-size-body" },
            h("b", { class: "br-name" }, s.name || "", s.size ? h("span", { class: "br-dim", text: s.size }) : null),
            s.use ? h("span", { class: "br-small", text: s.use }) : null,
            s.safe ? h("p", { class: "br-safe" }, h("span", { class: "br-cue-on", text: "Safe area: " }), s.safe) : null));
      })) : null,
      rl.length ? h("dl", { class: "br-rules" }, rl.map((r) => h("div", { class: "br-rule" }, h("dt", { text: r.topic || "Rule" }), h("dd", { text: r.text })))) : null);
  }

  function figmaBtn(ctx, url, cls) {
    if (!FIGMA.test(url || "")) return null;
    return ctx.h("a", { class: "br-btn br-main " + (cls || ""), href: url, target: "_blank", rel: "noopener" }, "Open the full brand guide in Figma", ic(ctx.h, "out"));
  }

  // ---------- the page ----------
  async function render(el, ctx) {
    const h = ctx.h;
    el.classList.add("br-host");
    const wrap = h("div", { class: "br-wrap" }, h("p", { class: "br-wait", text: "Loading the brand guide…" }));
    el.replaceChildren(wrap);
    let r;
    try { r = await ctx.rpc("get_brand", { p_token: ctx.token || null, p_client_code: ctx.code }); }
    catch (e) { wrap.replaceChildren(h("p", { class: "br-empty", text: "The brand guide can't load right now. Please try again." })); return; }
    if (!r || r.error) { wrap.replaceChildren(h("p", { class: "br-locked", text: "This page isn't open on this link." })); return; }
    const b = r.brand || {}, files = Array.isArray(r.files) ? r.files : [], sec = b.sections || {};
    const name = ctx.clientName || "";
    const parts = [
      logoPart(ctx, files, sec.logo),
      colourPart(ctx, b.colours, sec.colours),
      fontPart(ctx, b.fonts, sec.fonts),
      voicePart(ctx, b.voice, sec.voice),
      photoPart(ctx, files, sec.photo),
      rulesPart(ctx, b.sizes, b.rules, sec.rules),
      section(h, "examples", "More examples", null, pictures(ctx, files.filter((f) => f.kind === "example" && isPicture(f)), null)),
    ].filter(Boolean);
    const figma = figmaBtn(ctx, b.figma_url);
    const head = h("header", { class: "br-head" },
      h("div", { class: "br-head-txt" },
        h("p", { class: "br-eyebrow", text: "Brand" }),
        h("h2", { class: "br-h2", text: name ? `${name} brand guide` : "Brand guide" }),
        lines(h, sec.intro, "br-lede"),
        b.updated_at ? h("p", { class: "br-date", text: "Updated " + new Date(b.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) }) : null),
      figma ? h("div", { class: "br-head-act" }, figma) : null);
    if (!parts.length && !figma && !txt(sec.intro)) {
      wrap.replaceChildren(head, h("p", { class: "br-empty", text: ctx.team
        ? "No brand guide for this client yet. Their Claude session fills it with panel_brand_admin.py."
        : "Your brand guide isn't ready yet." }));
      return;
    }
    const jump = parts.length > 2 ? h("nav", { class: "br-jump", "aria-label": "Parts of the brand guide" }, parts.map((p) =>
      h("a", { href: "#" + p.id, class: "br-chipl", onclick: (e) => { e.preventDefault(); p.scrollIntoView({ behavior: "smooth", block: "start" }); }, text: p.querySelector(".br-h3").textContent }))) : null;
    const foot = figma ? h("footer", { class: "br-foot" },
      h("p", { class: "br-text", text: "This page is the short version. Every logo, colour and template is in the Figma file." }), figmaBtn(ctx, b.figma_url, "br-ghostish")) : null;
    wrap.replaceChildren(...[head, jump, ...parts, foot].filter(Boolean));
    if (ctx.team) wrap.prepend(h("p", { class: "br-teamnote", text: "Team view. Clients see this page only when it is switched on for their personal link." }));
  }

  window.M7Brand = { render, version: "2026-11-25" };
  (window.StudioPanelsQueue ||= []).push({ name: "brand", type: "page", page: { label: "Brand", needsPerson: true, teamOnly: true, render } });
})();
