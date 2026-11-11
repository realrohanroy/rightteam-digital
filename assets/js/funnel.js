/* The lead engine: a scroll-driven particle funnel.
   Strangers (pale dots) are pulled into the funnel, unqualified leads fall away,
   qualified ones turn lime and gather in the "sales" ring at the bottom. */
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
  const geo = new THREE.BufferGeometry();
  const seeds = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seeds[i] = Math.random();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));

  const uniforms = {
    uTime: { value: 0 },
    uProg: { value: reduce ? 1 : 0 },
    uSize: { value: mobile ? 95 : 120 },
    uPR: { value: renderer.getPixelRatio() },
    uQual: { value: QUAL },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime, uProg, uSize, uPR, uQual;
      varying float vAlpha;
      varying float vQual;
      #define TAU 6.28318530718
      float ease(float t) { return t * t * (3.0 - 2.0 * t); }
      void main() {
        float qual = step(aSeed.w, uQual);

        // A — attention: a wide, drifting field of people
        vec3 a = (aSeed.xyz - 0.5) * vec3(16.0, 9.0, 7.0);
        a.x += cos(uTime * 0.21 + aSeed.y * TAU) * 0.3;
        a.y += sin(uTime * 0.27 + aSeed.x * TAU) * 0.3;

        // B — capture: a spiralling funnel
        float t = fract(aSeed.y + uTime * 0.04 * (0.6 + aSeed.z));
        float ang = aSeed.x * TAU + uTime * (0.5 + aSeed.z * 0.5) + t * 7.0;
        float r = mix(2.9, 0.24, pow(t, 0.72)) * (0.86 + aSeed.z * 0.28);
        vec3 b = vec3(cos(ang) * r, mix(2.7, -1.7, t), sin(ang) * r);

        // C — qualify: the rest slip out and fall away
        vec3 fall = b + vec3((aSeed.x - 0.5) * 6.0, -4.0 - aSeed.z * 4.0, (aSeed.y - 0.5) * 3.0);

        // D — convert: qualified leads circle the sales ring
        float a2 = aSeed.x * TAU + uTime * (0.7 + aSeed.z * 0.6);
        float rr = 0.6 + aSeed.z * 0.55;
        vec3 d = vec3(cos(a2) * rr, -2.1 + (aSeed.y - 0.5) * 0.35 + sin(a2 * 2.0) * 0.08, sin(a2) * rr * 0.55);

        float p1 = ease(clamp(uProg / 0.3, 0.0, 1.0));
        float p2 = ease(clamp((uProg - 0.36) / 0.24, 0.0, 1.0));
        float p3 = ease(clamp((uProg - 0.66) / 0.24, 0.0, 1.0));

        vec3 pos = mix(a, b, p1);
        pos = mix(pos, mix(fall, b, qual), p2);
        pos = mix(pos, d, qual * p3);

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;

        vQual = qual * p2;
        vAlpha = mix(0.55, 0.9, aSeed.z) * (1.0 - (1.0 - qual) * p2 * 0.9);
        float size = uSize * (0.45 + aSeed.z * 0.7) * (1.0 + vQual * 0.9 + qual * p3 * 0.5);
        gl_PointSize = size * uPR / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vQual;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        vec3 pale = vec3(0.78, 0.87, 1.0);
        vec3 lime = vec3(0.83, 0.95, 0.42);
        vec3 col = mix(pale, lime, vQual);
        gl_FragColor = vec4(col, core * core * vAlpha);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  /* ---- funnel guide rings ---- */
  const ringMats = [];
  const ringAt = (y, r, opacity, color = 0xffffff) => {
    const pts = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
    m.userData.max = opacity;
    ringMats.push(m);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m);
    group.add(line);
    return m;
  };
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    ringAt(2.7 - t * 4.4, 2.9 - Math.pow(t, 0.72) * 2.66, 0.1 + t * 0.06);
  }
  const salesRing = ringAt(-2.1, 1.2, 0.9, 0xd4f36b);
  salesRing.userData.sales = true;

  /* ---- sizing: funnel sits right of the copy on desktop ---- */
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const visW = visH * camera.aspect;
    const narrow = w < 860;
    group.position.x = narrow ? 0 : visW * 0.2;
    group.position.y = narrow ? -0.2 : 0.35;
    group.scale.setScalar(narrow ? Math.min(0.8, visW / 7.5) : Math.min(0.82, visH / 8));
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
  const nQual = Math.round(N * QUAL);
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
      onUpdate: (self) => { target = self.progress; },
    });
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
    const ringIn = smooth(p / 0.3);
    const convert = smooth((p - 0.66) / 0.24);
    ringMats.forEach((m) => { m.opacity = m.userData.sales ? m.userData.max * convert : m.userData.max * ringIn * (1 - convert * 0.5); });
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
