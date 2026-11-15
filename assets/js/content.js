/* ==========================================================================
   EDIT THIS FILE to put your own reels, work and contact details on the site.
   - Anything with `sample: true` shows a small "Sample" tag on the page.
     Replace it with your real item and delete `sample: true`.
   - Reels: see the `reels` list below (Instagram links + saved covers).
     If you ever export a reel as .mp4, put it in /assets/reels/ and set
     `video` — it then plays from your own site instead of Instagram.
   - Only publish numbers you can verify (views, leads, cost per lead).
   ========================================================================== */

const u = (id, w = 600, h = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;

window.RT = {
  site: {
    name: "Right Team Digital",
    company: "Right Team Private Limited",
    email: "hello@rightteam.in",          // TODO confirm
    whatsapp: "",                         // e.g. "919800000000" (country code, no +). Empty hides WhatsApp.
    instagram: "https://www.instagram.com/", // TODO your handle
    linkedin: "https://www.linkedin.com/",   // TODO
    mainSite: "https://rightteam.in",        // TODO parent brand site
    // Paste a Formspree / Getform / your API URL to receive briefs directly.
    // Left empty, "Send My Brief" opens the visitor's email app with the brief filled in.
    formEndpoint: "",
    // Footer status ("At our desks" / "After hours"). India time, 24h clock,
    // days: 0 = Sunday … 6 = Saturday. TODO confirm your real office hours.
    hours: { tz: "Asia/Kolkata", open: 10, close: 19, days: [1, 2, 3, 4, 5, 6] },
  },

  /* Real reels. `ig` is the Instagram reel code (the part after /reel/ in the
     link): clicking a reel plays it in Instagram's official embed. `poster` is
     the cover saved in /assets/reels/. Order = order on the site; the first
     few fill the hero columns. Add `views: "1.2M"` only with a real number.
     To add one: save its cover as assets/reels/<code>.jpg and add a line. */
  reels: [
    { ig: "DfZdYdFuCL2", account: "smeexperts", title: "Dhanteras greeting", category: "Festive · Hindi" },
    { ig: "De9id8tuCez", account: "smeexperts", title: "Live from IIF 2026, Gandhinagar", category: "Event coverage" },
    { ig: "DeWoH46uf99", account: "smeexperts", title: "Navratri funding offer", category: "Festive · Gujarati" },
    { ig: "DPltXX-AGp7", account: "smeexperts", title: "Why register your trademark", category: "Explainer" },
    { ig: "DeBxOYdB4wh", account: "right.team", title: "Navratri, the corporate way", category: "Team culture" },
    { ig: "DPgg_gAABGO", account: "smeexperts", title: "Incorporation in one step", category: "Explainer" },
    { ig: "DXN4BkfzTP9", account: "udyammanch", title: "Webinar invite", category: "Event promo" },
    { ig: "DcToTLjxpWu", account: "right.team", title: "This office is nothing without us", category: "Office humour" },
    { ig: "CnACQiFAuJW", account: "farmingsolutionsindia", title: "Shade net & polyhouse setup", category: "Agri business" },
    { ig: "CmmF20-AAEY", account: "farmingsolutionsindia", title: "Tractor day on the farm", category: "Agri business" },
    { ig: "CPnsmDtHp_Q", account: "farmingsolutionsindia", title: "Seed to plant in 3 days", category: "Agri how-to" },
    { ig: "Cf1SkDtJx0G", account: "farmingsolutionsindia", title: "Veni, vidi, vici", category: "Trend reel" },
    { ig: "CNSZCalnIF7", account: "farmingsolutionsindia", title: "What is vermiwash?", category: "Agri explainer" },
  ].map((r) => ({
    poster: `assets/reels/${r.ig}.jpg`,
    link: `https://www.instagram.com/reel/${r.ig}/`,
    video: "",
    views: "",
    ...r,
  })),

  work: [
    {
      type: "leads", label: "Lead generation",
      title: "Enquiries for a home-interiors studio",
      image: u("1610014331379-f2a27bde2b66", 900, 760),
      brief: "Instagram brought likes but few site visits. The studio needed booked consultations.",
      role: "Meta lead ads, WhatsApp follow-up flow, landing page and weekly lead-quality report.",
      outcome: "", timeframe: "", sample: true,
    },
    {
      type: "reels", label: "Reels & video",
      title: "A reel series for a neighbourhood café",
      image: u("1695408246612-584543865997", 900, 760),
      brief: "Launch a new menu to people within 5 km without discounting.",
      role: "Scripts, shoot direction, editing and hooks for 12 reels over 6 weeks.",
      outcome: "", timeframe: "", sample: true,
    },
    {
      type: "creators", label: "Creators & media",
      title: "Regional creators for a D2C launch",
      image: u("1759393852314-59dc00faeed3", 900, 760),
      brief: "Reach Marathi- and Hindi-speaking buyers for a new home product.",
      role: "Creator shortlist, briefs, usage rights, approvals and reporting.",
      outcome: "", timeframe: "", sample: true,
    },
    {
      type: "leads", label: "Lead generation",
      title: "Google search for a clinic",
      image: u("1673214845662-5be3f64a4df1", 900, 760),
      brief: "Patients were searching, but the clinic wasn't showing up when they did.",
      role: "Search ads, Google Business Profile, call tracking and a booking page.",
      outcome: "", timeframe: "", sample: true,
    },
    {
      type: "creators", label: "Creators & media",
      title: "Founder minicast",
      image: u("1660631228116-b3643559f611", 900, 760),
      brief: "Make a founder easier to trust before a sales call.",
      role: "Topic plan, recording, edits and 3 short clips per episode.",
      outcome: "", timeframe: "", sample: true,
    },
    {
      type: "reels", label: "Reels & video",
      title: "Ad creatives cut from organic reels",
      image: u("1576948609819-638f90b85b1b", 900, 760),
      brief: "Turn reels that already performed into ads that bring enquiries.",
      role: "Re-edits with new hooks, captions and calls to action for Meta ads.",
      outcome: "", timeframe: "", sample: true,
    },
  ],

  creatorsAvatars: [
    u("1610014331379-f2a27bde2b66", 80, 80),
    u("1576948609819-638f90b85b1b", 80, 80),
    u("1759393852314-59dc00faeed3", 80, 80),
    u("1695391396401-5fbb4bedafc1", 80, 80),
  ],
};

/* Creators for creators.html live in assets/js/creators-data.js
   (generated from the registration form by tools/creators_from_form.py). */
