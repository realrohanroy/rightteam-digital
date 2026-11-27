/* creators.html: add creators approved in admin.html (Supabase) to the static list.
   Reads public_creators(), which returns public profile fields of approved / live
   creators only (no contact details, birth dates, gender, rates or notes).
   A handle that is in both lists shows the database version. If Supabase is slow
   or down, the page carries on with the static list after 2.5 seconds. */
(() => {
  const RT = (window.RT = window.RT || {});
  const CFG = (RT.site && RT.site.onboarding) || (RT.onboarding) || {};
  const API = (CFG.supabaseUrl || "").replace(/\/$/, "");
  const KEY = CFG.supabaseAnonKey || "";
  if (!API || !KEY) { RT.creatorsReady = Promise.resolve(); return; }

  // labels the directory filters on; the form's extra choices are left out
  const ROLES = new Set(["UGC", "Podcasts", "YouTube videos", "AI content", "Shoots & edits", "Blogging"]);
  const photoUrl = (name) => (name ? `${API}/storage/v1/object/public/creator-photos/${encodeURIComponent(name)}` : "");
  const toCard = (c) => ({
    ...c,
    niches: (c.niches || []).filter((n) => n && n !== "Other").length ? c.niches.filter((n) => n !== "Other") : ["Lifestyle"],
    roles: (c.roles || []).filter((r) => ROLES.has(r)),
    platforms: (c.platforms || []).length ? c.platforms : ["Instagram"],
    langs: c.langs || [],
    photo: photoUrl(c.photo),
    avatar: photoUrl(c.avatar),
    live: true,
  });

  const ctrl = "AbortController" in window ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), 2500);
  RT.creatorsReady = fetch(`${API}/rest/v1/rpc/public_creators`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: "{}",
    signal: ctrl ? ctrl.signal : undefined,
  })
    .then((r) => (r.ok ? r.json() : []))
    .then((rows) => {
      if (!Array.isArray(rows) || !rows.length) return;
      const live = rows.filter((c) => c && /^[a-z0-9._]{1,30}$/.test(c.handle) && c.name).map(toCard);
      const seen = new Set(live.map((c) => c.handle));
      RT.creators = live.concat((RT.creators || []).filter((c) => !seen.has(c.handle)));
    })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
})();
