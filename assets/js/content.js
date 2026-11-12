/* ==========================================================================
   EDIT THIS FILE to put your own reels, work and contact details on the site.
   - Anything with `sample: true` shows a small "Sample" tag on the page.
     Replace it with your real item and delete `sample: true`.
   - Reels: drop your .mp4 files in /assets/reels/ and set `video`.
     `poster` is the still shown before playing (a frame from the reel works).
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

  reels: [
    { title: "Café launch hook", category: "Food & café", poster: u("1695408246612-584543865997"), video: "", link: "", views: "", sample: true },
    { title: "Founder talks to camera", category: "Personal brand", poster: u("1759393852314-59dc00faeed3"), video: "", link: "", views: "", sample: true },
    { title: "Product demo in 20 seconds", category: "D2C product", poster: u("1630797160668-2164d9518103"), video: "", link: "", views: "", sample: true },
    { title: "Behind the shoot", category: "Brand film", poster: u("1759393851741-674ee71fb498"), video: "", link: "", views: "", sample: true },
    { title: "Shop walkthrough", category: "Retail", poster: u("1695391396401-5fbb4bedafc1"), video: "", link: "", views: "", sample: true },
    { title: "Podcast clip", category: "Minicast", poster: u("1590602847861-f357a9332bbc"), video: "", link: "", views: "", sample: true },
    { title: "Street-style creator reel", category: "Creator collab", poster: u("1543525469-65b61cc2bc06"), video: "", link: "", views: "", sample: true },
    { title: "Owner's story", category: "Local business", poster: u("1761370571806-886404629697"), video: "", link: "", views: "", sample: true },
  ],

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
