/* Intro loader (home page).
   A white Right Team pill sits on the gradient sheet; service words ride a wavy
   ribbon out from behind it, the last one ("LEADS") settles with the pill as a
   tag, then everything dissolves into the hero sheet underneath.

   When it plays (the gate is the inline script in index.html <head>):
   - once per visit across ALL tabs: skipped for 30 minutes after it last started
     in any tab (localStorage), and for the rest of this tab's session;
   - never with prefers-reduced-motion, or when arriving on a #hash link.
   Add ?intro=1 to the URL to replay it. */
(() => {
  const root = document.documentElement;
  const intro = document.getElementById("intro");
  if (!intro) { window.RT_introDone = Promise.resolve(); return; }

  const force = /[?&]intro=1/.test(location.search);
  if (root.classList.contains("intro-skip") && !force) {
    intro.remove();
    window.RT_introDone = Promise.resolve();
    return;
  }
  root.classList.remove("intro-skip");
  root.classList.add("intro-on");

  let resolveDone;
  window.RT_introDone = new Promise((r) => (resolveDone = r));
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    markSeen();
    clearTimeout(safety);
    root.classList.remove("intro-on");
    intro.remove();
    // older iOS can still scroll the page behind a fixed overlay; land on the hero
    if (window.scrollY > 0) window.scrollTo(0, 0);
    resolveDone();
  };
  // Mark at START, not end, so a second tab opened mid-intro doesn't replay it.
  const markSeen = () => {
    try { sessionStorage.setItem("rt-intro", "1"); localStorage.setItem("rt-intro-at", String(Date.now())); } catch (e) {}
  };
  let safety = 0;
  // block touch scrolling behind the overlay (Lenis only handles the wheel)
  intro.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  if (!window.gsap) { finish(); return; }

  const svg = intro.querySelector(".intro__svg");
  const path = intro.querySelector("#introWave");
  const words = [...intro.querySelectorAll(".intro__word")];
  const offsets = words.map((w) => w.querySelector("textPath"));
  const last = words[words.length - 1];
  const lastOffset = offsets[offsets.length - 1];
  const pill = intro.querySelector(".intro__pill");
  const grad = intro.querySelector(".intro__grad");

  // the ribbon: a sine wave longer than the view so words can enter and leave
  const wave = { A: 0, phase: 0, k: 0.0062 };
  const draw = () => {
    let d = "";
    for (let i = 0; i <= 140; i++) {
      const x = -900 + i * (2800 / 140);
      const y = 200 + wave.A * Math.sin(wave.k * (x - 500) + wave.phase);
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    path.setAttribute("d", d);
  };
  draw();
  gsap.set(offsets, { attr: { startOffset: "100%" } });

  const tl = gsap.timeline({ paused: true, onComplete: finish });
  const flyers = offsets.slice(0, -1);
  const gap = 0.26;
  const tLast = 0.6 + flyers.length * gap + 0.25;

  tl.from(pill, { scale: 0, rotate: -10, duration: 0.6, ease: "back.out(2.2)" }, 0.1)
    .to(wave, { A: 72, duration: 1.2, ease: "sine.inOut", onUpdate: draw }, 0.35)
    .to(wave, { phase: Math.PI * 2.4, duration: tLast + 0.9, ease: "none", onUpdate: draw }, 0.35)
    .to(pill, { rotate: -5, scaleX: 1.07, duration: 0.3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0.6);

  // words fly through behind the pill, squashing as they pass the bend
  flyers.forEach((tp, i) => {
    const at = 0.6 + i * gap;
    tl.fromTo(tp, { attr: { startOffset: "96%" } }, { attr: { startOffset: "4%" }, duration: 1.15, ease: "power1.inOut" }, at)
      .fromTo(words[i], { scaleY: 0.55, skewX: -18 }, { scaleY: 1, skewX: 0, duration: 0.55, ease: "sine.out", yoyo: true, repeat: 1, transformOrigin: "50% 50%" }, at);
  });

  // the last word settles in the middle, the pill becomes its tag
  const tagPos = () => {
    const b = last.getBBox();
    const s = svg.getBoundingClientRect().width / 1000;
    return { x: -(b.width * s) / 2 + pill.offsetWidth * 0.42, y: -(b.height * s) / 2 - pill.offsetHeight * 0.1 };
  };
  tl.fromTo(lastOffset, { attr: { startOffset: "96%" } }, { attr: { startOffset: "50%" }, duration: 1, ease: "power3.out" }, tLast)
    .to(wave, { A: 16, duration: 0.9, ease: "power2.out", onUpdate: draw }, tLast + 0.2)
    .to(pill, { x: () => tagPos().x, y: () => tagPos().y, rotate: -8, scale: 0.92, duration: 0.7, ease: "power3.out" }, tLast + 0.35)
    // hold, then the word slides back behind the pill and the gradient dissolves
    .addLabel("out", "+=0.45")
    .to(pill, { x: 0, y: 0, rotate: 0, scale: 1, duration: 0.5, ease: "power3.inOut" }, "out")
    .to(wave, { A: 60, duration: 0.5, ease: "power2.in", onUpdate: draw }, "out")
    .to(last, { scaleX: 0.08, scaleY: 0.3, opacity: 0, duration: 0.5, ease: "power3.in", transformOrigin: "50% 50%" }, "out+=0.05")
    .to(grad, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, "out+=0.45")
    .to(pill, { scale: 0.6, opacity: 0, duration: 0.4, ease: "power2.in" }, "out+=0.6")
    .to(intro, { opacity: 0, duration: 0.35, ease: "none" }, "out+=0.95");

  const skip = () => tl.progress(1);
  intro.querySelector(".intro__skip").addEventListener("click", skip);
  intro.addEventListener("click", (e) => { if (!e.target.closest(".intro__skip")) skip(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !finished) skip(); });

  // Start only when (a) the heavy display weight has loaded, so the words don't
  // swap fonts mid-flight, and (b) the tab is visible — a tab opened in the
  // background waits and plays when the visitor actually looks at it.
  const fontReady = document.fonts && document.fonts.load
    ? document.fonts.load('800 148px "Bricolage Grotesque"').catch(() => {})
    : Promise.resolve();
  let started = false;
  const start = () => {
    if (started || finished) return;
    started = true;
    markSeen();
    draw();
    tl.play();
    armSafety(9000);
  };
  // never trap the visitor: cap the intro at 9s of *visible* time
  const armSafety = (ms) => {
    clearTimeout(safety);
    safety = setTimeout(() => { if (finished) return; document.hidden ? armSafety(1500) : skip(); }, ms);
  };
  const whenVisible = () => {
    if (!document.hidden) return start();
    const onVis = () => { if (!document.hidden) { document.removeEventListener("visibilitychange", onVis); start(); } };
    document.addEventListener("visibilitychange", onVis);
  };
  Promise.race([fontReady, new Promise((r) => setTimeout(r, 1200))]).then(whenVisible);
  // back/forward cache: if the page comes back mid-intro, just finish it
  addEventListener("pageshow", (e) => { if (e.persisted && !finished) skip(); });
})();
