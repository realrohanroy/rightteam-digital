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

/* ==========================================================================
   CREATORS — the network shown on creators.html.
   EVERY ENTRY BELOW IS A SAMPLE (stock photo + made-up stats) and shows a
   "Sample" tag. Replace with your onboarded creators and delete `sample: true`.
   followers / avgViews are plain numbers; eng = engagement rate in %.
   audience: share of women (%), the biggest age band, the top city.
   ========================================================================== */
window.RT.creators = [
  ["ananya.cooks", "Ananya Rao", "Pune", ["Food"], ["Marathi", "Hindi", "English"], ["Instagram", "YouTube"], 86000, 5.8, 32000, "1533128361669-69c065857a13", "Weeknight Maharashtrian recipes in under 20 minutes.", [64, "25–34", "Pune"]],
  ["meera.styles", "Meera Iyer", "Chennai", ["Fashion"], ["Tamil", "English"], ["Instagram"], 214000, 3.9, 61000, "1463335361701-e90f4c5045d0", "Everyday ethnic wear styled three ways.", [78, "18–24", "Chennai"]],
  ["kavyashah.finance", "Kavya Shah", "Ahmedabad", ["Finance"], ["Gujarati", "Hindi"], ["Instagram", "YouTube"], 132000, 4.6, 48000, "1789500381106-ba13068a6520", "Money basics for small-business families.", [52, "25–34", "Ahmedabad"]],
  ["ishita.weaves", "Ishita Banerjee", "Kolkata", ["Fashion", "DIY"], ["Bengali", "English"], ["Instagram"], 48000, 7.1, 22000, "1793024981458-3b3773613794", "Handloom finds and the weavers behind them.", [81, "25–34", "Kolkata"]],
  ["riya.reviews", "Riya Kulkarni", "Mumbai", ["Tech"], ["Hindi", "Marathi", "English"], ["Instagram", "YouTube"], 390000, 3.2, 140000, "1759840278326-73f26ae8c5c7", "Honest gadget reviews under ₹30,000.", [41, "18–24", "Mumbai"]],
  ["poojatravels", "Pooja Nair", "Kochi", ["Travel"], ["Malayalam", "English"], ["Instagram"], 76000, 5.2, 29000, "1774437890454-634d48db52c8", "Slow travel across Kerala and the south.", [58, "25–34", "Kochi"]],
  ["aaji.kitchen", "Lata Aaji", "Nashik", ["Food"], ["Marathi"], ["Instagram", "YouTube"], 610000, 6.4, 260000, "1713078582993-fdd86b1a2c1f", "Grandma's recipes, exactly as she makes them.", [69, "35–44", "Pune"]],
  ["sneha.fit", "Sneha Gupta", "Delhi", ["Fitness"], ["Hindi", "English"], ["Instagram"], 158000, 4.1, 55000, "1759840278471-462cf3fcebd3", "Home workouts for busy working women.", [83, "25–34", "Delhi"]],
  ["arjun.builds", "Arjun Menon", "Bengaluru", ["Business"], ["English", "Kannada"], ["Instagram", "YouTube"], 95000, 4.9, 38000, "1670110531916-41045e83cb0a", "Founder stories and how they got their first 100 customers.", [34, "25–34", "Bengaluru"]],
  ["rohit.techtalk", "Rohit Verma", "Hyderabad", ["Tech"], ["Telugu", "Hindi"], ["YouTube", "Instagram"], 270000, 3.6, 95000, "1724225618359-a1d2763326f9", "Apps and AI tools explained in Telugu.", [29, "18–24", "Hyderabad"]],
  ["karthik.frames", "Karthik S", "Chennai", ["Travel"], ["Tamil"], ["Instagram"], 64000, 6.0, 27000, "1667382136327-5f78dc5cf835", "Street photography and hidden food spots.", [37, "25–34", "Chennai"]],
  ["sahil.farmstories", "Sahil Pawar", "Satara", ["Agri"], ["Marathi", "Hindi"], ["Instagram", "YouTube"], 42000, 8.3, 21000, "1727278465739-b3b5266e18de", "Modern farming that actually pays.", [18, "25–34", "Satara"]],
  ["dev.unfiltered", "Dev Malhotra", "Delhi", ["Lifestyle", "Comedy"], ["Hindi"], ["Instagram"], 520000, 4.4, 210000, "1712425718085-cdd2b2298669", "Everyday Delhi life, played for laughs.", [46, "18–24", "Delhi"]],
  ["imran.biryani", "Imran Qureshi", "Lucknow", ["Food"], ["Hindi", "Urdu"], ["Instagram", "YouTube"], 180000, 5.0, 74000, "1701721865389-9935778b40e3", "Awadhi kitchens and the families who run them.", [44, "25–34", "Lucknow"]],
  ["dada.speaks", "Harish Dada", "Indore", ["Business"], ["Hindi"], ["Instagram"], 28000, 9.1, 15000, "1596604820148-da737958af16", "Forty years of trading wisdom, one reel at a time.", [31, "35–44", "Indore"]],
  ["nikhil.money", "Nikhil Joshi", "Pune", ["Finance"], ["Marathi", "Hindi", "English"], ["Instagram", "YouTube"], 118000, 4.7, 43000, "1576948609819-638f90b85b1b", "Tax, SIPs and insurance without the jargon.", [38, "25–34", "Pune"]],
  ["tanvi.makes", "Tanvi Desai", "Surat", ["DIY", "Lifestyle"], ["Gujarati", "Hindi"], ["Instagram"], 22000, 9.4, 12000, "1610014331379-f2a27bde2b66", "Home decor on a small budget.", [86, "25–34", "Surat"]],
  ["aditya.vlogs", "Aditya Rane", "Mumbai", ["Lifestyle"], ["Hindi", "Marathi"], ["Instagram", "YouTube"], 305000, 3.8, 118000, "1695391396401-5fbb4bedafc1", "Small-shop owners and the stories behind their counters.", [40, "18–24", "Mumbai"]],
].map(([handle, name, city, niches, langs, platforms, followers, eng, avgViews, photo, bio, [women, age, topCity]], i) => ({
  handle, name, city, niches, langs, platforms, followers, eng, avgViews, bio,
  photo: u(photo, 600, 760), avatar: u(photo, 120, 120),
  audience: { women, age, topCity },
  tint: ["#c9f0dc", "#e1d8ff", "#ffeab0", "#cfe7ff", "#ffd9c7", "#e6f7a8"][i % 6],
  sample: true,
}));
