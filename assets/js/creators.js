/* creators.html — Discover hero, faceted directory, profile drawer, shortlist.
   UX notes (Baymard faceted-search guidance):
   - the most-used facet (niche) is always visible as one-tap chips; the rest
     live in one "More filters" sheet that shows a live result count;
   - every applied filter appears as a removable pill, with "Clear all";
   - filters are mirrored in the URL so a filtered view can be shared/bookmarked;
   - "Show more" instead of infinite scroll keeps the footer reachable;
   - a no-results state always offers a way forward. */
(() => {
  const RT = window.RT || {};
  const ALL = RT.creators || [];
  if (!ALL.length) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const icon = window.RTicon || (() => "");
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = !!window.gsap;
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n));
  const byHandle = Object.fromEntries(ALL.map((c) => [c.handle, c]));

  /* ---------------- facets ---------------- */
  const uniq = (key) => [...new Set(ALL.flatMap((c) => c[key]))].sort();
  const SIZES = [
    { id: "micro", label: "Micro · 10K–100K", test: (n) => n < 100000 },
    { id: "mid", label: "Mid · 100K–500K", test: (n) => n >= 100000 && n < 500000 },
    { id: "macro", label: "Macro · 500K+", test: (n) => n >= 500000 },
  ];
  const FACETS = {
    niche: { label: "Niche", values: uniq("niches"), field: "niches" },
    lang: { label: "Language", values: uniq("langs"), field: "langs" },
    city: { label: "City", values: [...new Set(ALL.map((c) => c.city))].sort(), field: "city" },
    size: { label: "Audience size", values: SIZES.map((s) => s.id) },
    platform: { label: "Platform", values: uniq("platforms"), field: "platforms" },
  };
  const state = { q: "", sort: "match", niche: new Set(), lang: new Set(), city: new Set(), size: new Set(), platform: new Set() };
  const PAGE = 12;
  let shown = PAGE;

  // hero meta line from the data (no invented totals)
  const meta = $("#discoverMeta");
  if (meta) meta.textContent = `${ALL.length} creators · ${FACETS.niche.values.length} niches · ${FACETS.lang.values.length} languages`;

  /* URL <-> state */
  const readURL = () => {
    const p = new URLSearchParams(location.search);
    state.q = p.get("q") || "";
    state.sort = p.get("sort") || "match";
    ["niche", "lang", "city", "size", "platform"].forEach((k) => { state[k] = new Set((p.get(k) || "").split(",").filter(Boolean)); });
  };
  const writeURL = () => {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.sort !== "match") p.set("sort", state.sort);
    ["niche", "lang", "city", "size", "platform"].forEach((k) => { if (state[k].size) p.set(k, [...state[k]].join(",")); });
    const s = p.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + location.hash);
  };

  const matches = (c, skip) => {
    const q = state.q.trim().toLowerCase();
    if (q && ![c.name, c.handle, c.city, ...c.niches, ...c.langs].join(" ").toLowerCase().includes(q)) return false;
    for (const k of ["niche", "lang", "city", "platform"]) {
      if (k === skip || !state[k].size) continue;
      const v = c[FACETS[k].field];
      if (Array.isArray(v) ? !v.some((x) => state[k].has(x)) : !state[k].has(v)) return false;
    }
    if (skip !== "size" && state.size.size && !SIZES.some((s) => state.size.has(s.id) && s.test(c.followers))) return false;
    return true;
  };
  const results = () => {
    const r = ALL.filter((c) => matches(c));
    if (state.sort === "followers") r.sort((a, b) => b.followers - a.followers);
    if (state.sort === "eng") r.sort((a, b) => b.eng - a.eng);
    return r;
  };
  // how many results a facet value would give (shown next to each option)
  const countFor = (k, v) => ALL.filter((c) => {
    if (!matches(c, k)) return false;
    if (k === "size") return SIZES.find((s) => s.id === v).test(c.followers);
    const f = c[FACETS[k].field];
    return Array.isArray(f) ? f.includes(v) : f === v;
  }).length;
  const labelOf = (k, v) => (k === "size" ? SIZES.find((s) => s.id === v).label : v);

  /* ---------------- shortlist (saved on this device) ---------------- */
  const KEY = "rt-shortlist";
  let shortlist = [];
  try { shortlist = JSON.parse(localStorage.getItem(KEY) || "[]").filter((h) => byHandle[h]); } catch (e) {}
  const saveList = () => { try { localStorage.setItem(KEY, JSON.stringify(shortlist)); } catch (e) {} };
  const inList = (h) => shortlist.includes(h);
  const toggleList = (h) => {
    shortlist = inList(h) ? shortlist.filter((x) => x !== h) : shortlist.concat(h);
    saveList(); paintTray(); syncShortlistButtons();
  };

  /* ---------------- rendering ---------------- */
  const grid = $("#crGrid"), count = $("#dirCount"), applied = $("#dirApplied"), empty = $("#dirEmpty"), more = $("#showMore");

  const shortBtn = (c, cls = "") => `<button class="cr-short ${cls}" type="button" data-short="${esc(c.handle)}" aria-pressed="${inList(c.handle)}">
      <span class="cr-short__on">${icon("check")} Shortlisted</span><span class="cr-short__off">${icon("plus")} Shortlist</span></button>`;

  const card = (c) => `
    <article class="cr-card" style="--tint:${c.tint}">
      <button class="cr-card__media" type="button" data-open="${esc(c.handle)}" aria-label="View profile: ${esc(c.name)}">
        <img src="${esc(c.photo)}" alt="" loading="lazy" decoding="async">
        <span class="pill pill--glass cr-card__niche">${esc(c.niches[0])}</span>
        ${c.sample ? '<span class="sample-flag">Sample</span>' : ""}
      </button>
      <div class="cr-card__body">
        <h3 class="cr-card__name">${esc(c.name)}</h3>
        <p class="cr-card__handle">@${esc(c.handle)} · ${esc(c.city)}</p>
        <dl class="cr-stats">
          <div><dt>Followers</dt><dd>${fmt(c.followers)}</dd></div>
          <div><dt>Engagement</dt><dd>${c.eng}%</dd></div>
          <div><dt>Avg. views</dt><dd>${fmt(c.avgViews)}</dd></div>
        </dl>
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
    $("#filterBody").innerHTML = ["lang", "city", "size", "platform"].map((k) => `
      <fieldset class="fgroup"><legend>${FACETS[k].label}</legend><div class="fgroup__opts">
        ${FACETS[k].values.map((v) => {
          const n = countFor(k, v), on = state[k].has(v);
          return `<button class="pill dir-chip" type="button" data-facet="${k}" data-value="${esc(v)}" aria-pressed="${on}" ${!n && !on ? "disabled" : ""}>${esc(labelOf(k, v))} <span class="dir-chip__n">${n}</span></button>`;
        }).join("")}
      </div></fieldset>`).join("");
  };

  const render = (animate = true) => {
    const r = results();
    const list = r.slice(0, shown);
    grid.innerHTML = list.map(card).join("");
    count.textContent = r.length === ALL.length ? `Showing all ${ALL.length} creators` : `${r.length} of ${ALL.length} creators match`;
    empty.hidden = r.length > 0;
    more.hidden = r.length <= shown;
    more.textContent = `Show more creators (${r.length - list.length} more)`;
    // applied filters as removable pills
    const pills = [];
    if (state.q) pills.push(`<button class="pill pill--marker dir-pill" type="button" data-remove="q">“${esc(state.q)}” ${icon("x")}</button>`);
    ["niche", "lang", "city", "size", "platform"].forEach((k) => state[k].forEach((v) =>
      pills.push(`<button class="pill pill--marker dir-pill" type="button" data-remove="${k}" data-value="${esc(v)}" aria-label="Remove filter ${esc(labelOf(k, v))}">${esc(labelOf(k, v))} ${icon("x")}</button>`)));
    if (pills.length > 1) pills.push(`<button class="dir-clear" type="button" data-clear>Clear all</button>`);
    applied.innerHTML = pills.join("");
    const extra = ["lang", "city", "size", "platform"].reduce((n, k) => n + state[k].size, 0);
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
    $("#trayFaces").innerHTML = shortlist.slice(0, 5).map((h) => `<img src="${esc(byHandle[h].avatar)}" alt="">`).join("");
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
    if (e.target.closest("[data-clear]")) {
      state.q = ""; $("#dirQuery").value = ""; ["niche", "lang", "city", "size", "platform"].forEach((k) => state[k].clear()); shown = PAGE; render(); return;
    }
    const sb = e.target.closest("[data-short]"); if (sb) { toggleList(sb.dataset.short); return; }
    const op = e.target.closest("[data-open]"); if (op) { openDrawer(op.dataset.open, op); return; }
  });

  /* generic modal open/close with focus return + Esc */
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
  const bar = (label, pct) => `<div class="cr-bar"><span>${label}</span><i style="--w:${pct}%"></i><b>${pct}%</b></div>`;
  function openDrawer(handle) {
    const c = byHandle[handle]; if (!c) return;
    drawer.innerHTML = `
      <button class="menu-btn cr-drawer__close" type="button" data-close-drawer aria-label="Close profile">${icon("x")}</button>
      <div class="cr-drawer__hero" style="--tint:${c.tint}">
        <img src="${esc(c.photo)}" alt="Portrait of ${esc(c.name)}">
        ${c.sample ? '<span class="sample-flag">Sample profile</span>' : ""}
      </div>
      <div class="cr-drawer__body">
        <h2 class="display h-md" id="drawerName">${esc(c.name)}</h2>
        <p class="cr-card__handle">@${esc(c.handle)} · ${esc(c.city)} · ${c.platforms.map(esc).join(" & ")}</p>
        <p class="cr-drawer__bio">${esc(c.bio)}</p>
        <div class="cr-tags">${c.niches.concat(c.langs).map((t) => `<span class="pill pill--soft">${esc(t)}</span>`).join("")}</div>
        <dl class="cr-stats cr-stats--big">
          <div><dt>Followers</dt><dd>${fmt(c.followers)}</dd></div>
          <div><dt>Engagement</dt><dd>${c.eng}%</dd></div>
          <div><dt>Avg. views</dt><dd>${fmt(c.avgViews)}</dd></div>
        </dl>
        <h3 class="cr-drawer__h">Audience</h3>
        ${bar("Women", c.audience.women)}${bar("Men", 100 - c.audience.women)}
        <p class="small">Largest age group <b>${esc(c.audience.age)}</b> · Top city <b>${esc(c.audience.topCity)}</b></p>
        <p class="small">Rates and availability are confirmed per campaign.</p>
        <div class="cr-drawer__actions">
          ${shortBtn(c, "cr-short--big")}
          <a class="btn btn--ink" href="start.html?service=social-creators&creators=${encodeURIComponent(c.handle)}">Request ${esc(c.name.split(" ")[0])} <span class="btn__dot">${icon("arrow")}</span></a>
        </div>
      </div>`;
    $("[data-close-drawer]", drawer).addEventListener("click", () => closeModal(drawer, drawerOv));
    openModal(drawer, drawerOv);
  }
  drawerOv.addEventListener("click", () => closeModal(drawer, drawerOv));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeModal(drawer, drawerOv); closeModal(sheet, sheetOv);
  });
  // keep Tab inside an open dialog
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const panel = !drawer.hidden ? drawer : !sheet.hidden ? sheet : null; if (!panel) return;
    const f = $$("button:not([disabled]), a[href], input, select", panel); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  /* ---------------- DISCOVER hero ----------------
     The word lands first; then the network gathers around it — cards and
     avatar chips come forward out of a blur at three depths, float gently,
     drift with the pointer by depth, and scatter outward as you scroll on. */
  const stage = $("#discoverStage");
  const mobile = matchMedia("(max-width: 760px)").matches;
  // [type, x%, y%, depth 1(far)–3(near)]
  const SLOTS = mobile
    ? [["chip", 5, 14, 2], ["card", 60, 11, 3], ["chip", 8, 25, 1], ["card", 4, 76, 3], ["chip", 60, 80, 2], ["chip", 56, 91, 1]]
    : [["card", 4, 8, 3], ["chip", 25, 7, 1], ["chip", 42, 4, 2], ["card", 63, 6, 2], ["chip", 85, 12, 1], ["chip", 11, 42, 1],
       ["card", 83, 34, 3], ["card", 3, 64, 2], ["chip", 24, 82, 2], ["chip", 86, 87, 1], ["card", 68, 72, 1], ["chip", 88, 66, 2]];
  const people = ALL.slice().sort((a, b) => b.followers - a.followers);
  stage.innerHTML = SLOTS.map(([type, x, y, d], i) => {
    const c = people[i % people.length];
    const inner = type === "card"
      ? `<span class="fl-card" style="--tint:${c.tint}"><img src="${esc(c.avatar)}" alt=""><b>${esc(c.name)}</b><small>@${esc(c.handle)}</small><em>${esc(c.niches[0])} · ${fmt(c.followers)}</em></span>`
      : `<span class="fl-chip"><img src="${esc(c.avatar)}" alt=""><span><b>${esc(c.name.split(" ")[0])}</b><small>${esc(c.niches[0])}</small></span></span>`;
    return `<div class="fl fl--d${d}" style="left:${x}%;top:${y}%" data-depth="${d}"><div class="fl__par"><button class="fl__in" type="button" data-open="${esc(c.handle)}" aria-label="View profile: ${esc(c.name)}" tabindex="-1">${inner}</button></div></div>`;
  }).join("");

  const fls = $$(".fl", stage);
  if (hasGSAP && !reduce) {
    const word = $(".discover__word"), rest = $$(".discover__meta, .discover__sub, .discover__ctas");
    // nearest to the centre arrive first, so the network "gathers" around the word
    const order = fls.slice().sort((a, b) => Math.hypot(parseFloat(a.style.left) - 45, parseFloat(a.style.top) - 45) - Math.hypot(parseFloat(b.style.left) - 45, parseFloat(b.style.top) - 45));
    const tl = gsap.timeline({ delay: 0.15 });
    tl.from(word, { scale: 1.35, opacity: 0, filter: "blur(18px)", duration: 1.1, ease: "power4.out" })
      .from(rest, { opacity: 0, y: 14, duration: 0.7, stagger: 0.08, ease: "power3.out" }, "-=0.55")
      .from(order.map((f) => $(".fl__in", f)), {
        opacity: 0, scale: (i, el) => 0.35 + 0.1 * +el.closest(".fl").dataset.depth, filter: "blur(16px)", y: 40,
        duration: 0.9, stagger: 0.09, ease: "back.out(1.5)", clearProps: "filter",
      }, "-=0.6");
    // gentle float, different per item
    fls.forEach((f, i) => {
      gsap.to($(".fl__in", f), { y: (i % 2 ? -1 : 1) * (6 + (i % 4) * 3), rotation: (i % 3 - 1) * 1.5, duration: 3 + (i % 5) * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 + i * 0.1 });
    });
    // pointer parallax by depth (fine pointers only)
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const movers = fls.map((f) => ({ d: +f.dataset.depth, x: gsap.quickTo($(".fl__par", f), "x", { duration: 0.9, ease: "power3" }), y: gsap.quickTo($(".fl__par", f), "y", { duration: 0.9, ease: "power3" }) }));
      const sec = $(".discover");
      sec.addEventListener("pointermove", (e) => {
        const r = sec.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        movers.forEach((m) => { m.x(-nx * m.d * 18); m.y(-ny * m.d * 14); });
      });
      sec.addEventListener("pointerleave", () => movers.forEach((m) => { m.x(0); m.y(0); }));
    }
    // scroll: the network scatters outward, the word recedes
    if (window.ScrollTrigger) {
      const st = { trigger: ".discover", start: "top top", end: "bottom top", scrub: 0.6 };
      fls.forEach((f) => {
        const dx = parseFloat(f.style.left) - 45, dy = parseFloat(f.style.top) - 45, d = +f.dataset.depth;
        gsap.to(f, { x: dx * 4 * d, y: dy * 3 * d - 60, opacity: 0.2, ease: "none", scrollTrigger: st });
      });
      gsap.to(".discover__center", { scale: 0.92, y: 60, opacity: 0.6, ease: "none", scrollTrigger: st });
    }
  }

  /* ---------------- boot ---------------- */
  readURL();
  $("#dirQuery").value = state.q;
  $("#dirSort").value = state.sort;
  renderChips();
  render(false);
  paintTray();
})();
