/* creators.html — "Discover" rows intro, hero, faceted directory, profile drawer, shortlist.
   Data: window.RT.creators from assets/js/creators-data.js (generated from the
   registration form by tools/creators_from_form.py — public fields only).

   What a brand sees, and why (creator-marketing research: brands shortlist on
   audience fit first — niche, language, location, size — then credibility —
   real reach, views, past brand work — then practical fit — setup, travel,
   collab types). Contact details, DOB, gender and rates are never shown;
   rates are "on request" so the agency stays the point of contact.

   Directory UX follows Baymard faceted-search guidance: always-visible primary
   facet (niche chips), one "More filters" sheet with per-option counts and a
   live "Show N" button, removable applied-filter pills, URL-synced state,
   "Show more" (not infinite scroll) and a useful empty state. */
(() => {
  const RT = window.RT || {};
  const ALL = (RT.creators || []).map((c, i) => ({
    ...c,
    reach: Math.max(c.followers || 0, c.yt || 0),
    tint: ["#c9f0dc", "#e1d8ff", "#ffeab0", "#cfe7ff", "#ffd9c7", "#e6f7a8"][i % 6],
    initials: c.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
  }));
  if (!ALL.length) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const icon = window.RTicon || (() => "");
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = !!window.gsap;
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, "") + "K" : String(n));
  const byHandle = Object.fromEntries(ALL.map((c) => [c.handle, c]));
  const viewsRank = (v = "") => { const m = v.replace(/,/g, "").match(/(\d+)\s*K/i); return v.startsWith("Below") ? 0.5 : m ? +m[1] : 0; };
  // portrait, or a typographic monogram until photos arrive
  const SMALL = /fl-face|tray-face/;
  const face = (c, cls) => c.photo
    ? `<img class="${cls}" src="${esc(SMALL.test(cls) && c.avatar ? c.avatar : c.photo)}" alt="" loading="lazy" decoding="async">`
    : `<span class="${cls} mono" style="--tint:${c.tint}" aria-hidden="true">${esc(c.initials)}</span>`;

  /* ---------------- facets ---------------- */
  const uniq = (key) => [...new Set(ALL.flatMap((c) => c[key]))].sort();
  const SIZES = [
    { id: "1-10k", label: "1K–10K", test: (n) => n < 10000 },
    { id: "10-50k", label: "10K–50K", test: (n) => n >= 10000 && n < 50000 },
    { id: "50-100k", label: "50K–100K", test: (n) => n >= 50000 && n < 100000 },
    { id: "100k", label: "100K+", test: (n) => n >= 100000 },
  ];
  const OPEN_TO = ["Barter", "UGC without posting", "Events", "Long-term partnerships", "Affiliate", "Podcasts"];
  const FACETS = {
    niche: { label: "Niche", values: uniq("niches"), get: (c) => c.niches },
    lang: { label: "Language", values: uniq("langs"), get: (c) => c.langs },
    city: { label: "City", values: [...new Set(ALL.map((c) => c.city))].sort(), get: (c) => [c.city] },
    size: { label: "Audience size (largest platform)", values: SIZES.map((s) => s.id) },
    platform: { label: "Active on", values: uniq("platforms"), get: (c) => c.platforms },
    open: { label: "Open to", values: OPEN_TO.filter((v) => ALL.some((c) => c.collabs.includes(v))), get: (c) => c.collabs },
    role: { label: "Also does", values: uniq("roles"), get: (c) => c.roles },
    travel: { label: "Travel", values: ["Travels for campaigns"], get: (c) => (c.travels ? ["Travels for campaigns"] : []) },
  };
  const KEYS = Object.keys(FACETS);
  const SHEET_KEYS = KEYS.filter((k) => k !== "niche");
  const state = { q: "", sort: "reach" };
  KEYS.forEach((k) => (state[k] = new Set()));
  const PAGE = 12;
  let shown = PAGE;

  const meta = $("#discoverMeta");
  if (meta) meta.textContent = `${ALL.length} creators · ${FACETS.niche.values.length} niches · ${FACETS.lang.values.length} languages`;

  /* URL <-> state */
  const readURL = () => {
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") || "";
    state.sort = p.get("sort") || "reach";
    KEYS.forEach((k) => { state[k] = new Set((p.get(k) || "").split(",").filter(Boolean)); });
  };
  const writeURL = () => {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.sort !== "reach") p.set("sort", state.sort);
    KEYS.forEach((k) => { if (state[k].size) p.set(k, [...state[k]].join(",")); });
    const s = p.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + location.hash);
  };

  const inFacet = (c, k, v) => (k === "size" ? SIZES.find((s) => s.id === v).test(c.reach) : FACETS[k].get(c).includes(v));
  const matches = (c, skip) => {
    const q = state.q.trim().toLowerCase();
    if (q && ![c.name, c.handle, c.city, c.bio, c.style, c.brands, ...c.niches, ...c.langs].join(" ").toLowerCase().includes(q)) return false;
    return KEYS.every((k) => k === skip || !state[k].size || [...state[k]].some((v) => inFacet(c, k, v)));
  };
  const SORTS = {
    reach: (a, b) => b.reach - a.reach,
    followers: (a, b) => b.followers - a.followers,
    yt: (a, b) => b.yt - a.yt,
    views: (a, b) => viewsRank(b.avgViews) - viewsRank(a.avgViews) || b.reach - a.reach,
  };
  const results = () => ALL.filter((c) => matches(c)).sort(SORTS[state.sort] || SORTS.reach);
  const countFor = (k, v) => ALL.filter((c) => matches(c, k) && inFacet(c, k, v)).length;
  const labelOf = (k, v) => (k === "size" ? SIZES.find((s) => s.id === v).label : v);

  /* ---------------- shortlist (saved on this device) ---------------- */
  const KEY = "rt-shortlist";
  let shortlist = [];
  try { shortlist = JSON.parse(localStorage.getItem(KEY) || "[]").filter((h) => byHandle[h]); } catch (e) {}
  const saveList = () => { try { localStorage.setItem(KEY, JSON.stringify(shortlist)); } catch (e) {} };
  const inList = (h) => shortlist.includes(h);
  const toggleList = (h) => { shortlist = inList(h) ? shortlist.filter((x) => x !== h) : shortlist.concat(h); saveList(); paintTray(); syncShortlistButtons(); };

  /* ---------------- rendering ---------------- */
  const grid = $("#crGrid"), count = $("#dirCount"), applied = $("#dirApplied"), empty = $("#dirEmpty"), more = $("#showMore");

  const shortBtn = (c, cls = "") => `<button class="cr-short ${cls}" type="button" data-short="${esc(c.handle)}" aria-pressed="${inList(c.handle)}">
      <span class="cr-short__on">${icon("check")} Shortlisted</span><span class="cr-short__off">${icon("plus")} Shortlist</span></button>`;

  const stats = (c, big) => `
    <dl class="cr-stats${big ? " cr-stats--big" : ""}">
      <div><dt>Instagram</dt><dd>${c.followers ? fmt(c.followers) : "—"}</dd></div>
      <div><dt>YouTube</dt><dd>${c.yt ? fmt(c.yt) : "—"}</dd></div>
      <div><dt>Avg. views</dt><dd>${esc(c.avgViews || "—")}</dd></div>
    </dl>`;

  const card = (c) => `
    <article class="cr-card" style="--tint:${c.tint}">
      <button class="cr-card__media" type="button" data-open="${esc(c.handle)}" aria-label="View profile: ${esc(c.name)}">
        ${face(c, "cr-card__img")}
        <span class="pill pill--glass cr-card__niche">${esc(c.niches[0])}</span>
      </button>
      <div class="cr-card__body">
        <h3 class="cr-card__name">${esc(c.name)}</h3>
        <p class="cr-card__handle">@${esc(c.handle)} · ${esc(c.city)}</p>
        ${stats(c)}
        <p class="cr-card__langs">${c.langs.map(esc).join(" · ")}</p>
        <div class="cr-card__actions">
          ${shortBtn(c)}
          <button class="cr-view" type="button" data-open="${esc(c.handle)}">View profile</button>
        </div>
      </div>
    </article>`;

  const renderChips = () => {
    $("#nicheChips").innerHTML = FACETS.niche.values.map((v) =>
      `<button class="pill dir-chip" type="button" data-facet="niche" data-value="${esc(v)}" aria-pressed="${state.niche.has(v)}">${esc(v)}</button>`).join("");
  };
  const renderSheet = () => {
    $("#filterBody").innerHTML = SHEET_KEYS.map((k) => `
      <fieldset class="fgroup"><legend>${FACETS[k].label}</legend><div class="fgroup__opts">
        ${FACETS[k].values.map((v) => {
          const n = countFor(k, v), on = state[k].has(v);
          return `<button class="pill dir-chip" type="button" data-facet="${k}" data-value="${esc(v)}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""}>${esc(labelOf(k, v))} <span class="dir-chip__n">${n}</span></button>`;
        }).join("")}
      </div></fieldset>`).join("");
  };

  const render = (animate = true) => {
    const r = results(), list = r.slice(0, shown);
    grid.innerHTML = list.map(card).join("");
    count.textContent = r.length === ALL.length ? `Showing all ${ALL.length} creators` : `${r.length} of ${ALL.length} creators match`;
    empty.hidden = r.length > 0;
    more.hidden = r.length <= shown;
    more.textContent = `Show more creators (${r.length - list.length} more)`;
    const pills = [];
    if (state.q) pills.push(`<button class="pill pill--marker dir-pill" type="button" data-remove="q">“${esc(state.q)}” ${icon("x")}</button>`);
    KEYS.forEach((k) => state[k].forEach((v) =>
      pills.push(`<button class="pill pill--marker dir-pill" type="button" data-remove="${k}" data-value="${esc(v)}" aria-label="Remove filter ${esc(labelOf(k, v))}">${esc(labelOf(k, v))} ${icon("x")}</button>`)));
    if (pills.length > 1) pills.push(`<button class="dir-clear" type="button" data-clear>Clear all</button>`);
    applied.innerHTML = pills.join("");
    const extra = SHEET_KEYS.reduce((n, k) => n + state[k].size, 0);
    const badge = $("#moreCount"); badge.hidden = !extra; badge.textContent = extra;
    $("#applySheet").textContent = `Show ${r.length} creator${r.length === 1 ? "" : "s"}`;
    $$("#nicheChips .dir-chip").forEach((b) => b.setAttribute("aria-pressed", state.niche.has(b.dataset.value)));
    if (!$("#filterSheet").hidden) renderSheet();
    writeURL();
    if (animate && hasGSAP && !reduce) gsap.from(".cr-card", { opacity: 0, y: 18, duration: 0.5, stagger: 0.04, ease: "power3.out", clearProps: "all" });
    window.ScrollTrigger && ScrollTrigger.refresh();
  };
  const syncShortlistButtons = () => $$("[data-short]").forEach((b) => b.setAttribute("aria-pressed", inList(b.dataset.short)));

  /* tray */
  const tray = $("#crTray");
  const paintTray = () => {
    tray.hidden = !shortlist.length;
    document.body.classList.toggle("has-tray", !!shortlist.length);
    if (!shortlist.length) return;
    $("#trayFaces").innerHTML = shortlist.slice(0, 5).map((h) => face(byHandle[h], "tray-face")).join("");
    $("#trayText").textContent = `${shortlist.length} creator${shortlist.length === 1 ? "" : "s"} shortlisted`;
    $("#traySend").href = `start.html?service=social-creators&creators=${encodeURIComponent(shortlist.join(","))}`;
  };
  $("#trayClear").addEventListener("click", () => { shortlist = []; saveList(); paintTray(); syncShortlistButtons(); });

  /* ---------------- interactions ---------------- */
  let qTimer;
  $("#dirQuery").addEventListener("input", (e) => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; shown = PAGE; render(); }, 180); });
  $("#dirSort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  more.addEventListener("click", () => {
    const before = shown; shown += PAGE; render(false);
    const first = grid.children[before]; first && first.querySelector("button").focus({ preventScroll: true });
  });
  document.addEventListener("click", (e) => {
    const f = e.target.closest("[data-facet]");
    if (f && !f.disabled) { const s = state[f.dataset.facet], v = f.dataset.value; s.has(v) ? s.delete(v) : s.add(v); shown = PAGE; render(); return; }
    const rm = e.target.closest("[data-remove]");
    if (rm) { if (rm.dataset.remove === "q") { state.q = ""; $("#dirQuery").value = ""; } else state[rm.dataset.remove].delete(rm.dataset.value); render(); return; }
    if (e.target.closest("[data-clear]")) { state.q = ""; $("#dirQuery").value = ""; KEYS.forEach((k) => state[k].clear()); shown = PAGE; render(); return; }
    const sb = e.target.closest("[data-short]"); if (sb) { toggleList(sb.dataset.short); return; }
    const op = e.target.closest("[data-open]"); if (op) { openDrawer(op.dataset.open); return; }
  });

  /* modal helpers */
  let lastFocus = null;
  const lenis = () => window.RT_lenis;
  const openModal = (panel, overlay) => {
    lastFocus = document.activeElement;
    overlay.hidden = false; panel.hidden = false;
    requestAnimationFrame(() => { overlay.classList.add("is-open"); panel.classList.add("is-open"); });
    lenis() && lenis().stop(); document.body.style.overflow = "hidden";
    const f = panel.querySelector("button, a, input, select"); f && f.focus();
  };
  const closeModal = (panel, overlay) => {
    if (panel.hidden) return;
    overlay.classList.remove("is-open"); panel.classList.remove("is-open");
    setTimeout(() => { overlay.hidden = true; panel.hidden = true; }, 320);
    lenis() && lenis().start(); document.body.style.overflow = "";
    lastFocus && lastFocus.focus({ preventScroll: true });
  };
  const sheet = $("#filterSheet"), sheetOv = $("#filterOverlay");
  $("#moreFilters").addEventListener("click", () => { renderSheet(); openModal(sheet, sheetOv); });
  $$("[data-close-sheet]").forEach((b) => b.addEventListener("click", () => closeModal(sheet, sheetOv)));
  sheetOv.addEventListener("click", () => closeModal(sheet, sheetOv));

  const drawer = $("#crDrawer"), drawerOv = $("#drawerOverlay");
  const row = (label, value) => (value ? `<div class="cr-facts__row"><dt>${label}</dt><dd>${value}</dd></div>` : "");
  function openDrawer(handle) {
    const c = byHandle[handle]; if (!c) return;
    const links = [
      `<a class="pill" href="https://www.instagram.com/${encodeURIComponent(c.handle)}/" target="_blank" rel="noopener">${icon("insta")} Instagram profile</a>`,
      c.ytLink ? `<a class="pill" href="${esc(c.ytLink)}" target="_blank" rel="noopener">${icon("video")} YouTube channel</a>` : "",
      ...c.reels.map((u, i) => `<a class="pill pill--soft" href="${esc(u)}" target="_blank" rel="noopener">${icon("play", "icon--fill")} Best work ${i + 1}</a>`),
    ].join("");
    drawer.innerHTML = `
      <button class="menu-btn cr-drawer__close" type="button" data-close-drawer aria-label="Close profile">${icon("x")}</button>
      <div class="cr-drawer__hero" style="--tint:${c.tint}">${face(c, "cr-drawer__img")}</div>
      <div class="cr-drawer__body">
        <h2 class="display h-md" id="drawerName">${esc(c.name)}</h2>
        <p class="cr-card__handle">@${esc(c.handle)} · ${esc(c.city)}${c.state ? ", " + esc(c.state) : ""}</p>
        ${c.bio ? `<p class="cr-drawer__bio">${esc(c.bio)}</p>` : ""}
        <div class="cr-tags">${c.niches.map((t) => `<span class="pill pill--soft">${esc(t)}</span>`).join("")}</div>
        ${stats(c, true)}
        ${c.style ? `<h3 class="cr-drawer__h">Content style</h3><p class="cr-drawer__style">${esc(c.style)}</p>` : ""}
        <dl class="cr-facts">
          ${row("Languages", c.langs.map(esc).join(", "))}
          ${row("Audience mostly in", esc(c.audienceIn))}
          ${row("Active on", c.platforms.map(esc).join(", "))}
          ${row("Posts", esc(c.posts))}
          ${row("Production", esc(c.setup))}
          ${row("Travel", c.travels ? "Open to outstation campaigns" : "Works in their city")}
          ${row("Also does", c.roles.map(esc).join(", "))}
          ${row("Open to", c.collabs.map(esc).join(", "))}
          ${row("Has worked with", esc(c.brands))}
        </dl>
        <div class="cr-links">${links}</div>
        <p class="small">Rates and availability are shared on request for each campaign.</p>
        <div class="cr-drawer__actions">
          ${shortBtn(c, "cr-short--big")}
          <a class="btn btn--ink" href="start.html?service=social-creators&creators=${encodeURIComponent(c.handle)}">Request ${esc(c.name.split(" ")[0])} <span class="btn__dot">${icon("arrow")}</span></a>
        </div>
      </div>`;
    $("[data-close-drawer]", drawer).addEventListener("click", () => closeModal(drawer, drawerOv));
    openModal(drawer, drawerOv);
  }
  drawerOv.addEventListener("click", () => closeModal(drawer, drawerOv));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(drawer, drawerOv); closeModal(sheet, sheetOv); } });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const panel = !drawer.hidden ? drawer : !sheet.hidden ? sheet : null; if (!panel) return;
    const f = $$("button:not([disabled]), a[href], input, select", panel); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  /* ---------------- DISCOVER hero ---------------- */
  const sec = $(".discover"), stage = $("#discoverStage");
  const word = $("#discoverTitle .discover__word");
  const mobile = matchMedia("(max-width: 760px)").matches;
  // [type, x%, y%, depth 1(far)–3(near)]
  const SLOTS = mobile
    ? [["chip", 5, 14, 2], ["card", 60, 11, 3], ["chip", 8, 25, 1], ["card", 4, 76, 3], ["chip", 60, 80, 2], ["chip", 56, 91, 1]]
    : [["card", 4, 8, 3], ["chip", 25, 7, 1], ["chip", 42, 4, 2], ["card", 63, 6, 2], ["chip", 85, 12, 1], ["chip", 11, 42, 1],
       ["card", 83, 34, 3], ["card", 3, 64, 2], ["chip", 24, 82, 2], ["chip", 86, 87, 1], ["card", 68, 72, 1], ["chip", 88, 66, 2]];
  // faces first: creators with a photo fill the floating hero before initials
  const HERO = ALL.filter((c) => c.photo).concat(ALL.filter((c) => !c.photo));
  stage.innerHTML = SLOTS.map(([type, x, y, d], i) => {
    const c = HERO[i % HERO.length];
    const inner = type === "card"
      ? `<span class="fl-card" style="--tint:${c.tint}">${face(c, "fl-face")}<b>${esc(c.name.split(" ").slice(0, 2).join(" "))}</b><small>@${esc(c.handle)}</small><em>${esc(c.niches[0])} · ${fmt(c.reach)}</em></span>`
      : `<span class="fl-chip">${face(c, "fl-face fl-face--sm")}<span><b>${esc(c.name.split(" ")[0])}</b><small>${esc(c.niches[0])}</small></span></span>`;
    return `<div class="fl fl--d${d}" style="left:${x}%;top:${y}%" data-depth="${d}"><div class="fl__par"><button class="fl__in" type="button" data-open="${esc(c.handle)}" aria-label="View profile: ${esc(c.name)}" tabindex="-1">${inner}</button></div></div>`;
  }).join("");
  const fls = $$(".fl", stage);

  /* The hero sequence. `fromIntro` = the word was handed over by the rows intro,
     so it is already in place and only the rest of the hero needs to arrive. */
  const playHero = (fromIntro) => {
    if (!hasGSAP || reduce) return;
    const rest = $$(".discover__meta, .discover__sub, .discover__ctas");
    const order = fls.slice().sort((a, b) => Math.hypot(parseFloat(a.style.left) - 45, parseFloat(a.style.top) - 45) - Math.hypot(parseFloat(b.style.left) - 45, parseFloat(b.style.top) - 45));
    const tl = gsap.timeline();
    if (!fromIntro) tl.from(word, { scale: 1.35, opacity: 0, filter: "blur(18px)", duration: 1.1, ease: "power4.out" });
    tl.fromTo(rest, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: "power3.out" }, fromIntro ? 0 : "-=0.55")
      .fromTo(order.map((f) => $(".fl__in", f)), {
        opacity: 0, scale: (i, el) => 0.35 + 0.1 * +el.closest(".fl").dataset.depth, filter: "blur(16px)", y: 40,
      }, { opacity: 1, scale: 1, filter: "blur(0px)", y: 0, duration: 0.9, stagger: 0.09, ease: "back.out(1.5)", clearProps: "filter,scale,opacity" }, fromIntro ? 0.1 : "-=0.6");
    fls.forEach((f, i) => gsap.to($(".fl__in", f), { y: (i % 2 ? -1 : 1) * (6 + (i % 4) * 3), rotation: (i % 3 - 1) * 1.5, duration: 3 + (i % 5) * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 + i * 0.1 }));
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const movers = fls.map((f) => ({ d: +f.dataset.depth, x: gsap.quickTo($(".fl__par", f), "x", { duration: 0.9, ease: "power3" }), y: gsap.quickTo($(".fl__par", f), "y", { duration: 0.9, ease: "power3" }) }));
      sec.addEventListener("pointermove", (e) => {
        const r = sec.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        movers.forEach((m) => { m.x(-nx * m.d * 18); m.y(-ny * m.d * 14); });
      });
      sec.addEventListener("pointerleave", () => movers.forEach((m) => { m.x(0); m.y(0); }));
    }
    if (window.ScrollTrigger) {
      const st = { trigger: ".discover", start: "top top", end: "bottom top", scrub: 0.6 };
      fls.forEach((f) => {
        const dx = parseFloat(f.style.left) - 45, dy = parseFloat(f.style.top) - 45, d = +f.dataset.depth;
        gsap.to(f, { x: dx * 4 * d, y: dy * 3 * d - 60, opacity: 0.2, ease: "none", scrollTrigger: st });
      });
      gsap.to(".discover__center", { scale: 0.92, y: 60, opacity: 0.6, ease: "none", scrollTrigger: st });
    }
  };

  /* ---- "Discover" rows intro (from the reference): the sheet fills with rows of
     Discover sliding in opposite directions; they part, and the one word in the
     middle row lands exactly where the hero word lives, then hands over to it.
     Skipped for reduced motion and for deep links (filters in the URL / #hash). */
  const runIntro = () => new Promise((resolve) => {
    if (!hasGSAP || reduce || location.search.length > 1 || location.hash) return resolve(false);
    gsap.set([word, ...$$(".discover__meta, .discover__sub, .discover__ctas"), ...fls.map((f) => $(".fl__in", f))], { opacity: 0 });
    const ready = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1000))]) : Promise.resolve();
    ready.then(() => {
      const sr = sec.getBoundingClientRect(), wr = word.getBoundingClientRect();
      const w = wr.width, gap = w * 0.14, step = w + gap, rowH = wr.height * 1.02;
      const top0 = wr.top - sr.top, left0 = wr.left - sr.left;
      const above = Math.ceil(top0 / rowH) + 1, below = Math.ceil((sr.height - top0) / rowH) + 1;
      const PER = Math.ceil(sr.width / step) + 6, CHOSEN = 3;
      const layer = document.createElement("div");
      layer.className = "dintro"; layer.setAttribute("aria-hidden", "true");
      const rows = [];
      for (let k = -above; k <= below; k++) {
        const r = document.createElement("div");
        r.className = "dintro__row";
        const off = k % 2 ? step / 2 : 0; // stagger neighbouring rows like the reference
        r.style.cssText = `top:${top0 + k * rowH}px;left:${left0 - CHOSEN * step - off}px;gap:${gap}px`;
        r.innerHTML = Array.from({ length: PER }, () => `<span class="discover__word dintro__w">Discover</span>`).join("");
        r.dataset.k = k;
        layer.appendChild(r); rows.push(r);
      }
      sec.appendChild(layer);
      const centre = rows.find((r) => r.dataset.k === "0");
      const chosen = centre.children[CHOSEN];
      const others = rows.filter((r) => r !== centre);
      const lenis = window.RT_lenis; lenis && lenis.stop();

      const tl = gsap.timeline({ onComplete: done });
      rows.forEach((r) => {
        const k = +r.dataset.k, dir = k % 2 ? 1 : -1;
        tl.fromTo(r, { x: dir * step * 1.6 }, { x: 0, duration: 1.7, ease: "power3.inOut" }, 0);
      });
      tl.from(layer, { opacity: 0, duration: 0.35, ease: "none" }, 0)
        .to(others, { y: (i, r) => Math.sign(+r.dataset.k) * (60 + Math.abs(+r.dataset.k) * 40), opacity: 0, duration: 0.6, stagger: { each: 0.03, from: "center" }, ease: "power2.in" }, 1.45)
        .to([...centre.children].filter((s) => s !== chosen), { opacity: 0, filter: "blur(8px)", duration: 0.45, ease: "power2.in" }, 1.55)
        .add(() => {}, 2.15);
      let finished = false;
      function done() {
        if (finished) return; finished = true;
        gsap.set(word, { opacity: 1 });
        layer.remove();
        lenis && lenis.start();
        resolve(true);
      }
      const skip = () => tl.progress(1);
      sec.addEventListener("click", skip, { once: true });
      addEventListener("keydown", (e) => { if (e.key === "Escape") skip(); }, { once: true });
    });
  });

  /* ---------------- boot ---------------- */
  readURL();
  $("#dirQuery").value = state.q;
  $("#dirSort").value = state.sort;
  renderChips();
  render(false);
  paintTray();
  runIntro().then((fromIntro) => playHero(fromIntro));
})();
