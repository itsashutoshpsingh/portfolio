/* The background: a quiet network drawn on a 2D canvas. Hosts drift in layers, packets travel their links,
   and a scan line sits at the reader's place in the page, lighting the hosts it passes. Scrolling moves the
   layers at different speeds and sends the packets faster for a moment; a new chapter sends a burst.
   A small meter in the corner shows the year, the place and how far down the page you are: whatever part of
   the page is across the middle of the screen chooses the stop (data-chapter="0" to "8", or "all"); pages
   without chapters move through the stops as you scroll. Under reduced motion the network is drawn once and
   stays still. Everything is plain canvas: no library, a few hundred lines drawn per frame. */

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
const ctx = canvas && canvas.getContext('2d');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
let still = calm.matches;
const css = getComputedStyle(document.documentElement);
const rgb = (name, fallback) => (css.getPropertyValue(name) || fallback).trim();
const TINT = rgb('--c-tint', '15, 27, 77');  // ink as "r, g, b"
const tok = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;
const C = { accent: tok('--c-accent', '#1E56D6'), green: tok('--c-green', '#0B7A4B'), burgundy: tok('--c-burgundy', '#8E2B57') };

if (!ctx) { if (canvas) canvas.remove(); } else start();

function start() {
  // ---- the meter in the corner: progress ring, year, place ----
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

  // ---- which chapter the reader is on ----
  const marks = Array.from(document.querySelectorAll('[data-chapter]'));
  const travel = marks.length === 0;
  let chapter = 'all', progress = 0;
  const read = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    document.body.classList.toggle('past-hero', scrollY > innerHeight * 0.8);
    let next = chapter;
    if (travel) next = Math.round(progress * (STOPS.length - 1));
    else {
      const mid = innerHeight * 0.5;
      // the innermost marker across the middle line wins; in a row of two cards, the left one
      let best = null, bestTop = -Infinity;
      for (const el of marks) { const r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid && r.top > bestTop + 0.5) { best = el; bestTop = r.top; } }
      if (best) next = best.dataset.chapter === 'all' ? 'all' : +best.dataset.chapter;
    }
    if (next !== chapter) { chapter = next; burst(); }
    setMeter(chapter, progress * 100);
  };

  // ---- the network ----
  let W = 0, H = 0, dpr = 1, nodes = [], edges = [], adj = [], packets = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  const build = () => {
    // fewer hosts on small screens: the cost and the clutter both scale with area
    const n = Math.round(Math.min(72, Math.max(26, (W * H) / 21000)));
    const span = H * 1.6;  // the field is taller than the screen, so layers can scroll through it
    nodes = Array.from({ length: n }, () => ({ x: rand(0, W), y: rand(0, span), d: rand(0.35, 1), hot: 0 }));
    edges = []; adj = nodes.map(() => []);
    const seen = new Set();
    nodes.forEach((a, i) => {
      // two nearest neighbours in the same layer band, so links do not cross the whole screen
      const near = nodes.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.d - b.d) * 600) ** 2]).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 2);
      for (const [j] of near) {
        const key = i < j ? i + ':' + j : j + ':' + i;
        if (seen.has(key)) continue;
        seen.add(key); adj[i].push(edges.length); adj[j].push(edges.length); edges.push([i, j]);
      }
    });
    packets = Array.from({ length: Math.round(n / 3) }, () => newPacket());
  };
  const newPacket = (from) => {
    const e = from !== undefined && adj[from].length ? adj[from][Math.floor(Math.random() * adj[from].length)] : Math.floor(Math.random() * edges.length);
    const [a, b] = edges[e], fwd = from === undefined ? Math.random() < 0.5 : a === from;
    const r = Math.random();
    return { e, fwd, t: 0, v: rand(0.25, 0.5), c: r < 0.18 ? C.green : r < 0.24 ? C.burgundy : C.accent };
  };
  const burst = () => { if (still || !nodes.length) return; const near = place(); for (let k = 0; k < 6; k++) packets.push(Object.assign(newPacket(near), { v: rand(0.6, 0.9), life: 1 })); };

  // where a node is on screen: deeper layers scroll slower, and the field wraps around
  const span = () => H * 1.6;
  const sy = (nd) => { const s = span(), y = (nd.y - scrollY * (still ? 0 : 0.18) * nd.d) % s;  // no parallax under reduced motion
    return (y < 0 ? y + s : y) - H * 0.3; };
  const place = () => { let best = 0, bd = Infinity; const scan = scanY(); nodes.forEach((nd, i) => { const d = Math.abs(sy(nd) - scan); if (d < bd) { bd = d; best = i; } }); return best; };
  const scanY = () => H * (0.12 + progress * 0.76);  // the scan line is the reader's place in the page

  let vel = 0, lastY = scrollY, px = -1e4, py = -1e4;
  const draw = (dt) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const scan = scanY(), pos = nodes.map((nd) => [nd.x, sy(nd)]);

    // links: one path, faint
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${TINT}, .1)`; ctx.beginPath();
    for (const [i, j] of edges) {
      const [ax, ay] = pos[i], [bx, by] = pos[j];
      if (Math.abs(ay - by) > H * 0.5) continue;  // the two ends wrapped to opposite edges
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    }
    ctx.stroke();

    // the scan line: a hairline with a soft band under it
    const g = ctx.createLinearGradient(0, scan - 40, 0, scan + 1);
    g.addColorStop(0, 'rgba(30, 86, 214, 0)'); g.addColorStop(1, 'rgba(30, 86, 214, .07)');
    ctx.fillStyle = g; ctx.fillRect(0, scan - 40, W, 41);
    ctx.fillStyle = 'rgba(30, 86, 214, .35)'; ctx.fillRect(0, scan, W, 1);

    // hosts: small squares; the ones the scan line passes light up and fade
    nodes.forEach((nd, i) => {
      const [x, y] = pos[i];
      if (Math.abs(y - scan) < 6) nd.hot = 1;
      nd.hot = Math.max(0, nd.hot - dt * 0.8);
      const s = 2 + nd.d * 2.5;
      ctx.fillStyle = nd.hot > 0.02 ? C.accent : `rgba(${TINT}, ${0.18 + nd.d * 0.22})`;
      ctx.globalAlpha = nd.hot > 0.02 ? 0.35 + nd.hot * 0.65 : 1;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      if (nd.hot > 0.02) { ctx.strokeStyle = C.accent; ctx.globalAlpha = nd.hot * 0.5; ctx.strokeRect(x - s - 3, y - s - 3, s * 2 + 6, s * 2 + 6); }
    });
    ctx.globalAlpha = 1;

    // the pointer: nearby hosts draw a line to it
    if (px > -1e3) {
      ctx.strokeStyle = 'rgba(30, 86, 214, .22)'; ctx.beginPath();
      for (const [x, y] of pos) { const d = Math.hypot(x - px, y - py); if (d < 150) { ctx.moveTo(x, y); ctx.lineTo(px, py); } }
      ctx.stroke();
    }

    // packets: short bright dashes along their link, faster while the page is scrolling
    const boost = 1 + Math.min(4, Math.abs(vel) / 600);
    for (let k = packets.length - 1; k >= 0; k--) {
      const p = packets[k];
      p.t += dt * p.v * boost;
      if (p.life !== undefined) { p.life -= dt * 0.5; if (p.life <= 0) { packets.splice(k, 1); continue; } }
      if (p.t >= 1) { const [a, b] = edges[p.e]; const end = p.fwd ? b : a; Object.assign(p, newPacket(end), { v: p.v, life: p.life, c: p.c }); continue; }
      const [a, b] = edges[p.e], [ax, ay] = pos[p.fwd ? a : b], [bx, by] = pos[p.fwd ? b : a];
      if (Math.abs(ay - by) > H * 0.5) continue;
      const t0 = Math.max(0, p.t - 0.12), x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0, x1 = ax + (bx - ax) * p.t, y1 = ay + (by - ay) * p.t;
      ctx.strokeStyle = p.c; ctx.globalAlpha = p.life !== undefined ? Math.min(1, p.life * 2) : 0.85; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  };

  // ---- the loop: every frame while motion is on; one frame on change when it is off ----
  let last = performance.now(), running = false, slow = 0;
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    vel += ((scrollY - lastY) / Math.max(dt, 0.001) - vel) * 0.2; lastY = scrollY;
    // a device that cannot keep up gets fewer pixels, once
    slow = dt > 0.028 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 40 && dpr > 1) { dpr = 1; size(false); slow = 0; }
    draw(dt);
    if (still || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
  };
  const wake = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };

  let lastW = 0, lastH = 0;
  const size = (rebuild) => {
    W = innerWidth; H = innerHeight; lastW = W; lastH = H;
    dpr = Math.min(window.devicePixelRatio || 1, dpr === 1 && nodes.length ? 1 : 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (rebuild) build();
  };
  size(true); read(); wake();
  // a phone's address bar showing and hiding changes only the height a little: keep the field as it is
  addEventListener('resize', () => { if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 160) size(true); read(); wake(); }, { passive: true });
  let queued = false;
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; read(); wake(); }); } }, { passive: true });
  if (fine) {
    addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; wake(); }, { passive: true });
    document.addEventListener('pointerleave', () => { px = py = -1e4; });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  calm.addEventListener('change', (e) => { still = e.matches; wake(); });
  new MutationObserver(() => { read(); wake(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });  // the doors opening and closing
  canvas.classList.add('is-ready');
}
