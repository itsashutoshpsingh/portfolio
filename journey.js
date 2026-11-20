/* The background: the career path as a line through space, from Pune in 2020 to Coventry now.
   Whatever part of the page is in the middle of the screen chooses where the camera looks: a chapter
   of the journey (data-chapter="0" to "8") or the whole path (data-chapter="all"). On pages without
   chapters the camera simply travels the path as you scroll. The path is lit up to the current stop,
   the current stop pulses, and a small meter in the corner shows the year, the place and how far down
   the page you are. Under reduced motion the camera jumps instead of flying and nothing pulses.
   Without WebGL the page keeps its plain background. */

const STOPS = [
  { year: '2020', place: 'Pune', what: 'BTech, Symbiosis' },
  { year: '2022', place: 'Online', what: 'Penetration testing, Verzeo' },
  { year: '2023', place: 'Pune', what: 'Network security, Cisco' },
  { year: '2024', place: 'Noida', what: 'Research analyst, NASSCOM' },
  { year: '2024', place: 'Rajkot', what: 'Security analyst, Kyoka' },
  { year: '2025', place: 'Home labs', what: 'Detection and Linux labs' },
  { year: '2025', place: 'Coventry', what: 'MSc, Warwick' },
  { year: '2026', place: 'Coventry', what: 'Open research' },
  { year: '2026', place: 'Coventry', what: 'Web security, Perfume Reverie' },
];
const OVERVIEW = { year: '2020 to 2026', place: 'Pune to Coventry', what: 'Nine stops so far' };

const canvas = document.querySelector('canvas.journey');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
let still = calm.matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const css = getComputedStyle(document.documentElement);
const tok = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;
const C = {
  bg: tok('--c-bg', '#070D24'), line: tok('--c-line', '#2C3F8C'), ink: tok('--c-ink', '#EEF2FF'), ink3: tok('--c-ink-3', '#A3B0DE'),
  accent: tok('--c-accent', '#5AA2FF'), green: tok('--c-green', '#4ADE9A'), royal: tok('--c-royal', '#3355E6'),
};

// three.js is only fetched where it can run: it needs WebGL 2
let THREE = null, renderer = null;
if (canvas && document.createElement('canvas').getContext('webgl2')) {
  try {
    THREE = await import('./vendor/three.module.min.js');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 1.5, alpha: false, powerPreference: 'low-power' });
  } catch (e) { renderer = null; }
}
if (!renderer) { if (canvas) canvas.remove(); } else start();

function start() {
  renderer.setClearColor(C.bg, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.bg, 9, 30);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);

  // the path: a gentle rising curve through one point per stop
  const points = STOPS.map((_, i) => new THREE.Vector3((i - 4) * 3.1, Math.sin(i * 0.8) * 0.9 + (i - 4) * 0.32, Math.cos(i * 0.65) * 2.2));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const SEG = 640, RAD = 8;
  const lengths = curve.getLengths(900), total = lengths[lengths.length - 1];
  const along = points.map((_, i) => lengths[Math.round((i / (points.length - 1)) * 900)] / total);  // each stop as a share of the path's length

  const base = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.022, RAD, false), new THREE.MeshBasicMaterial({ color: C.line, transparent: true, opacity: 0.55 }));
  const lit = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.03, RAD, false), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.9 }));
  scene.add(base, lit);
  const per = RAD * 6;  // index count of one tube segment
  const reveal = (u) => lit.geometry.setDrawRange(0, Math.max(0, Math.floor(u * SEG)) * per);

  const dotGeo = new THREE.SphereGeometry(0.075, 20, 14);
  const dots = points.map((p) => { const m = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: C.line })); m.position.copy(p); scene.add(m); return m; });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.225, 48), new THREE.MeshBasicMaterial({ color: C.green, transparent: true, side: THREE.DoubleSide }));
  scene.add(ring);

  // a year label above every stop, drawn once into a small texture
  const label = (text) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const g = c.getContext('2d'); g.font = '600 56px Calibri, Carlito, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.fillText(text, 128, 50);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: C.ink3, transparent: true, depthWrite: false }));
    s.scale.set(0.72, 0.27, 1); return s;
  };
  const years = STOPS.map((s, i) => { const sp = label(s.year); sp.position.copy(points[i]).add(new THREE.Vector3(0, 0.48, 0)); scene.add(sp); return sp; });

  // depth: a faint floor grid and a slow field of points
  const grid = new THREE.GridHelper(70, 70, C.line, C.line);
  grid.position.y = -3.4; grid.material.transparent = true; grid.material.opacity = 0.22; scene.add(grid);
  const N = 520, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 36; pos[i * 3 + 1] = Math.random() * 11 - 4; pos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2; }
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: C.royal, size: 0.04, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(dust);

  // where the camera wants to be for a stop, or for the whole path
  const up = new THREE.Vector3(0, 1, 0);
  const aim = (k) => {
    if (k === 'door') return { pos: new THREE.Vector3(0.3, 2.2, 27), look: new THREE.Vector3(0, 0.4, 0), u: 0 };
    if (k === 'all') return { pos: new THREE.Vector3(-1.5, 2.6, 18), look: new THREE.Vector3(-2.2, 3.6, 0), u: 1 };  // the path sits low, under the hero text
    const t = k / (points.length - 1), p = points[k], tan = curve.getTangent(t).normalize(), side = new THREE.Vector3().crossVectors(tan, up).normalize();
    return { pos: p.clone().addScaledVector(tan, -5.6).addScaledVector(side, -3.4).add(new THREE.Vector3(0, 2.1, 0)), look: p.clone().addScaledVector(tan, 2.2), u: along[k] };
  };

  // the meter in the corner: progress ring, year, place
  const meter = document.createElement('div');
  meter.className = 'meter'; meter.setAttribute('aria-hidden', 'true');
  meter.innerHTML = '<svg viewBox="0 0 64 64"><circle class="meter__track" cx="32" cy="32" r="27"/><circle class="meter__fill" cx="32" cy="32" r="27" pathLength="100"/></svg>' +
    '<b class="meter__pct">0%</b><span class="meter__year"></span><span class="meter__place"></span><span class="meter__what"></span>';
  document.body.appendChild(meter);
  const mFill = meter.querySelector('.meter__fill'), mPct = meter.querySelector('.meter__pct'), mYear = meter.querySelector('.meter__year'), mPlace = meter.querySelector('.meter__place'), mWhat = meter.querySelector('.meter__what');
  const setMeter = (k, pct) => {
    const s = typeof k === 'number' ? STOPS[k] : OVERVIEW;
    if (mWhat.textContent !== s.what) { mYear.textContent = s.year; mPlace.textContent = s.place; mWhat.textContent = s.what; }
    mFill.style.strokeDashoffset = String(100 - pct); mPct.textContent = Math.round(pct) + '%';
  };

  // which chapter the reader is on: the [data-chapter] element across the middle of the screen
  const marks = Array.from(document.querySelectorAll('[data-chapter]'));
  const travel = marks.length === 0;
  let chapter = 'all', progress = 0;
  const read = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    document.body.classList.toggle('past-hero', scrollY > innerHeight * 0.8);
    if (document.body.classList.contains('gated')) { chapter = 'door'; return; }
    if (travel) { chapter = Math.round(progress * (points.length - 1)); return; }
    const mid = innerHeight * 0.5;
    // the innermost marker across the middle line wins; in a row of two cards, the left one
    let best = null, bestTop = -Infinity;
    for (const el of marks) { const r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid && r.top > bestTop + 0.5) { best = el; bestTop = r.top; } }
    if (best) chapter = best.dataset.chapter === 'all' ? 'all' : +best.dataset.chapter;
  };

  // motion state, eased towards the target every frame
  const cur = aim(document.body.classList.contains('gated') ? 'door' : 'all');
  camera.position.copy(cur.pos);
  let px = 0, py = 0, tpx = 0, tpy = 0, pulseUntil = 0, last = performance.now(), running = false, shown = -2;
  const frame = (now) => {
    const dt = Math.min(0.25, (now - last) / 1000); last = now;  // a slow frame still moves the camera its share of the way
    const target = aim(chapter);
    if (travel && !still) { const t = progress; target.pos = curve.getPoint(Math.max(0, t - 0.06)).add(new THREE.Vector3(-1.2, 1.6, 3.6)); target.look = curve.getPoint(Math.min(1, t + 0.05)); target.u = t; }
    const k = still ? 1 : 1 - Math.exp(-dt * (chapter === 'all' && cur.pos.z > 16 ? 1.7 : 2.6));  // the fly-in from the doors is a touch slower
    cur.pos.lerp(target.pos, k); cur.look.lerp(target.look, k); cur.u += (target.u - cur.u) * k;
    px += (tpx - px) * (still ? 1 : 1 - Math.exp(-dt * 4)); py += (tpy - py) * (still ? 1 : 1 - Math.exp(-dt * 4));
    const orbit = still ? 0 : progress * 0.5;  // a slow turn as the page scrolls, so the scene always answers the scroll
    camera.position.set(cur.pos.x + Math.sin(orbit) * 1.2 + px * 0.7, cur.pos.y + py * 0.4, cur.pos.z + (1 - Math.cos(orbit)) * 1.2);
    camera.lookAt(cur.look);
    reveal(cur.u);

    const active = typeof chapter === 'number' ? chapter : -1;
    if (active !== shown) {
      dots.forEach((d, i) => { d.material.color.set(i === active ? C.green : along[i] <= target.u + 1e-6 ? C.accent : C.line); d.scale.setScalar(i === active ? 1.6 : 1); });
      years.forEach((y) => { y.material.opacity = active < 0 ? 0.4 : 0; });  // years show on the overview only; the meter carries the current one
      shown = active; pulseUntil = still ? now : now + 2800;
    }
    ring.visible = active >= 0;
    if (active >= 0) {
      ring.position.copy(points[active]); ring.lookAt(camera.position);
      const p = still ? 0 : Math.max(0, pulseUntil - now) / 2800, s = 1 + (1 - p) * 0.35 * Math.sin(now / 260) * (p > 0 ? 1 : 0);
      ring.scale.setScalar(s); ring.material.opacity = 0.95;
    }
    dust.rotation.y = still ? 0 : now * 0.000015;
    setMeter(chapter, progress * 100);
    renderer.render(scene, camera);

    const settled = cur.pos.distanceTo(target.pos) < 0.002 && cur.look.distanceTo(target.look) < 0.002 && Math.abs(px - tpx) < 0.002 && Math.abs(py - tpy) < 0.002 && now > pulseUntil;
    if (settled || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
  };
  const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };

  const size = () => {
    const w = innerWidth, h = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    lastW = w; lastH = h;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // on wide screens the path sits to the right of the text column
    if (w >= 900) camera.setViewOffset(w, h, -w * 0.14, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  let lastW = 0, lastH = 0;
  size(); read(); wake();
  // a phone's address bar showing and hiding changes only the height a little: keep the canvas as it is
  addEventListener('resize', () => { if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 160) size(); read(); wake(); }, { passive: true });
  calm.addEventListener('change', (e) => { still = e.matches; shown = -2; wake(); });
  let queued = false;
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; read(); wake(); }); } }, { passive: true });
  if (fine && !still) addEventListener('pointermove', (e) => { tpx = e.clientX / innerWidth - 0.5; tpy = 0.5 - e.clientY / innerHeight; wake(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  new MutationObserver(() => { read(); wake(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });  // the doors opening and closing
  canvas.classList.add('is-ready');
}
