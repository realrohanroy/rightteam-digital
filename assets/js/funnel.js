/* The lead engine: scroll turns a crowd into a shortlist.
   A drifting crowd (pale dots) becomes one flowing current; a lime gate stops
   the unqualified (they drop away) and the few that pass turn lime. Those then
   fill a shortlist panel row by row: an avatar and two lines of "text". */
import * as THREE from "three";

const section = document.querySelector(".engine");
const stage = section && section.querySelector(".engine__stage");
if (stage) init();

function init() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 860px)").matches;
  const N = mobile ? 1500 : 2800;
  const QUAL = 0.14;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) { stage.classList.add("no-webgl"); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x0b2e56, 1);
  stage.prepend(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.6, 11);
  const group = new THREE.Group();
  scene.add(group);

  /* ---- particles ---- */
  // The first nQual particles are the qualified leads; aSlot.y is each one's
  // place in the shortlist (row by row: an avatar cluster, then two text lines).
  const nQual = Math.round(N * QUAL);
  const ROWS = 7;
  const PER = Math.ceil(nQual / ROWS);
  const AV = Math.max(6, Math.round(PER * 0.25));
  const geo = new THREE.BufferGeometry();
  const seeds = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seeds[i] = Math.random();
  const slots = new Float32Array(N * 2);
  for (let i = 0; i < nQual; i++) { slots[i * 2] = 1; slots[i * 2 + 1] = i; }
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  geo.setAttribute("aSlot", new THREE.BufferAttribute(slots, 2));

  // the stream runs X0 → X1; the gate stands at TG of the way along
  const X0 = -3.9, X1 = 3.9, TG = 0.62, GATE_X = X0 + (X1 - X0) * TG;
  // shortlist panel: rows start at ROW_TOP, avatar column at LX
  const LX = -1.5, ROW_TOP = 1.65, ROW_GAP = 0.55;
  const f = (n) => n.toFixed(4);

  const uniforms = {
    uTime: { value: 0 },
    uProg: { value: reduce ? 1 : 0 },
    uSize: { value: mobile ? 95 : 120 },
    uPR: { value: renderer.getPixelRatio() },
    uPer: { value: PER },
    uAv: { value: AV },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      attribute vec2 aSlot;
      uniform float uTime, uProg, uSize, uPR, uPer, uAv;
      varying float vAlpha;
      varying float vQual;
      varying float vText;
      #define TAU 6.28318530718
      float ease(float t) { return t * t * (3.0 - 2.0 * t); }
      void main() {
        float qual = aSlot.x;

        // A — attract: a wide, drifting crowd
        vec3 a = (aSeed.xyz - 0.5) * vec3(16.0, 9.0, 7.0);
        a.x += cos(uTime * 0.21 + aSeed.y * TAU) * 0.3;
        a.y += sin(uTime * 0.27 + aSeed.x * TAU) * 0.3;

        // B — capture: the crowd becomes one flowing current, left to right
        float t = fract(aSeed.y + uTime * 0.05 * (0.7 + aSeed.z * 0.6));
        float x = mix(${f(X0)}, ${f(X1)}, t);
        float lane = (aSeed.z - 0.5) * 1.15;
        vec3 b = vec3(x, lane + sin(x * 0.9 - uTime * 1.2 + aSeed.x * 0.6) * 0.32, (aSeed.x - 0.5) * 0.9);
        float ends = smoothstep(0.0, 0.07, t) * smoothstep(1.0, 0.93, t);

        // C — qualify: a gate across the stream; the rest hit it and drop away
        float gone = step(${f(TG)}, t);
        float past = max(t - ${f(TG)}, 0.0);
        float pd = min(past, 0.09);
        vec3 pile = vec3(${f(GATE_X)} - 0.1 - pd * 0.8, b.y - pd * 4.0 - pd * pd * 40.0, b.z);
        vec3 c = mix(mix(b, pile, gone), b, qual);

        // D — convert: qualified leads fill a shortlist, one row at a time
        float k = aSlot.y;
        float row = floor(k / uPer);
        float j = k - row * uPer;
        float y0 = ${f(ROW_TOP)} - row * ${f(ROW_GAP)};
        float h = fract(sin((row + 1.0) * 12.9898) * 43758.5453);
        float text = step(uAv, j);
        vec3 d;
        if (j < uAv) {
          float ang = j * 2.39996;
          float rr = 0.17 * sqrt((j + 0.5) / uAv);
          d = vec3(${f(LX)} + cos(ang) * rr, y0 + sin(ang) * rr, 0.0);
        } else {
          float i = j - uAv;
          float nt = uPer - uAv;
          float n1 = floor(nt * 0.62);
          d = i < n1
            ? vec3(${f(LX)} + 0.38 + i / max(n1 - 1.0, 1.0) * (1.5 + h * 0.9), y0 + 0.075, 0.0)
            : vec3(${f(LX)} + 0.38 + (i - n1) / max(nt - n1 - 1.0, 1.0) * (0.7 + h * 0.5), y0 - 0.1, 0.0);
        }
        d.y += sin(uTime * 0.8 + row) * 0.015;

        float p1 = ease(clamp(uProg / 0.3, 0.0, 1.0));
        float p2 = ease(clamp((uProg - 0.36) / 0.24, 0.0, 1.0));
        float p3 = ease(clamp((uProg - 0.66) / 0.24, 0.0, 1.0));
        float rp = qual * ease(clamp(p3 * 1.6 - row * 0.09, 0.0, 1.0));

        vec3 pos = mix(a, b, p1);
        pos = mix(pos, c, p2);
        pos = mix(pos, d, rp);

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;

        vQual = qual * max(p2 * gone, rp);
        vText = text * rp;
        float endsA = mix(1.0, ends, p1 * (1.0 - rp));
        float rejA = 1.0 - (1.0 - qual) * p2 * gone * smoothstep(0.0, 0.07, past);
        float outA = 1.0 - (1.0 - qual) * p3 * 0.97;
        vAlpha = mix(0.55, 0.9, aSeed.z) * endsA * rejA * outA * mix(1.0, 0.8, vText);
        float size = uSize * (0.45 + aSeed.z * 0.7) * (1.0 + vQual * 0.6);
        size *= mix(1.0, mix(1.2, 0.55, text), rp);
        gl_PointSize = size * uPR / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vQual;
      varying float vText;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        vec3 pale = vec3(0.78, 0.87, 1.0);
        vec3 lime = vec3(0.83, 0.95, 0.42);
        vec3 col = mix(pale, lime, vQual);
        col = mix(col, vec3(0.92, 0.96, 0.86), vText * 0.55);
        gl_FragColor = vec4(col, core * core * vAlpha);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  /* ---- guides: the qualifying gate and the shortlist panel ---- */
  const lineMat = (color, max) => {
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    m.userData.max = max;
    return m;
  };
  const gateMat = lineMat(0xd4f36b, 0.85);
  const gatePts = [];
  for (let i = 0; i < 14; i++) {
    const y = -1.25 + i * (2.5 / 14);
    gatePts.push(new THREE.Vector3(GATE_X, y, 0), new THREE.Vector3(GATE_X, y + 0.11, 0));
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gatePts), gateMat));

  const panelMat = lineMat(0xffffff, 0.22);
  const sepMat = lineMat(0xffffff, 0.08);
  const pl = LX - 0.4, pr = LX + 3.3, pt = ROW_TOP + 0.42, pb = ROW_TOP - (ROWS - 1) * ROW_GAP - 0.42, rad = 0.28;
  const panelPts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); panelPts.push(new THREE.Vector3(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 0)); }
  };
  corner(pr - rad, pt - rad, 0); corner(pl + rad, pt - rad, Math.PI / 2);
  corner(pl + rad, pb + rad, Math.PI); corner(pr - rad, pb + rad, Math.PI * 1.5);
  panelPts.push(panelPts[0].clone());
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(panelPts), panelMat));
  const sepPts = [];
  for (let r = 0; r < ROWS - 1; r++) {
    const y = ROW_TOP - r * ROW_GAP - ROW_GAP / 2;
    sepPts.push(new THREE.Vector3(pl + 0.2, y, 0), new THREE.Vector3(pr - 0.2, y, 0));
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(sepPts), sepMat));

  /* ---- sizing: funnel sits right of the copy on desktop ---- */
  let baseScale = 1, listBoost = 1;
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const visW = visH * camera.aspect;
    const narrow = w < 860;
    group.position.x = narrow ? 0 : visW * 0.22;
    group.position.y = narrow ? -0.2 : 0.2;
    baseScale = narrow ? Math.min(0.8, visW / 8.2) : Math.min(0.82, visH / 8, (visW * 0.54) / 8);
    // phones: the 8-unit stream sets the scale; the 3.7-unit shortlist can grow to fill the width
    listBoost = narrow ? Math.max(1, Math.min(1.8, visW / 4.6 / baseScale)) : 1;
    group.scale.setScalar(baseScale);
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  /* ---- pointer tilt ---- */
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.35;
    tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.18;
  });

  /* ---- copy + readout ---- */
  const steps = [...section.querySelectorAll(".engine__step")];
  const readout = section.querySelector("[data-readout]");
  const setStep = (p) => {
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
    steps.forEach((s, i) => s.classList.toggle("is-active", reduce || i === idx));
    if (readout) {
      const seen = N;
      const enq = Math.round(N * (0.35 + 0.65 * (1 - smooth((p - 0.36) / 0.24))));
      readout.querySelector("[data-n=seen]").textContent = seen.toLocaleString("en-IN");
      readout.querySelector("[data-n=in]").textContent = (p < 0.3 ? Math.round(N * p / 0.3) : enq).toLocaleString("en-IN");
      readout.querySelector("[data-n=q]").textContent = p > 0.36 ? nQual.toLocaleString("en-IN") : "—";
    }
  };
  const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

  let target = reduce ? 1 : 0;
  if (!reduce && window.gsap && window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => "+=" + window.innerHeight * 3,
      pin: stage,
      scrub: true,
      anticipatePin: 1,
      // This module runs after site.js has created the triggers below this
      // section. Refresh this pin first so its 3-screen spacer is counted in
      // their start positions, otherwise they fire ~3 screens too early.
      refreshPriority: 1,
      onUpdate: (self) => { target = self.progress; },
    });
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }
  setStep(target);

  /* ---- render only while visible ---- */
  let visible = false, raf = 0;
  const clock = new THREE.Clock();
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduce) uniforms.uTime.value += dt;
    uniforms.uProg.value += (target - uniforms.uProg.value) * 0.08;
    const p = uniforms.uProg.value;
    tilt.x += (tilt.tx - tilt.x) * 0.05;
    tilt.y += (tilt.ty - tilt.y) * 0.05;
    group.rotation.y = tilt.x + (reduce ? 0 : Math.sin(uniforms.uTime.value * 0.15) * 0.08);
    group.rotation.x = 0.14 + tilt.y;
    const qualify = smooth((p - 0.34) / 0.1);
    const convert = smooth((p - 0.66) / 0.24);
    gateMat.opacity = gateMat.userData.max * qualify * (1 - convert);
    group.scale.setScalar(baseScale * (1 + (listBoost - 1) * convert));
    panelMat.opacity = panelMat.userData.max * convert;
    sepMat.opacity = sepMat.userData.max * convert;
    setStep(p);
    renderer.render(scene, camera);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { clock.getDelta(); tick(); }
    else if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: "100px" }).observe(section);
  window.__rtFunnel = { scene, renderer, camera, uniforms };
}
