/* admin.html: review creators who registered on join.html, then publish them.
   Talks to Supabase directly with the reviewer's own login (Supabase Auth):
     POST /auth/v1/token                     sign in / refresh
     POST /rest/v1/rpc/admin_creators        everything about every creator (reviewers only)
     POST /rest/v1/rpc/admin_set_status      live (= on the site), needs_info, rejected, paused ...
     POST /rest/v1/rpc/admin_update_profile  corrections before publishing
     POST /rest/v1/rpc/admin_set_photo       after uploading the crop to creator-photos
     POST /storage/v1/object/sign/creator-uploads   short-lived links to the private uploads
   The database checks that the login is in public.admins for every one of these; this
   page holds no extra power of its own. */
(() => {
  const CFG = (window.RT && RT.site && RT.site.onboarding) || {};
  const API = (CFG.supabaseUrl || "").replace(/\/$/, "");
  const KEY = CFG.supabaseAnonKey || "";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s = "") => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\/[^\s<>"]+$/i.test(u || "") ? u : "");
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(n < 1e4 ? 1 : 0).replace(/\.0$/, "") + "K" : String(n || 0));
  const day = (t) => (t ? new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

  if (!API || !KEY) { $("#noConfig").hidden = false; return; }

  /* ---------------- session (kept for this tab only) ---------------- */
  const SKEY = "rt-admin-session";
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(SKEY) || "null"); } catch (e) {}
  const saveSession = (s) => { session = s; try { s ? sessionStorage.setItem(SKEY, JSON.stringify(s)) : sessionStorage.removeItem(SKEY); } catch (e) {} };
  const fromAuth = (d) => ({ access: d.access_token, refresh: d.refresh_token, expires: Date.now() + (d.expires_in || 3600) * 1000, email: d.user && d.user.email });

  async function auth(grant, body) {
    const r = await fetch(`${API}/auth/v1/token?grant_type=${grant}`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error_description || d.msg || d.message || "Sign-in failed");
    return fromAuth(d);
  }
  async function token() {
    if (!session) throw new Error("signed-out");
    if (Date.now() > session.expires - 60000) {
      try { saveSession({ ...(await auth("refresh_token", { refresh_token: session.refresh })), email: session.email }); }
      catch (e) { saveSession(null); showLogin("Your session ended. Sign in again."); throw new Error("signed-out"); }
    }
    return session.access;
  }
  const headers = async (extra) => ({ apikey: KEY, Authorization: `Bearer ${await token()}`, ...extra });

  async function rpc(fn, body = {}) {
    const r = await fetch(`${API}/rest/v1/rpc/${fn}`, { method: "POST", headers: await headers({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    const d = await r.json().catch(() => null);
    if (r.status === 401) { saveSession(null); showLogin("Your session ended. Sign in again."); throw new Error("signed-out"); }
    if (!r.ok) throw new Error((d && (d.message || d.hint)) || `Request failed (${r.status})`);
    return d;
  }
  // short-lived links to the private uploads (photo + insight screenshots)
  const signed = new Map();
  async function sign(paths) {
    const need = [...new Set(paths.filter((p) => p && !signed.has(p)))];
    if (need.length) {
      const r = await fetch(`${API}/storage/v1/object/sign/creator-uploads`, { method: "POST", headers: await headers({ "Content-Type": "application/json" }), body: JSON.stringify({ expiresIn: 3600, paths: need }) });
      const d = r.ok ? await r.json() : [];
      (Array.isArray(d) ? d : []).forEach((x) => { if (x.signedURL) signed.set(x.path, `${API}/storage/v1${x.signedURL}`); });
    }
    return paths.map((p) => signed.get(p) || "");
  }
  const publicPhoto = (name) => (name ? `${API}/storage/v1/object/public/creator-photos/${encodeURIComponent(name)}` : "");

  /* ---------------- toast ---------------- */
  let toastT;
  function toast(msg, bad = false) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false; t.classList.toggle("is-bad", bad);
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, bad ? 6000 : 3000);
  }

  /* ---------------- sign in / out ---------------- */
  function showLogin(msg = "") {
    $("#shell").hidden = true; $("#who").hidden = true; $("#login").hidden = false;
    $("#loginError").textContent = msg;
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, btn = $("button", f);
    $("#loginError").textContent = "";
    btn.disabled = true; btn.textContent = "Signing in…";
    try {
      saveSession(await auth("password", { email: f.email.value.trim(), password: f.password.value }));
      f.password.value = "";
      await start();
    } catch (err) {
      $("#loginError").textContent = /invalid/i.test(err.message) ? "Wrong email or password." : err.message;
    } finally { btn.disabled = false; btn.textContent = "Sign in"; }
  });
  $("#signOut").addEventListener("click", async () => {
    try { await fetch(`${API}/auth/v1/logout`, { method: "POST", headers: await headers() }); } catch (e) {}
    saveSession(null); all = []; showLogin();
  });

  /* ---------------- data + views ---------------- */
  const TABS = [
    { id: "review", label: "To review", st: ["submitted", "in_review"] },
    { id: "info", label: "Waiting for info", st: ["needs_info"] },
    { id: "live", label: "On the site", st: ["live", "approved"] },
    { id: "paused", label: "Paused", st: ["paused"] },
    { id: "rejected", label: "Rejected", st: ["rejected"] },
  ];
  const STATUS = { submitted: "New", in_review: "In review", needs_info: "Waiting for info", live: "On the site", approved: "On the site", paused: "Paused", rejected: "Rejected" };
  let all = [], tab = "review", current = null;
  try { tab = new URLSearchParams(location.hash.slice(1)).get("tab") || tab; } catch (e) {}

  async function start() {
    $("#login").hidden = true;
    if (!(await rpc("is_admin"))) { saveSession(null); showLogin("This account isn't on the review team. Ask the admin to add it."); return; }
    $("#whoEmail").textContent = session.email || "";
    $("#who").hidden = false; $("#shell").hidden = false;
    await load();
  }
  async function load(keep) {
    all = (await rpc("admin_creators")) || [];
    const rows = all.filter((c) => c.photo_path);
    await sign(rows.map((c) => c.photo_path)).catch(() => {});
    renderTabs();
    renderList();
    const pick = keep && all.find((c) => c.id === keep);
    if (pick && inTab(pick)) open(pick.id); else { const first = visible()[0]; first ? open(first.id) : renderEmpty(); }
  }
  const inTab = (c, t = tab) => TABS.find((x) => x.id === t).st.includes(c.status);
  const visible = () => {
    const rows = all.filter((c) => inTab(c));
    return tab === "review" || tab === "info" ? rows.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at)) : rows;
  };

  function renderTabs() {
    $("#tabs").innerHTML = TABS.map((t) => {
      const n = all.filter((c) => inTab(c, t.id)).length;
      return `<button type="button" class="rv-tab" data-tab="${t.id}" aria-pressed="${t.id === tab}">${esc(t.label)}<span class="rv-count">${n}</span></button>`;
    }).join("") + `<button type="button" class="rv-btn rv-btn--ghost rv-refresh" id="refresh">Refresh</button>`;
  }
  $("#tabs").addEventListener("click", (e) => {
    if (e.target.closest("#refresh")) { load(current && current.id).then(() => toast("Up to date")).catch((err) => toast(err.message, true)); return; }
    const b = e.target.closest("[data-tab]"); if (!b) return;
    tab = b.dataset.tab; history.replaceState(null, "", `#tab=${tab}`);
    renderTabs(); renderList();
    const first = visible()[0]; first ? open(first.id) : renderEmpty();
  });

  const thumb = (c, cls) => {
    const src = c.avatar_url ? publicPhoto(c.avatar_url) : signed.get(c.photo_path);
    const ini = (c.name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy">` : `<span class="${cls} rv-mono">${esc(ini)}</span>`;
  };
  function renderList() {
    const rows = visible();
    $("#list").innerHTML = rows.length ? rows.map((c) => `
      <button type="button" class="rv-row" data-id="${c.id}" aria-current="${current && current.id === c.id}">
        ${thumb(c, "rv-row__img")}
        <span class="rv-row__txt"><b>${esc(c.name)}</b><small>@${esc(c.handle)} · ${esc(c.city)}</small></span>
        <span class="rv-row__n">${fmt(Math.max(c.ig_followers || 0, c.yt_subscribers || 0))}</span>
      </button>`).join("") : `<p class="rv-muted rv-pad">Nobody here.</p>`;
  }
  $("#list").addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) open(b.dataset.id); });

  function renderEmpty() {
    current = null;
    $("#detail").innerHTML = `<div class="rv-empty"><h2>${tab === "review" ? "All caught up." : "Nothing in this list."}</h2><p class="rv-muted">${tab === "review" ? "New registrations from join.html show up here." : ""}</p></div>`;
  }

  const age = (dob) => { if (!dob) return ""; const d = new Date(dob), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
  const list = (a) => (a && a.length ? a.map(esc).join(", ") : "—");
  const fact = (k, v) => `<div class="rv-fact"><dt>${esc(k)}</dt><dd>${v || "—"}</dd></div>`;
  const RATE = { reel: "Reel", story: "Story", post: "Post", collab: "Collab post", yt_short: "YouTube Short", yt_long: "YouTube video" };

  async function open(id) {
    const c = all.find((x) => x.id === id); if (!c) return;
    current = c;
    $$(".rv-row").forEach((r) => r.setAttribute("aria-current", r.dataset.id === id));
    const p = c.private || {};
    const shots = [...(p.insights_paths || []), ...(p.yt_insights_paths || [])];
    const [orig] = await sign([c.photo_path]).catch(() => [""]);
    const shotUrls = await sign(shots).catch(() => shots.map(() => ""));
    if (!current || current.id !== id) return;
    const a = age(p.date_of_birth);
    const wa = (p.whatsapp || p.phone || "").replace(/[^\d]/g, "");
    const waNum = wa.length === 10 ? "91" + wa : wa;
    const live = c.status === "live" || c.status === "approved";

    $("#detail").innerHTML = `
      <div class="rv-head">
        ${thumb(c, "rv-head__img")}
        <div>
          <span class="rv-status rv-status--${esc(c.status)}">${esc(STATUS[c.status] || c.status)}</span>
          <h1>${esc(c.name)}</h1>
          <p class="rv-muted">@${esc(c.handle)} · ${esc(c.city)}${c.state ? ", " + esc(c.state) : ""} · registered ${esc(day(c.submitted_at))}${c.source === "google_form" ? " (Google Form)" : ""}</p>
        </div>
      </div>

      <section class="rv-box rv-verify">
        <h2>1. Check they're real</h2>
        <p class="rv-muted">Follower counts are typed in by the creator. Open the profile and compare.</p>
        <div class="rv-links">
          <a class="rv-btn" href="https://www.instagram.com/${encodeURIComponent(c.handle)}/" target="_blank" rel="noopener noreferrer">Open Instagram @${esc(c.handle)}</a>
          ${safeUrl(c.yt_link) ? `<a class="rv-btn" href="${esc(c.yt_link)}" target="_blank" rel="noopener noreferrer">Open YouTube</a>` : ""}
          ${safeUrl(c.portfolio_link) ? `<a class="rv-btn" href="${esc(c.portfolio_link)}" target="_blank" rel="noopener noreferrer">Portfolio</a>` : ""}
          ${safeUrl(c.other_link) ? `<a class="rv-btn" href="${esc(c.other_link)}" target="_blank" rel="noopener noreferrer">Other link</a>` : ""}
        </div>
        <dl class="rv-facts">
          ${fact("Instagram followers (they said)", fmt(c.ig_followers))}
          ${fact("YouTube subscribers (they said)", c.yt_subscribers ? fmt(c.yt_subscribers) : "")}
          ${fact("Average views", esc(c.avg_views))}
          ${fact("Posts", esc(c.posts_consistently))}
          ${fact("Best posts", (c.best_posts || []).filter(safeUrl).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Post ${i + 1}</a>`).join(" · "))}
        </dl>
        ${shotUrls.some(Boolean) ? `<h3>Insight screenshots</h3><div class="rv-shots">${shotUrls.filter(Boolean).map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="Insights screenshot" loading="lazy"></a>`).join("")}</div>` : ""}
      </section>

      <section class="rv-box">
        <h2>2. Photo for the site</h2>
        ${orig ? `
          <div class="rv-crop">
            <div class="rv-crop__frame" id="cropFrame" title="Drag to move"><img id="cropImg" alt="Uploaded photo" draggable="false"></div>
            <div class="rv-crop__side">
              <label>Zoom<input type="range" id="cropZoom" min="1" max="3" step="0.01" value="1"></label>
              <p class="rv-muted">Drag the photo so the face sits in the upper half. The round version is cut from the middle.</p>
              <button type="button" class="rv-btn rv-btn--dark" id="cropSave">${c.photo_url ? "Replace site photo" : "Use this crop"}</button>
              ${c.photo_url ? `<p class="rv-muted">Now on the site:</p><div class="rv-now"><img src="${esc(publicPhoto(c.photo_url))}" alt=""><img class="round" src="${esc(publicPhoto(c.avatar_url))}" alt=""></div>` : `<p class="rv-warn">No site photo yet. Until you save one, the card shows their initials.</p>`}
              <a class="rv-small" href="${esc(orig)}" target="_blank" rel="noopener noreferrer">Open the original</a>
            </div>
          </div>` : `<p class="rv-warn">No photo was uploaded.</p>`}
      </section>

      <section class="rv-box">
        <h2>3. Profile shown to brands</h2>
        <p class="rv-muted">Fix spelling or numbers before publishing. Changes save to the live card straight away.</p>
        <form class="rv-form" id="profileForm">
          <label>Name<input name="name" value="${esc(c.name)}" maxlength="80" required></label>
          <label>City<input name="city" value="${esc(c.city)}" maxlength="60" required></label>
          <label>State<input name="state" value="${esc(c.state || "")}" maxlength="60"></label>
          <label>Instagram followers<input name="ig_followers" inputmode="numeric" value="${c.ig_followers || 0}"></label>
          <label>YouTube subscribers<input name="yt_subscribers" inputmode="numeric" value="${c.yt_subscribers || 0}"></label>
          <label>Niches (comma separated)<input name="niches" value="${esc((c.niches || []).join(", "))}"></label>
          <label>Languages (comma separated)<input name="langs" value="${esc((c.langs || []).join(", "))}"></label>
          <label class="wide">About<textarea name="bio" rows="3" maxlength="600">${esc(c.bio || "")}</textarea></label>
          <label class="wide">Brands worked with<input name="brands" value="${esc(c.brands || "")}" maxlength="300"></label>
          <label class="rv-check wide"><input type="checkbox" name="featured" ${c.featured ? "checked" : ""}> Feature at the top of Find a Creator</label>
          <div class="wide"><button class="rv-btn" type="submit">Save profile</button></div>
        </form>
        <dl class="rv-facts">
          ${fact("Platforms", list(c.platforms))}
          ${fact("Makes", list(c.roles))}
          ${fact("Open to", list(c.collabs))}
          ${fact("Setup", esc(c.setup))}
          ${fact("Audience in", esc(c.audience_in))}
          ${fact("Travels for shoots", c.open_to_travel == null ? "" : c.open_to_travel ? "Yes" : "No")}
          ${c.niche_other ? fact("Other niche", esc(c.niche_other)) : ""}
          ${c.style ? fact("Content style", esc(c.style)) : ""}
        </dl>
      </section>

      <section class="rv-box rv-private">
        <h2>Private: never shown on the site</h2>
        <dl class="rv-facts">
          ${fact("Email", p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : "")}
          ${fact("Mobile", esc(p.phone))}
          ${fact("WhatsApp", waNum ? `<a href="https://wa.me/${esc(waNum)}" target="_blank" rel="noopener noreferrer">${esc(p.whatsapp || p.phone)}</a>` : "")}
          ${fact("Age", a !== "" ? `${a}${a < 18 ? ' <b class="rv-flag">Under 18: guardian consent needed</b>' : ""}` : "")}
          ${fact("Gender", esc(p.gender))}
          ${fact("Rates (₹)", Object.entries(p.rates || {}).map(([k, v]) => `${esc(RATE[k] || k)}: ${esc(v)}`).join("<br>"))}
          ${p.anything_else ? fact("Their note", esc(p.anything_else)) : ""}
          ${fact("Consent", p.consent_at ? `${esc(day(p.consent_at))} (${esc(p.consent_version || "")})` : "")}
        </dl>
      </section>

      <section class="rv-box">
        <h2>Team notes</h2>
        <pre class="rv-notes">${esc(c.ops_notes || "No notes yet.")}</pre>
      </section>

      <div class="rv-actions" id="actions">
        <label class="rv-note">Note for the team (saved with the decision)<input id="note" maxlength="500" placeholder="e.g. Checked IG, numbers match"></label>
        <div class="rv-actions__btns">
          ${live
            ? `<button type="button" class="rv-btn" data-status="paused">Take off the site</button>`
            : `<button type="button" class="rv-btn rv-btn--primary" data-status="live">Approve &amp; publish</button>
               ${c.status !== "needs_info" ? `<button type="button" class="rv-btn" data-status="needs_info">Ask for more info</button>` : `<button type="button" class="rv-btn" data-status="in_review">Back to review</button>`}
               ${c.status !== "rejected" ? `<button type="button" class="rv-btn rv-btn--danger" data-status="rejected">Reject</button>` : ""}`}
        </div>
      </div>`;

    if (orig) setupCrop(orig, c);
    $("#detail").scrollTop = 0;
  }

  /* ---------------- actions ---------------- */
  $("#detail").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-status]"); if (!b || !current) return;
    const st = b.dataset.status, c = current, note = $("#note").value.trim();
    if (st === "live" && !c.photo_url && !confirm("This creator has no site photo yet, so their card will show initials. Publish anyway?")) return;
    if ((st === "needs_info" || st === "rejected") && !note && !confirm("Save without a note? Press Cancel to add one first, so the team knows why.")) { $("#note").focus(); return; }
    b.disabled = true;
    try {
      await rpc("admin_set_status", { p_id: c.id, p_status: st, p_note: note || null });
      toast(st === "live" ? `${c.name} is now on Find a Creator.` : st === "paused" ? `${c.name} is off the site.` : `Moved to “${STATUS[st]}”.`);
      await load(c.id);
    } catch (err) { if (err.message !== "signed-out") toast(err.message, true); b.disabled = false; }
  });

  $("#detail").addEventListener("submit", async (e) => {
    if (e.target.id !== "profileForm" || !current) return;
    e.preventDefault();
    const f = e.target, btn = $("button[type=submit]", f);
    const split = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const num = (s) => s.replace(/[,\s]/g, "");
    if (!/^\d{1,9}$/.test(num(f.ig_followers.value)) || !/^\d{1,9}$/.test(num(f.yt_subscribers.value))) { toast("Follower counts must be whole numbers, e.g. 12000.", true); return; }
    btn.disabled = true;
    try {
      await rpc("admin_update_profile", { p_id: current.id, p: {
        name: f.name.value, city: f.city.value, state: f.state.value, bio: f.bio.value, brands: f.brands.value,
        ig_followers: num(f.ig_followers.value), yt_subscribers: num(f.yt_subscribers.value),
        niches: split(f.niches.value), langs: split(f.langs.value), featured: String(f.featured.checked),
      } });
      toast("Profile saved.");
      await load(current.id);
    } catch (err) { if (err.message !== "signed-out") toast(err.message, true); }
    finally { btn.disabled = false; }
  });

  /* ---------------- photo crop: 600x660 portrait + 240x240 round ---------------- */
  const OUT_W = 600, OUT_H = 660, SQ = 240;
  function setupCrop(url, c) {
    const frame = $("#cropFrame"), img = $("#cropImg"), zoom = $("#cropZoom");
    let bmp = null, base = 1, z = 1, x = 0, y = 0;
    const FW = () => frame.clientWidth, FH = () => frame.clientHeight;
    const clamp = () => {
      const w = bmp.width * base * z, h = bmp.height * base * z;
      x = Math.min(0, Math.max(FW() - w, x)); y = Math.min(0, Math.max(FH() - h, y));
    };
    const paint = () => { clamp(); img.style.width = `${bmp.width * base * z}px`; img.style.transform = `translate(${x}px, ${y}px)`; };
    fetch(url).then((r) => r.blob()).then(async (blob) => {
      bmp = await createImageBitmap(blob);
      img.src = URL.createObjectURL(blob);
      base = Math.max(FW() / bmp.width, FH() / bmp.height);
      x = (FW() - bmp.width * base) / 2; y = (FH() - bmp.height * base) * 0.2;
      paint();
    }).catch(() => toast("Couldn't load the photo.", true));

    zoom.addEventListener("input", () => {
      if (!bmp) return;
      const cx = FW() / 2, cy = FH() / 2, nz = +zoom.value;
      x = cx - ((cx - x) * nz) / z; y = cy - ((cy - y) * nz) / z; z = nz; paint();
    });
    let drag = null;
    frame.addEventListener("pointerdown", (e) => { if (!bmp) return; drag = { px: e.clientX, py: e.clientY, x, y }; frame.setPointerCapture(e.pointerId); });
    frame.addEventListener("pointermove", (e) => { if (!drag) return; x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; paint(); });
    frame.addEventListener("pointerup", () => { drag = null; });
    frame.addEventListener("pointercancel", () => { drag = null; });

    $("#cropSave").addEventListener("click", async (e) => {
      if (!bmp) return;
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = "Saving…";
      try {
        const s = base * z, sx = -x / s, sy = -y / s, sw = FW() / s, sh = FH() / s;
        const big = document.createElement("canvas"); big.width = OUT_W; big.height = OUT_H;
        big.getContext("2d").drawImage(bmp, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
        const sq = document.createElement("canvas"); sq.width = sq.height = SQ;
        sq.getContext("2d").drawImage(bmp, sx, sy + (sh - sw) / 3, sw, sw, 0, 0, SQ, SQ);
        const jpg = (cv) => new Promise((res) => cv.toBlob(res, "image/jpeg", 0.86));
        const stamp = Date.now();
        const names = [`${c.handle}-${stamp}.jpg`, `${c.handle}-${stamp}-sq.jpg`];
        const blobs = [await jpg(big), await jpg(sq)];
        for (let i = 0; i < 2; i++) {
          const r = await fetch(`${API}/storage/v1/object/creator-photos/${encodeURIComponent(names[i])}`, { method: "POST", headers: await headers({ "Content-Type": "image/jpeg", "x-upsert": "false", "cache-control": "31536000" }), body: blobs[i] });
          if (!r.ok) throw new Error("Photo upload failed. Check you're signed in as a reviewer.");
        }
        await rpc("admin_set_photo", { p_id: c.id, p_photo: names[0], p_avatar: names[1] });
        toast("Site photo saved.");
        await load(c.id);
      } catch (err) { if (err.message !== "signed-out") toast(err.message, true); btn.disabled = false; btn.textContent = "Use this crop"; }
    });
  }

  /* ---------------- go ---------------- */
  if (session) start().catch((err) => { if (err.message !== "signed-out") showLogin(err.message); });
  else showLogin();
})();
