/* Right Team Digital — shared behaviour (no build step) */
(() => {
  const RT = window.RT || { site: {}, reels: [], work: [] };
  const doc = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  doc.classList.add("js");
  if (reduce) doc.classList.add("no-motion");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Icon sprite ---------- */
  const ICONS = {
    "arrow": '<path d="M7 17 17 7M7 7h10v10"/>',
    "chev": '<path d="m6 9 6 6 6-6"/>',
    "play": '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
    "target": '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    "video": '<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="m21.5 8-6 4 6 4z"/>',
    "users": '<path d="M16 20v-1.5a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V20"/><circle cx="9.2" cy="7.5" r="3.6"/><path d="M21.5 20v-1.5a4 4 0 0 0-3-3.8M15.5 4a3.7 3.7 0 0 1 0 7.1"/>',
    "search": '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
    "chat": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
    "insta": '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/>',
    "phone": '<path d="M21 16.5v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.5 5.2 2 2 0 0 1 4.5 3h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.4 10.9a16 16 0 0 0 4.7 4.7l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "menu": '<path d="M4 8h16M4 16h16"/>',
    "x": '<path d="M18 6 6 18M6 6l12 12"/>',
    "mic": '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M18.5 10.5v.5a6.5 6.5 0 0 1-13 0v-.5M12 17.5v4"/>',
    "chart": '<path d="M3.5 3.5v17h17"/><path d="M8 16v-4M12.5 16V8M17 16v-6"/>',
    "mail": '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m21.5 7-9.5 6-9.5-6"/>',
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/>',
    "funnel": '<path d="M3 4.5h18l-7 8.2V19l-4 1.5v-7.8z"/>',
    "spark": '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 10.9 10.1 9z"/>',
    "pen": '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  };
  const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${Object.entries(ICONS)
    .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join("")}</svg>`;
  document.body.insertAdjacentHTML("afterbegin", sprite);
  const icon = (n, cls = "") => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  window.RTicon = icon;

  /* ---------- Header + footer ---------- */
  const SERVICES = [
    { id: "lead-generation", icon: "target", name: "Lead Generation", desc: "Meta & Google ads, landing pages, WhatsApp funnels and lead tracking" },
    { id: "reels-video", icon: "video", name: "Reels & Video", desc: "Scripts, shoots, editing and ad creatives cut from your reels" },
    { id: "social-creators", icon: "users", name: "Social & Creators", desc: "Social media management, influencers, podcasts and PR" },
    { id: "search-web", icon: "search", name: "Search & Websites", desc: "SEO, AI search, Google Business Profile and landing pages" },
  ];
  window.RT_SERVICES = SERVICES;
  const page = document.body.dataset.page || "";
  const cur = (p) => (page === p ? ' aria-current="page"' : "");

  const header = `
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header" id="siteHeader">
    <a class="brand" href="index.html" aria-label="Right Team Digital — home">
      <img src="assets/img/rt-logo.svg" alt="" width="38" height="38">
      <span>Right Team <small>Digital</small></span>
    </a>
    <nav class="nav" aria-label="Main">
      <div class="nav__group">
        <button class="nav__link" id="svcBtn" aria-expanded="false" aria-controls="svcMenu"${page === "services" ? ' aria-current="page"' : ""}>Services ${icon("chev")}</button>
        <div class="dropdown" id="svcMenu" role="menu">
          ${SERVICES.map((s) => `<a role="menuitem" href="services.html#${s.id}"><span class="orb">${icon(s.icon)}</span><b>${s.name}</b><small>${s.desc}</small></a>`).join("")}
          <a role="menuitem" class="dropdown__all" href="services.html#planning">Not sure? See complete packages ${icon("arrow")}</a>
        </div>
      </div>
      <a class="nav__link" href="work.html"${cur("work")}>Our Work</a>
      <a class="nav__link" href="about.html"${cur("about")}>About</a>
    </nav>
    <a class="btn btn--ink btn--small header-cta" href="start.html">Start a Project <span class="btn__dot">${icon("arrow")}</span></a>
    <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">${icon("menu")}</button>
  </header>
  <div class="mobile-menu" id="mobileMenu" aria-hidden="true">
    <button class="menu-btn mobile-menu__close" id="menuClose" aria-label="Close menu">${icon("x")}</button>
    <a href="index.html">Home</a>
    <details><summary>Services</summary>
      ${SERVICES.map((s) => `<a href="services.html#${s.id}"><b>${s.name}</b><small>${s.desc}</small></a>`).join("")}
      <a href="services.html#planning"><b>Complete packages</b><small>Pick a goal, we suggest the scope</small></a>
    </details>
    <a href="work.html">Our Work</a>
    <a href="about.html">About</a>
    <a class="btn btn--ink" href="start.html">Start a Project <span class="btn__dot">${icon("arrow")}</span></a>
  </div>`;
  document.body.insertAdjacentHTML("afterbegin", header);

  const S = RT.site || {};
  const footer = `
  <footer class="sheet sheet--white site-footer">
    <div class="wrap">
      <div class="footer__top">
        <div class="footer__brand">
          <a class="brand" href="index.html"><img src="assets/img/rt-logo.svg" alt="" width="38" height="38"><span>Right Team <small>Digital</small></span></a>
          <p>The digital marketing arm of ${esc(S.company || "Right Team Private Limited")}. Lead generation first, with reels, social and creators doing the heavy lifting.</p>
          <a class="btn btn--ink btn--small" href="start.html">Share Your Brief <span class="btn__dot">${icon("arrow")}</span></a>
        </div>
        <div><h4>Services</h4><ul>${SERVICES.map((s) => `<li><a href="services.html#${s.id}">${s.name}</a></li>`).join("")}</ul></div>
        <div><h4>Company</h4><ul>
          <li><a href="work.html">Our Work</a></li><li><a href="about.html">About</a></li>
          <li><a href="start.html">Contact</a></li><li><a href="start.html?service=network">Join Our Network</a></li>
        </ul></div>
        <div><h4>Follow</h4><ul>
          <li><a href="${esc(S.instagram || "#")}" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="${esc(S.linkedin || "#")}" target="_blank" rel="noopener">LinkedIn</a></li>
          ${S.email ? `<li><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>` : ""}
          ${S.whatsapp ? `<li><a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a></li>` : ""}
        </ul></div>
      </div>
      <p class="footer__big" aria-hidden="true">Right <span>Team</span></p>
      <div class="footer__bottom">
        <span>© ${new Date().getFullYear()} ${esc(S.company || "Right Team Private Limited")}</span>
        <nav aria-label="Legal"><a href="privacy.html">Privacy Policy</a><a href="terms.html">Terms</a><a href="${esc(S.mainSite || "#")}">rightteam.in</a></nav>
      </div>
    </div>
  </footer>
  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Reel player">
    <div class="lightbox__box" id="lightboxBox"></div>
  </div>`;
  const frame = $(".frame");
  (frame || document.body).insertAdjacentHTML("beforeend", footer);

  /* dropdown */
  const svcBtn = $("#svcBtn"), svcMenu = $("#svcMenu");
  const setMenu = (open) => { svcBtn.setAttribute("aria-expanded", open); svcMenu.classList.toggle("is-open", open); };
  svcBtn.addEventListener("click", (e) => { e.stopPropagation(); setMenu(svcBtn.getAttribute("aria-expanded") !== "true"); });
  const group = svcBtn.parentElement;
  let hoverT;
  group.addEventListener("mouseenter", () => { if (matchMedia("(hover:hover)").matches) { clearTimeout(hoverT); setMenu(true); } });
  group.addEventListener("mouseleave", () => { hoverT = setTimeout(() => setMenu(false), 160); });
  document.addEventListener("click", (e) => { if (!group.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { setMenu(false); closeMobile(); closeLightbox(); } });

  /* mobile menu */
  const mm = $("#mobileMenu"), menuBtn = $("#menuBtn");
  const openMobile = () => { mm.classList.add("is-open"); mm.setAttribute("aria-hidden", "false"); menuBtn.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; $("#menuClose").focus(); };
  function closeMobile() { if (!mm.classList.contains("is-open")) return; mm.classList.remove("is-open"); mm.setAttribute("aria-hidden", "true"); menuBtn.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; menuBtn.focus(); }
  menuBtn.addEventListener("click", openMobile);
  $("#menuClose").addEventListener("click", closeMobile);
  $$("a", mm).forEach((a) => a.addEventListener("click", closeMobile));

  /* header state on scroll */
  const hdr = $("#siteHeader");
  let lastY = 0;
  const onScroll = (y) => {
    hdr.classList.toggle("is-scrolled", y > 40);
    hdr.classList.toggle("is-hidden", y > 500 && y > lastY + 4 && !svcMenu.classList.contains("is-open"));
    if (y < lastY - 4) hdr.classList.remove("is-hidden");
    lastY = y;
  };

  /* ---------- Smooth scroll + GSAP ---------- */
  const hasGSAP = !!window.gsap && !!window.ScrollTrigger;
  let lenis = null;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.RT_lenis = lenis;
    lenis.on("scroll", (e) => { onScroll(e.scroll); hasGSAP && ScrollTrigger.update(); });
    if (hasGSAP) { gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const t = $(a.getAttribute("href")); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -90 }); }
    }));
  } else {
    addEventListener("scroll", () => onScroll(scrollY), { passive: true });
  }
  // deep links like services.html#reels-video land below the fixed header
  if (location.hash && lenis) setTimeout(() => { const t = $(location.hash); t && lenis.scrollTo(t, { offset: -90, immediate: true }); }, 60);

  /* quiet reveals — only on elements explicitly marked */
  if (hasGSAP && !reduce) {
    $$("[data-reveal]").forEach((el) => {
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
    });
  } else $$("[data-reveal]").forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });

  /* ---------- Reel tiles ---------- */
  const reelTile = (r, i, { hero = false } = {}) => `
    <article class="reel" data-reel="${i}" tabindex="0" role="button" aria-label="Play reel: ${esc(r.title)}">
      <img src="${esc(r.poster)}" alt="" loading="${hero && i < 4 ? "eager" : "lazy"}" decoding="async">
      ${r.video && !hero ? `<video muted loop playsinline preload="none" src="${esc(r.video)}"></video>` : ""}
      <div class="reel__top">
        <span class="pill pill--glass">${icon("insta")} ${esc(r.category)}</span>
        ${r.sample ? '<span class="sample-flag">Sample</span>' : r.views ? `<span class="pill pill--dark">${esc(r.views)} views</span>` : ""}
      </div>
      <div class="reel__bottom">
        ${hero ? `<span class="pill pill--dark">${esc(r.title)}</span>` : `<div class="reel__meta"><b>${esc(r.title)}</b>${esc(r.category)}</div>`}
        <span class="reel__play">${icon("play", "icon--fill")}</span>
      </div>
    </article>`;

  // hero columns (duplicated track = seamless loop)
  $$("[data-reel-col]").forEach((col, ci) => {
    const list = RT.reels.filter((_, i) => i % 3 === ci % 3).concat(RT.reels.filter((_, i) => i % 3 !== ci % 3)).slice(0, 4);
    const html = list.map((r) => reelTile(r, RT.reels.indexOf(r), { hero: true })).join("");
    col.querySelector(".reel-col__track").innerHTML = html + html;
  });

  // showcase strip
  const strip = $("#reelStrip");
  if (strip) {
    strip.innerHTML = RT.reels.map((r, i) => reelTile(r, i)).join("");
    $$(".reel", strip).forEach((tile) => {
      const v = $("video", tile);
      if (!v) return;
      tile.addEventListener("mouseenter", () => { v.preload = "auto"; v.play().catch(() => {}); });
      tile.addEventListener("mouseleave", () => v.pause());
    });
    // drag to scroll on desktop
    let down = false, sx = 0, sl = 0, moved = false;
    strip.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft; });
    addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; strip.classList.add("is-drag"); } strip.scrollLeft = sl - dx; });
    addEventListener("pointerup", () => { down = false; strip.classList.remove("is-drag"); });
    strip.addEventListener("click", (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
    $$("[data-strip]").forEach((b) => b.addEventListener("click", () => strip.scrollBy({ left: (b.dataset.strip === "next" ? 1 : -1) * strip.clientWidth * 0.8, behavior: "smooth" })));
  }

  /* lightbox */
  const lb = $("#lightbox"), lbBox = $("#lightboxBox");
  let lastFocus = null;
  const openLightbox = (i) => {
    const r = RT.reels[i]; if (!r) return;
    lastFocus = document.activeElement;
    lbBox.innerHTML = `
      <button class="lightbox__close" aria-label="Close">${icon("x")}</button>
      ${r.video ? `<video src="${esc(r.video)}" poster="${esc(r.poster)}" controls autoplay playsinline></video>` : `<img src="${esc(r.poster)}" alt="">`}
      <div class="lightbox__note">
        <span class="pill pill--glass">${esc(r.title)}</span>
        ${r.link ? `<a class="pill pill--dark" href="${esc(r.link)}" target="_blank" rel="noopener">Watch on Instagram ${icon("arrow")}</a>` : r.sample ? '<span class="sample-flag">Add your reel in content.js</span>' : ""}
      </div>`;
    lb.classList.add("is-open");
    lenis && lenis.stop();
    $(".lightbox__close", lbBox).addEventListener("click", closeLightbox);
    $(".lightbox__close", lbBox).focus();
  };
  function closeLightbox() {
    if (!lb.classList.contains("is-open")) return;
    lb.classList.remove("is-open"); lenis && lenis.start();
    setTimeout(() => { lbBox.innerHTML = ""; }, 300);
    lastFocus && lastFocus.focus();
  }
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-reel]"); if (t) openLightbox(+t.dataset.reel); });
  document.addEventListener("keydown", (e) => { const t = e.target.closest && e.target.closest("[data-reel]"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openLightbox(+t.dataset.reel); } });

  /* ---------- Work cards ---------- */
  const workGrid = $("#workGrid");
  if (workGrid) {
    const limit = +workGrid.dataset.limit || RT.work.length;
    const render = (type = "all") => {
      workGrid.innerHTML = RT.work.filter((w) => type === "all" || w.type === type).slice(0, limit).map((w) => `
        <article class="work-card">
          <div class="work-card__media"><img src="${esc(w.image)}" alt="" loading="lazy">
            <span class="pill pill--glass">${esc(w.label)}</span>${w.sample ? '<span class="sample-flag">Sample</span>' : ""}</div>
          <div class="work-card__body">
            <h3 class="h-sm">${esc(w.title)}</h3>
            <dl><div><dt>The brief</dt><dd>${esc(w.brief)}</dd></div><div><dt>What we did</dt><dd>${esc(w.role)}</dd></div>
            ${w.timeframe ? `<div><dt>Timeframe</dt><dd>${esc(w.timeframe)}</dd></div>` : ""}</dl>
            ${w.outcome ? `<div class="work-card__outcome">${esc(w.outcome)}</div>` : ""}
          </div>
        </article>`).join("");
    };
    render();
    $$(".filters button").forEach((b) => b.addEventListener("click", () => {
      $$(".filters button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      render(b.dataset.filter);
      hasGSAP && ScrollTrigger.refresh();
    }));
  }

  /* avatars */
  $$("[data-avatars]").forEach((el) => { el.innerHTML = (RT.creatorsAvatars || []).map((s) => `<img src="${esc(s)}" alt="" loading="lazy">`).join(""); });

  /* ---------- Hero: load sequence + lead toasts ---------- */
  const hero = $(".hero");
  if (hero && hasGSAP && !reduce) {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(".hero__line > span", { yPercent: 110, duration: 1.1, stagger: 0.09 })
      .from(".hero__copy .lede, .hero__copy .btn-row", { opacity: 0, y: 16, duration: 0.8, stagger: 0.08 }, "-=0.7")
      .from(".hero__reels .reel-col", { opacity: 0, y: 60, duration: 1.2, stagger: 0.12 }, "-=1")
      .from(".hero__rail .orb, .hero__rail-plus", { scale: 0, duration: 0.6, stagger: 0.08, ease: "back.out(2)" }, "-=0.9")
      .from(".hero__foot > *", { opacity: 0, duration: 0.6 }, "-=0.5");
  }
  const toast = $("#leadToast");
  if (toast) {
    const msgs = [
      ["New enquiry", "Interior design · Pune · via Instagram", "chat"],
      ["Call booked", "Dental clinic · Thane · via Google", "phone"],
      ["WhatsApp chat started", "Café catering · Nashik · from a reel ad", "chat"],
      ["Quote requested", "Rooftop solar · Mumbai · landing page", "target"],
    ];
    let k = 0;
    const show = () => {
      const [t, s, ic] = msgs[k++ % msgs.length];
      toast.innerHTML = `<span class="orb orb--sm">${icon(ic)}</span><div><b>${t}</b><span>${s}</span></div>`;
      if (hasGSAP && !reduce) gsap.fromTo(toast, { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" });
    };
    show();
    if (!reduce) setInterval(() => {
      if (hasGSAP) gsap.to(toast, { opacity: 0, y: -10, duration: 0.35, onComplete: show }); else show();
    }, 3600);
  }

  /* ---------- Statement: words light up, marker draws ---------- */
  const st = $(".statement p");
  if (st) {
    const wrapWords = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) frag.append(w);
            else { const s = document.createElement("span"); s.className = "word"; s.textContent = w; frag.append(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrapWords(n);
      });
    };
    wrapWords(st);
    const words = $$(".word", st), marks = $$(".mark--draw", st);
    if (hasGSAP && !reduce) {
      ScrollTrigger.create({
        trigger: ".statement", start: "top 70%", end: "bottom 60%", scrub: true,
        onUpdate: (self) => {
          const n = Math.round(self.progress * 1.25 * words.length);
          words.forEach((w, i) => w.classList.toggle("is-on", i < n));
          marks.forEach((m) => {
            const ws = $$(".word", m), first = words.indexOf(ws[0]), last = words.indexOf(ws[ws.length - 1]);
            m.style.setProperty("--p", Math.max(0, Math.min(1, (n - first) / (last - first + 1))));
          });
        },
      });
    } else { words.forEach((w) => w.classList.add("is-on")); marks.forEach((m) => m.style.setProperty("--p", 1)); }
  }

  /* ---------- Brief form (start.html) ---------- */
  const form = $("#briefForm");
  if (form) {
    const q = new URLSearchParams(location.search);
    const svc = q.get("service"), goal = q.get("goal");
    if (svc) { const r = form.querySelector(`input[name="service"][value="${CSS.escape(svc)}"]`); if (r) r.checked = true; }
    if (goal) {
      const g = form.querySelector(`input[name="service"][value="package"]`); if (g) g.checked = true;
      const brief = form.elements.brief; if (brief && !brief.value) brief.value = `Goal: ${goal.replace(/-/g, " ")}\n\n`;
    }
    if (svc === "network") { const h = $("#formTitle"); if (h) h.textContent = "Join our creator & media network."; }
    const status = $("#formStatus");
    const validate = () => {
      let ok = true;
      ["name", "contact", "brief"].forEach((n) => {
        const el = form.elements[n], f = el.closest(".field");
        const bad = !el.value.trim() || (n === "contact" && !/(@.+\.)|(\d{7,})/.test(el.value.replace(/[\s-]/g, "")));
        f.classList.toggle("has-error", bad);
        el.setAttribute("aria-invalid", bad);
        if (bad && ok) { el.focus(); ok = false; }
      });
      return ok;
    };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validate()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        if (S.formEndpoint) {
          const res = await fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error("send failed");
          status.textContent = "Brief sent. We'll reply within one working day.";
        } else {
          const body = Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
          location.href = `mailto:${S.email}?subject=${encodeURIComponent("New brief — " + (data.business || data.name))}&body=${encodeURIComponent(body)}`;
          status.textContent = "Your email app should open with the brief filled in. Press send there to reach us.";
        }
        status.classList.add("is-shown");
        form.reset();
      } catch (err) {
        status.textContent = `The brief didn't send. Email it to ${S.email} or try again.`;
        status.classList.add("is-shown");
      } finally { btn.disabled = false; }
    });
  }

  window.RT_reduce = reduce;
})();
