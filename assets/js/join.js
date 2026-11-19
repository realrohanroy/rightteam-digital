/* Creator onboarding form (join.html)
   Writes to Supabase through two public endpoints only:
     POST /storage/v1/object/creator-uploads/pending/<uuid>.jpg   (photo, screenshots)
     POST /rest/v1/rpc/submit_creator                             (everything else)
   See supabase/migrations/*_creator_onboarding.sql and docs/ONBOARDING.md. */
(() => {
  const form = document.getElementById("joinForm");
  if (!form) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const CFG = (window.RT && RT.site && RT.site.onboarding) || {};
  const API = (CFG.supabaseUrl || "").replace(/\/$/, "");
  const KEY = CFG.supabaseAnonKey || "";
  const READY = !!(API && KEY);
  const DRAFT = "rt-join-draft-v1";
  const CONSENT_VERSION = "2026-11";

  // option values are what the site shows, so publishing needs no mapping
  const OPT = {
    langs: ["Gujarati", "Hindi", "English", "Marathi", "Punjabi", "Sindhi", "Rajasthani", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Urdu", "Other"],
    platforms: ["Instagram", "YouTube", "Facebook", "Snapchat", "X", "LinkedIn", "Podcasts"],
    niches: ["Fashion & Beauty", "Lifestyle", "Food", "Travel", "Health & Fitness", "Tech", "Business", "Finance & Education", "Parenting", "Comedy", "Gaming", "City & Local", "Other"],
    roles: ["Influencer / content creator", "YouTube videos", "UGC", "Shoots & edits", "Podcasts", "AI content", "Blogging", "Aspiring creator"],
    collabs: ["Paid collabs", "Long-term partnerships", "Influencer campaigns", "Events", "UGC without posting", "Podcasts", "Barter", "Affiliate"],
    views: ["Below 1K", "1K–5K", "5K–10K", "10K–50K", "50K–100K", "100K+", "New creator"],
    audience: ["Gujarat", "Metro cities", "Other Indian states", "Outside India"],
    posts: ["Daily", "3–4 times a week", "Weekly", "Occasionally"],
    setup: ["Shoots on phone", "Own shoot & edit setup", "Needs production support"],
  };
  // which step each server-side validation hint belongs to
  const HINT_STEP = { name: 1, handle: 1, city: 1, photo: 1, ig_followers: 2, email: 4, phone: 4, whatsapp: 4, date_of_birth: 4, consent: 4, insights: 4 };

  /* ---------- build chip groups + selects ---------- */
  $$("[data-chips]", form).forEach((box) => {
    const key = box.dataset.chips;
    box.innerHTML = OPT[key].map((v, i) => `<input type="checkbox" name="${key}" id="c-${key}-${i}" value="${v}"><label for="c-${key}-${i}">${v}</label>`).join("");
    const max = +box.dataset.max || 0;
    if (max) box.addEventListener("change", () => {
      const on = $$("input:checked", box).length;
      $$("input", box).forEach((x) => { x.disabled = !x.checked && on >= max; });
    });
  });
  $$("select[data-options]", form).forEach((sel) => {
    sel.innerHTML = `<option value="">Choose…</option>` + OPT[sel.dataset.options].map((v) => `<option>${v}</option>`).join("");
  });

  /* ---------- "Other" chips reveal a text box; "Not yet" hides the brands box ---------- */
  const syncExtras = () => {
    $$("[data-other-for]", form).forEach((box) => {
      const on = !!$(`input[name=${box.dataset.otherFor}][value="Other"]:checked`, form);
      box.hidden = !on;
      if (!on) box.value = "";
    });
    $("#brandsField").hidden = form.elements.worked_with_brands.value === "false";
  };
  form.addEventListener("change", syncExtras);

  /* ---------- counts: 12500 / 12.5k / 1.2L / 1.5M ---------- */
  const parseCount = (s) => {
    s = String(s || "").toLowerCase().replace(/[,\s+]/g, "");
    if (!s) return 0;
    const m = s.match(/^(\d+(?:\.\d+)?)(k|l|lakh|m)?$/);
    if (!m) return NaN;
    return Math.round(parseFloat(m[1]) * ({ k: 1e3, l: 1e5, lakh: 1e5, m: 1e6 }[m[2]] || 1));
  };
  $$("[data-count]", form).forEach((el) => el.addEventListener("input", () => {
    const n = parseCount(el.value), out = el.parentElement.querySelector(".join__num");
    out.textContent = el.value && !isNaN(n) && /[a-z]/i.test(el.value) ? `= ${n.toLocaleString("en-IN")}` : "";
  }));

  /* ---------- steps ---------- */
  const steps = $$(".join-step", form), last = steps.length;
  const back = $("#joinBack"), next = $("#joinNext"), status = $("#joinStatus");
  let step = 1;
  const show = (n, focus = true) => {
    step = n;
    steps.forEach((s) => { s.hidden = +s.dataset.step !== n; });
    $$("#joinProgress li").forEach((li) => {
      const k = +li.dataset.for;
      li.classList.toggle("is-done", k < n);
      if (k === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    back.hidden = n === 1;
    next.firstChild.textContent = n === last ? "Submit registration " : "Continue ";
    if (focus) {
      const h = $(`.join-step[data-step="${n}"] .join-step__title`);
      h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  };
  back.addEventListener("click", () => { clearStatus(); show(step - 1); });

  /* ---------- validation ---------- */
  const isUrl = (v) => !v || /^https?:\/\/\S{3,}$/i.test(v);
  const normHandle = (v) => v.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?].*$/, "").toLowerCase();
  const phoneOk = (v) => /^\+?\d{7,15}$/.test(v.replace(/[\s()-]/g, ""));
  const setErr = (field, bad, msg) => {
    if (!field) return;
    field.classList.toggle("has-error", bad);
    const e = field.querySelector(".form-error");
    if (e && msg) e.textContent = msg; else if (e && e.dataset.msg) e.textContent = e.dataset.msg;
    $$("input,textarea,select", field).forEach((x) => x.setAttribute("aria-invalid", bad));
  };
  let handleTaken = false, photoBlob = null, insightBlobs = [];
  const checks = {
    1: () => [
      ["name", (f) => f.name.value.trim().length >= 2],
      ["handle", (f) => /^[a-z0-9._]{1,30}$/.test(normHandle(f.handle.value)) && !handleTaken],
      ["city", (f) => f.city.value.trim().length >= 2],
      ["[data-required=langs]", (f) => $$("input[name=langs]:checked", form).length > 0 && (f.lang_other.hidden || f.lang_other.value.trim() !== "")],
      ["[data-required=photo]", () => !!photoBlob],
    ],
    2: () => [
      ["[data-required=platforms]", () => $$("input[name=platforms]:checked", form).length > 0],
      ["ig_followers", (f) => f.ig_followers.value.trim() !== "" && !isNaN(parseCount(f.ig_followers.value))],
      ["yt_subscribers", (f) => !isNaN(parseCount(f.yt_subscribers.value))],
      ["yt_link", (f) => isUrl(f.yt_link.value.trim())],
      ["other_link", (f) => isUrl(f.other_link.value.trim())],
    ],
    3: () => [
      ["[data-required=niches]", (f) => $$("input[name=niches]:checked", form).length > 0 && (f.niche_other.hidden || f.niche_other.value.trim() !== "")],
      ["best_post_1", (f) => ["best_post_1", "best_post_2", "best_post_3"].every((n) => isUrl(f[n].value.trim()))],
      ["portfolio_link", (f) => isUrl(f.portfolio_link.value.trim())],
    ],
    4: () => [
      ["email", (f) => /^[a-z0-9][^@\s]*@[^@\s]+\.[^@\s]+$/i.test(f.email.value.trim())],
      ["phone", (f) => phoneOk(f.phone.value)],
      ["whatsapp", (f) => !f.whatsapp.value.trim() || phoneOk(f.whatsapp.value)],
      ["[data-required=consent]", (f) => f.consent.checked],
    ],
  };
  const fieldOf = (key) => (key.startsWith("[") ? $(key, form) : form.elements[key].closest(".field"));
  const validate = (n) => {
    let first = null;
    checks[n]().forEach(([key, ok]) => {
      const f = fieldOf(key), bad = !ok(form.elements);
      const otherMissing = bad && /langs|niches/.test(key) && $$("input[type=checkbox]:checked", f).length > 0;
      setErr(f, bad, key === "handle" && handleTaken ? "This handle is already registered. Email us to update your profile."
        : otherMissing ? "Type what \u201cOther\u201d means." : null);
      if (bad && !first) first = f;
    });
    if (first) { const el = $("input:not([type=checkbox]):not(.sr-only),textarea,select,input", first) || first; el.focus(); }
    return !first;
  };

  /* ---------- handle availability (debounced, on blur) ---------- */
  const handleOk = $("#handleOk");
  form.handle.addEventListener("blur", async () => {
    const h = normHandle(form.handle.value);
    handleTaken = false; handleOk.hidden = true;
    if (!READY || !/^[a-z0-9._]{1,30}$/.test(h)) return;
    try {
      const r = await rpc("handle_available", { p_handle: h });
      handleTaken = r === false;
      handleOk.hidden = handleTaken;
      setErr(form.handle.closest(".field"), handleTaken, handleTaken ? "This handle is already registered. Email us to update your profile." : null);
    } catch { /* offline: the server re-checks on submit */ }
  });

  /* ---------- images: downscale + re-encode (drops EXIF / GPS) ---------- */
  const shrink = (file, max = 1600) => new Promise((res, rej) => {
    // some Android pickers report no type at all: let the browser try to decode it instead of refusing
    if (file.type && !file.type.startsWith("image/")) return rej(new Error("type"));
    if (file.size > 30 * 1024 * 1024) return rej(new Error("huge"));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? res({ blob: b, w: img.naturalWidth, h: img.naturalHeight }) : rej(new Error("encode"))), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("decode")); };
    img.src = url;
  });
  // images still being resized; Continue / Submit wait for these so nothing is silently dropped
  const pending = new Set();
  const track = (fn) => () => { const p = fn(); pending.add(p); p.finally(() => pending.delete(p)); };
  const settle = () => Promise.allSettled([...pending]);
  const photoIn = $("#j-photo"), preview = $("#photoPreview"), photoLabel = $("#photoLabel");
  photoIn.addEventListener("change", track(async () => {
    const f = photoIn.files[0], field = photoIn.closest(".field");
    if (!f) return;
    try {
      const r = await shrink(f);
      if (Math.min(r.w, r.h) < 300) throw new Error("small");
      photoBlob = r.blob;
      preview.src = URL.createObjectURL(r.blob); preview.hidden = false;
      photoLabel.textContent = "Change photo";
      setErr(field, false);
    } catch (e) {
      photoBlob = null; preview.hidden = true; photoLabel.textContent = "Choose a photo";
      setErr(field, true, e.message === "small" ? "That photo is too small. Use one at least 300 px wide."
        : e.message === "huge" ? "That file is too large. Choose a normal photo from your gallery."
        : "We couldn't open that photo. Use a JPG or PNG. On iPhone, a screenshot of the photo works.");
    }
  }));
  const insIn = $("#j-ins"), insCount = $("#insCount");
  let ytInsightBlobs = [];
  const ytIn = $("#j-ytins"), ytCount = $("#ytInsCount");
  ytIn.addEventListener("change", track(async () => {
    const out = [];
    for (const f of [...ytIn.files].slice(0, 2)) { try { out.push((await shrink(f, 2000)).blob); } catch { /* skip unreadable */ } }
    ytInsightBlobs = out;
    ytCount.textContent = out.length ? `${out.length} screenshot${out.length > 1 ? "s" : ""} ready${ytIn.files.length > 2 ? " (first 2 kept)" : ""}` : "";
  }));
  insIn.addEventListener("change", track(async () => {
    const out = [];
    for (const f of [...insIn.files].slice(0, 3)) { try { out.push((await shrink(f, 2000)).blob); } catch { /* skip unreadable */ } }
    insightBlobs = out;
    insCount.textContent = out.length ? `${out.length} screenshot${out.length > 1 ? "s" : ""} ready${insIn.files.length > 3 ? " (first 3 kept)" : ""}` : "";
  }));

  /* ---------- draft: survives a refresh or a dropped connection ---------- */
  // private answers are never kept on the device (shared phones, cyber cafés)
  const SKIP = new Set(["website", "consent", "email", "phone", "whatsapp", "date_of_birth", "gender", "anything_else",
    "rate_reel", "rate_story", "rate_post", "rate_collab", "rate_yt_short", "rate_yt_long"]);
  const saveDraft = () => {
    const d = {};
    for (const el of form.elements) {
      if (!el.name || SKIP.has(el.name) || el.type === "file") continue;
      if (el.type === "checkbox") { (d[el.name] = d[el.name] || []); if (el.checked) d[el.name].push(el.value); }
      else d[el.name] = el.value;
    }
    try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch { /* private mode */ }
  };
  const loadDraft = () => {
    let d; try { d = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch { d = null; }
    if (!d) return;
    for (const el of form.elements) {
      if (!el.name || !(el.name in d) || el.type === "file") continue;
      if (el.type === "checkbox") el.checked = d[el.name].includes(el.value); else el.value = d[el.name];
    }
    $$("[data-chips][data-max]", form).forEach((b) => b.dispatchEvent(new Event("change")));
    $$("[data-count]", form).forEach((el) => el.dispatchEvent(new Event("input")));
  };
  form.addEventListener("input", saveDraft);
  form.addEventListener("change", saveDraft);
  loadDraft();
  syncExtras();

  /* ---------- API ---------- */
  const headers = (extra) => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, ...extra });
  async function rpc(fn, body) {
    const r = await fetch(`${API}/rest/v1/rpc/${fn}`, { method: "POST", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    if (!r.ok) { const e = new Error((j && j.message) || "Request failed"); e.hint = j && j.hint; throw e; }
    return j;
  }
  async function upload(blob) {
    const path = `pending/${crypto.randomUUID()}.jpg`;
    const r = await fetch(`${API}/storage/v1/object/creator-uploads/${path}`, { method: "POST", headers: headers({ "Content-Type": "image/jpeg", "x-upsert": "false" }), body: blob });
    if (!r.ok) throw Object.assign(new Error("Upload failed"), { hint: "photo" });
    return path;
  }
  const payload = (photoPath, insights, ytInsights) => {
    const f = form.elements, v = (n) => f[n].value.trim(), on = (n) => $$(`input[name=${n}]:checked`, form).map((x) => x.value);
    const rates = {};
    ["reel", "story", "post", "collab", "yt_short", "yt_long"].forEach((k) => { const x = v(`rate_${k}`).replace(/[₹,\s]/g, ""); if (x) rates[k] = x; });
    return {
      website: v("website"),
      handle: normHandle(v("handle")), name: v("name"), city: v("city"), state: v("state"),
      langs: on("langs").map((x) => (x === "Other" ? v("lang_other") : x)).filter(Boolean), platforms: on("platforms"), niches: on("niches"), roles: on("roles"), collabs: on("collabs"),
      ig_followers: parseCount(v("ig_followers")), yt_subscribers: parseCount(v("yt_subscribers")) || 0,
      yt_link: v("yt_link"), other_link: v("other_link"), avg_views: v("avg_views"), audience_in: v("audience_in"),
      posts_consistently: v("posts_consistently"), setup: v("setup"),
      open_to_travel: v("open_to_travel") === "" ? null : v("open_to_travel") === "true",
      best_posts: ["best_post_1", "best_post_2", "best_post_3"].map(v).filter(Boolean),
      niche_other: on("niches").includes("Other") ? v("niche_other") : "", style: v("style"),
      worked_with_brands: v("worked_with_brands") === "" ? null : v("worked_with_brands") === "true",
      brands: v("worked_with_brands") === "false" ? "" : v("brands"), portfolio_link: v("portfolio_link"), bio: v("bio"),
      photo_path: photoPath, insights_paths: insights, yt_insights_paths: ytInsights,
      email: v("email"), phone: v("phone"), whatsapp: v("whatsapp"), date_of_birth: v("date_of_birth"), gender: v("gender"),
      rates, anything_else: v("anything_else"), consent: f.consent.checked, consent_version: CONSENT_VERSION,
    };
  };

  /* ---------- status ---------- */
  function clearStatus() { status.classList.remove("is-shown"); status.textContent = ""; }
  const say = (msg) => { status.textContent = msg; status.classList.add("is-shown"); };
  const email = (window.RT && RT.site && RT.site.email) || "";

  if (!READY) {
    const box = $("#joinSetup");
    box.hidden = false; box.classList.add("is-shown");
    box.innerHTML = CFG.fallbackForm
      ? `Online registration opens soon. For now, please <a href="${CFG.fallbackForm}" target="_blank" rel="noopener">register using our Google Form</a>.`
      : `Online registration opens soon. Fill in your details and we'll save them on this device until it's ready.`;
  }

  /* ---------- submit / next ---------- */
  let busy = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    clearStatus();
    if (pending.size) { busy = true; say("Getting your photos ready…"); await settle(); busy = false; clearStatus(); }
    if (!validate(step)) return;
    if (step < last) { show(step + 1); return; }
    if (!READY) { say(`Registration isn't connected yet. Your answers are saved on this device. ${email ? "Or email us at " + email + "." : ""}`); return; }
    busy = true; next.disabled = true; say("Uploading your photo…");
    try {
      const photoPath = await upload(photoBlob);
      const insights = [];
      for (const b of insightBlobs) insights.push(await upload(b));
      const ytInsights = [];
      for (const b of ytInsightBlobs) ytInsights.push(await upload(b));
      say("Saving your registration…");
      await rpc("submit_creator", { p: payload(photoPath, insights, ytInsights) });
      try { localStorage.removeItem(DRAFT); } catch { /* ignore */ }
      form.hidden = true;
      const done = $("#joinDone"); done.hidden = false; done.focus();
      $$("#joinProgress li").forEach((li) => { li.classList.add("is-done"); li.removeAttribute("aria-current"); });
    } catch (err) {
      const s = HINT_STEP[err.hint];
      if (s) {
        show(s);
        const field = err.hint === "insights" ? $("#j-ins").closest(".field") : fieldOf(["photo", "consent"].includes(err.hint) ? `[data-required=${err.hint}]` : err.hint);
        if (err.hint === "handle") handleTaken = /already/.test(err.message);
        setErr(field, true, err.message);
        say(err.message);
      } else if (err.hint) {
        say(err.message); // e.g. rate limit: the server's own wording is the clearest
      } else {
        say(navigator.onLine === false
          ? "You seem to be offline. Your answers are saved; press Submit again when you're back online."
          : `Something went wrong on our side. Your answers are saved; please try again in a minute${email ? " or email " + email : ""}.`);
      }
    } finally { busy = false; next.disabled = false; }
  });

  show(1, false);
})();
