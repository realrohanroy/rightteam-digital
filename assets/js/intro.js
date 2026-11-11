/* Intro loader (home page, once per session).
   A white Right Team pill sits on the gradient sheet; service words ride a wavy
   ribbon out from behind it, the last one ("LEADS") settles with the pill as a
   tag, then everything dissolves into the hero sheet underneath.
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
    try { sessionStorage.setItem("rt-intro", "1"); } catch (e) {}
    root.classList.remove("intro-on");
    intro.remove();
    resolveDone();
  };
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

  // start once the display font is ready (or after 900ms at most)
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 900))])
    .then(() => { draw(); tl.play(); });
  // never trap the visitor behind the intro
  setTimeout(() => !finished && skip(), 9000);
})();
