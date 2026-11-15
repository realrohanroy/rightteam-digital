/* "Our international presence" — a Three.js dotted world map on a gently curved
   surface. As the section scrolls through, arcs launch from Ahmedabad one after
   another, a glowing head runs along each, and the destination pulses and gets
   its label. Mapping must match tools/world_dots.mjs (KLON, KLAT, LON0). */
import * as THREE from "three";

const sec = document.querySelector(".world");
const stage = document.getElementById("worldStage");
const P = window.RT && window.RT.presence;
const DOTS = window.RT_WORLD_DOTS;
if (sec && stage && P && DOTS) init();

function init() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KLON = 0.47, KLAT = 0.5, LON0 = 15, R = 1, DEG = Math.PI / 180;
  const NAVY = 0x0f2140, LIME = 0xc6ec4f;
  const toVec = (lon, lat, r = R) => {
    let L = lon; if (L - LON0 > 180) L -= 360; if (L - LON0 < -180) L += 360;
    const th = (L - LON0) * KLON * DEG, ph = lat * KLAT * DEG;
    return new THREE.Vector3(r * Math.cos(ph) * Math.sin(th), r * Math.sin(ph), r * Math.cos(ph) * Math.cos(th));
  };

  /* accessible list (the canvas itself is decorative) */
  document.getElementById("worldList").innerHTML =
    [`<li class="is-origin"><b>${P.origin.city}</b> ${P.origin.country} · ${P.origin.note}</li>`]
      .concat(P.places.map((p) => `<li><b>${p.city}</b> ${p.country}</li>`)).join("");

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { stage.classList.add("no-webgl"); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.name = "presence-map";
  const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 50);
  const world = new THREE.Group(); world.name = "world"; scene.add(world);

  /* land dots: one instanced square per dot, laid flat on the surface */
  const n = DOTS.length / 2;
  const dotGeo = new THREE.PlaneGeometry(0.0078, 0.0078);
  const dotMat = new THREE.MeshBasicMaterial({ color: NAVY, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, n); dots.name = "land-dots";
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const v = toVec(DOTS[i * 2], DOTS[i * 2 + 1]);
    q.setFromUnitVectors(Z, v.clone().normalize());
    dots.setMatrixAt(i, m.compose(v, q, one));
  }
  world.add(dots);

  /* markers */
  const ringGeo = new THREE.RingGeometry(0.018, 0.024, 40);
  const coreGeo = new THREE.CircleGeometry(0.011, 24);
  const marker = (pos, color, coreColor) => {
    const g = new THREE.Group();
    g.position.copy(pos); g.quaternion.setFromUnitVectors(Z, pos.clone().normalize());
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: coreColor, transparent: true }));
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    core.position.z = ring.position.z = 0.002;
    g.add(core, ring); g.userData = { ring, core };
    world.add(g);
    return g;
  };
  const originPos = toVec(P.origin.lon, P.origin.lat);
  const origin = marker(originPos, LIME, NAVY); origin.name = "origin-ahmedabad";
  origin.scale.setScalar(1.35);

  /* arcs */
  const SEG = 90, RAD = 6;
  const arcs = P.places.map((p, i) => {
    const b = toVec(p.lon, p.lat);
    const len = originPos.distanceTo(b);
    const mid = originPos.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R + 0.12 + len * 0.42);
    const curve = new THREE.QuadraticBezierCurve3(originPos.clone(), mid, b);
    const geo = new THREE.TubeGeometry(curve, SEG, 0.0042, RAD, false);
    const total = geo.index.count;
    geo.setDrawRange(0, 0);
    const tube = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: NAVY, transparent: true, opacity: 0.85 }));
    tube.name = `arc-${p.city}`;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), new THREE.MeshBasicMaterial({ color: LIME }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.35, depthWrite: false }));
    head.add(halo); head.visible = false;
    const dest = marker(b, LIME, NAVY); dest.visible = false; dest.name = `dest-${p.city}`;
    world.add(tube, head);
    return { p, curve, geo, total, head, dest, b, t: 0 };
  });

  /* HTML labels that follow the projected 3D points */
  const labelsEl = document.getElementById("worldLabels");
  const mkLabel = (text, sub, cls = "") => {
    const el = document.createElement("div");
    el.className = "world__label " + cls;
    el.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ""}`;
    labelsEl.appendChild(el); return el;
  };
  const originLabel = mkLabel(P.origin.city, P.origin.note, "is-origin is-on");
  arcs.forEach((a) => (a.label = mkLabel(a.p.city, a.p.country)));
  const tmp = new THREE.Vector3();
  const placeLabel = (el, pos, w, h) => {
    tmp.copy(pos).applyMatrix4(world.matrixWorld).project(camera);
    const x = ((tmp.x + 1) / 2) * w;
    el.classList.toggle("is-left", x > w - (el.offsetWidth + 24)); // keep labels inside the stage
    el.style.transform = `translate(${x}px, ${((1 - tmp.y) / 2) * h}px)`;
  };

  /* framing: fit the whole curved map in the stage at any aspect */
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const halfV = Math.tan((camera.fov * DEG) / 2);
    const needH = 1.22, needW = 2.05; // map extent incl. arc headroom
    const d = Math.max(needH / (2 * halfV), needW / (2 * halfV * camera.aspect));
    camera.position.set(0, 0.32, 0.72 + d);
    camera.lookAt(0, 0.1, 0.55);
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  /* progress: scroll-scrubbed (static & complete for reduced motion) */
  let target = reduce ? 1 : 0, prog = target;
  if (!reduce && window.gsap && window.ScrollTrigger) {
    ScrollTrigger.create({ trigger: stage, start: "top 78%", end: "bottom 45%", scrub: true, onUpdate: (s) => { target = s.progress; } });
  }
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    stage.addEventListener("pointermove", (e) => { const r = stage.getBoundingClientRect(); tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.16; tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.08; });
    stage.addEventListener("pointerleave", () => { tilt.tx = tilt.ty = 0; });
  }

  const N = arcs.length, SPAN = 0.34, GAP = (1 - SPAN - 0.04) / Math.max(1, N - 1);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const clock = new THREE.Clock();
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const time = clock.getElapsedTime();
    prog += (target - prog) * 0.12;
    tilt.x += (tilt.tx - tilt.x) * 0.06; tilt.y += (tilt.ty - tilt.y) * 0.06;
    world.rotation.y = tilt.x + (reduce ? 0 : (prog - 0.5) * 0.1);
    world.rotation.x = tilt.y;
    world.updateMatrixWorld();
    // origin pulse
    const pulse = reduce ? 0.5 : (time * 0.8) % 1;
    origin.userData.ring.scale.setScalar(1 + pulse * 1.6);
    origin.userData.ring.material.opacity = 0.9 * (1 - pulse);
    const w = stage.clientWidth, h = stage.clientHeight;
    arcs.forEach((a, i) => {
      const t = ease(clamp((prog - (0.02 + i * GAP)) / SPAN));
      a.t = t;
      a.geo.setDrawRange(0, Math.floor((a.total * t) / (RAD * 6)) * RAD * 6);
      a.head.visible = t > 0.001 && t < 0.999;
      if (a.head.visible) a.head.position.copy(a.curve.getPoint(t));
      const arrived = t >= 0.999;
      a.dest.visible = arrived;
      if (arrived) {
        const pp = reduce ? 0.5 : ((time * 0.8) + i * 0.17) % 1;
        a.dest.userData.ring.scale.setScalar(1 + pp * 1.4);
        a.dest.userData.ring.material.opacity = 0.9 * (1 - pp);
      }
      a.label.classList.toggle("is-on", arrived);
      placeLabel(a.label, a.b, w, h);
    });
    placeLabel(originLabel, originPos, w, h);
    renderer.render(scene, camera);
  };
  // render only while on screen
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !raf) tick();
    else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: "120px" }).observe(stage);

  // Parallax / devtools hook (checkpoint reads window.scene)
  window.RT_scenes = Object.assign(window.RT_scenes || {}, { world: { scene, camera, renderer } });
  window.scene = scene;
  window.__renderer__ = renderer;
}
