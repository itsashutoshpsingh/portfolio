(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var css = getComputedStyle(root);
  function token(name) { return css.getPropertyValue(name).trim(); }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  reduce.addEventListener && reduce.addEventListener('change', function () { root.classList.toggle('still', reduce.matches); });

  /* ======================================================================
     Hero network: endpoints joined by links, packets moving between them,
     and now and then a node raises an alert that resolves. A picture of
     the job: watch the traffic, catch the anomaly, close it.
     ====================================================================== */
  var canvas = $('#net');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, nodes = [], edges = [], packets = [], alerts = [];
    var pointer = { x: -9999, y: -9999 };
    var running = false, visible = true, raf = 0, lastAlert = 0, last = 0;
    var C = { line: 'rgba(110,168,255,', node: '#6ea8ff', ice: '#a9d6ff', crit: token('--sev-critical') || '#ff5d73', ok: token('--ok') || '#4fd8a0' };

    function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

    function build() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rand = seeded(42), count = W < 700 ? 26 : 48;
      nodes = [];
      for (var i = 0; i < count; i++) {
        // weight nodes toward the right so the headline sits on calm ground
        var bias = W < 700 ? rand() : 0.35 + Math.pow(rand(), 0.8) * 0.65;
        nodes.push({ x: bias * W, y: 0.08 * H + rand() * 0.84 * H, r: 1.6 + rand() * 1.8, glow: 0, phase: rand() * Math.PI * 2 });
      }
      edges = [];
      nodes.forEach(function (n, i) {
        var near = nodes.map(function (m, j) { return { j: j, d: (m.x - n.x) * (m.x - n.x) + (m.y - n.y) * (m.y - n.y) }; })
          .filter(function (o) { return o.j !== i; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 2);
        near.forEach(function (o) { if (!edges.some(function (e) { return (e.a === o.j && e.b === i) || (e.a === i && e.b === o.j); })) edges.push({ a: i, b: o.j }); });
      });
      packets = []; alerts = [];
    }

    function spawnPacket() {
      var e = edges[(Math.random() * edges.length) | 0];
      if (!e) return;
      var forward = Math.random() > 0.5;
      packets.push({ a: forward ? e.a : e.b, b: forward ? e.b : e.a, t: 0, v: 0.35 + Math.random() * 0.5 });
    }

    function draw(now, dt) {
      ctx.clearRect(0, 0, W, H);
      // links
      ctx.lineWidth = 1;
      for (var i = 0; i < edges.length; i++) {
        var a = nodes[edges[i].a], b = nodes[edges[i].b];
        ctx.strokeStyle = C.line + (0.08 + Math.max(a.glow, b.glow) * 0.25) + ')';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // packets
      for (var p = packets.length - 1; p >= 0; p--) {
        var k = packets[p]; k.t += k.v * dt;
        if (k.t >= 1) { nodes[k.b].glow = Math.min(1, nodes[k.b].glow + 0.5); packets.splice(p, 1); continue; }
        var A = nodes[k.a], B = nodes[k.b], x = A.x + (B.x - A.x) * k.t, y = A.y + (B.y - A.y) * k.t;
        ctx.fillStyle = C.ice; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // alerts: a ring opens in red, then settles to green as it is closed
      for (var q = alerts.length - 1; q >= 0; q--) {
        var al = alerts[q]; al.t += dt;
        var n = nodes[al.n], life = al.t / 2.4;
        if (life >= 1) { alerts.splice(q, 1); continue; }
        var resolved = life > 0.55;
        ctx.strokeStyle = resolved ? C.ok : C.crit;
        ctx.globalAlpha = (1 - life) * 0.9;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(n.x, n.y, 6 + life * 26, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
        n.glow = 1; n.alert = resolved ? 'ok' : 'crit';
      }
      // nodes, brighter near the cursor and when traffic arrives
      for (var m = 0; m < nodes.length; m++) {
        var nd = nodes[m], dx = nd.x - pointer.x, dy = nd.y - pointer.y;
        var near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 160);
        nd.glow = Math.max(near, nd.glow - dt * 0.8);
        var col = nd.alert === 'crit' ? C.crit : nd.alert === 'ok' ? C.ok : C.node;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.45 + nd.glow * 0.55;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r + nd.glow * 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        if (nd.glow < 0.05) nd.alert = null;
      }
      // traffic and alert cadence
      if (Math.random() < dt * 9) spawnPacket();
      if (now - lastAlert > 2600) { lastAlert = now; alerts.push({ n: (Math.random() * nodes.length) | 0, t: 0 }); }
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden || reduce.matches) { running = false; return; }
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      draw(now, dt);
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!running && !reduce.matches) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
    function still() { // one composed frame for reduced motion
      for (var i = 0; i < 18; i++) spawnPacket();
      packets.forEach(function (k) { k.t = Math.random() * 0.9; });
      draw(performance.now(), 0);
    }

    build();
    if (reduce.matches) still(); else start();
    var resizeT;
    window.addEventListener('resize', function () { clearTimeout(resizeT); resizeT = setTimeout(function () { build(); if (reduce.matches) still(); }, 120); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(canvas);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    reduce.addEventListener && reduce.addEventListener('change', function () { if (reduce.matches) still(); else start(); });
    canvas.parentElement.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; });
  }

  /* ======================================================================
     Cursor spotlight: trails the pointer on a critically damped spring,
     so it has weight instead of snapping. Mouse only, never on touch.
     ====================================================================== */
  var spot = $('#spotlight');
  if (spot && finePointer.matches && !reduce.matches) {
    var sx = innerWidth / 2, sy = innerHeight / 3, vx = 0, vy = 0, tx = sx, ty = sy, spotRaf = 0, spotLast = 0;
    var OMEGA = 2 * Math.PI / 0.45; // response 0.45s, damping ratio 1
    function spring(now) {
      var dt = Math.min(0.032, (now - (spotLast || now)) / 1000); spotLast = now;
      var ax = -OMEGA * OMEGA * (sx - tx) - 2 * OMEGA * vx, ay = -OMEGA * OMEGA * (sy - ty) - 2 * OMEGA * vy;
      vx += ax * dt; vy += ay * dt; sx += vx * dt; sy += vy * dt;
      spot.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)';
      if (Math.abs(sx - tx) + Math.abs(sy - ty) + Math.abs(vx) + Math.abs(vy) > 0.5) spotRaf = requestAnimationFrame(spring);
      else { spotRaf = 0; spotLast = 0; }
    }
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY; spot.classList.add('is-on');
      if (!spotRaf) spotRaf = requestAnimationFrame(spring);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { spot.classList.remove('is-on'); });
  }

  /* ======================================================================
     Card glow: the border lights where the cursor is. The position is set
     on the hovered card only, so nothing else recalculates.
     ====================================================================== */
  if (finePointer.matches) {
    $$('[data-glow]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ======================================================================
     Scroll reveal (once), with counters that run when their stat appears
     ====================================================================== */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduce.matches || !target) { el.textContent = String(target); return; }
    var t0 = performance.now(), DUR = 1100;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - p, 4);
      el.textContent = String(Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        $$('[data-count]', en.target).forEach(countUp);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ======================================================================
     Nav: a clipped duplicate of the links slides to the active section
     ====================================================================== */
  var navLinks = $('#navLinks'), navActive = $('#navActive');
  var linkEls = navLinks ? $$('a', navLinks) : [];
  var current = null;
  function setActive(id) {
    if (!navActive || id === current) return;
    current = id;
    var link = linkEls.filter(function (a) { return a.getAttribute('href') === '#' + id; })[0];
    linkEls.forEach(function (a) { a.removeAttribute('aria-current'); });
    if (!link) { navActive.style.clipPath = 'inset(0 100% 0 0 round 999px)'; return; }
    link.setAttribute('aria-current', 'true');
    var w = navLinks.offsetWidth, l = link.offsetLeft, r = w - (l + link.offsetWidth);
    navActive.style.clipPath = 'inset(0 ' + r + 'px 0 ' + l + 'px round 999px)';
  }
  if ('IntersectionObserver' in window && navLinks) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'about', 'experience', 'projects', 'cvss', 'skills', 'credentials', 'contact'].forEach(function (id) {
      var el = document.getElementById(id); if (el) spy.observe(el);
    });
  }
  window.addEventListener('resize', function () { var c = current; current = null; if (c) setActive(c); });

  /* Mobile menu: scales from its button, closes faster than it opens */
  var menuBtn = $('#menuBtn'), menu = $('#menuPanel');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function (e) { e.stopPropagation(); setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('pointerdown', function (e) { if (menu.classList.contains('is-open') && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  }

  /* ======================================================================
     Timeline: the line fills with scroll, each role lights as it passes.
     Transform is written straight to the element, once per frame.
     ====================================================================== */
  var tl = $('#timeline'), fill = $('#tlFill');
  if (tl && fill && !reduce.matches) {
    var items = $$('.tl__item', tl), ticking = false;
    function update() {
      ticking = false;
      var r = tl.getBoundingClientRect(), probe = innerHeight * 0.6;
      var p = Math.min(1, Math.max(0, (probe - r.top) / r.height));
      fill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
      items.forEach(function (it) { it.classList.toggle('is-past', it.getBoundingClientRect().top + 40 < probe); });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ======================================================================
     Project details in a native <dialog>
     ====================================================================== */
  var modal = $('#modal'), modalBody = $('#modalBody'), modalClose = $('#modalClose'), opener = null;
  if (modal && modal.showModal) {
    $$('.proj__open').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tpl = document.getElementById(btn.getAttribute('data-modal'));
        if (!tpl) return;
        opener = btn;
        modalBody.innerHTML = '';
        modalBody.appendChild(tpl.content.cloneNode(true));
        modal.showModal();
        modal.querySelector('.modal__inner').scrollTop = 0;
      });
    });
    modalClose.addEventListener('click', function () { modal.close(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); }); // click on the backdrop
    modal.addEventListener('close', function () { if (opener) opener.focus(); });
  }

  /* ======================================================================
     CVSS v3.1 base score, FIRST specification
     ====================================================================== */
  var form = $('#calc');
  if (form) {
    var Wt = {
      AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }, AC: { L: 0.77, H: 0.44 },
      PR: { U: { N: 0.85, L: 0.62, H: 0.27 }, C: { N: 0.85, L: 0.68, H: 0.5 } },
      UI: { N: 0.85, R: 0.62 }, CIA: { H: 0.56, L: 0.22, N: 0 }
    };
    var ORDER = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
    var SEV = { critical: '--sev-critical', high: '--sev-high', medium: '--sev-medium', low: '--sev-low', none: '--sev-none' };
    var scoreEl = $('#score'), sevEl = $('#sev'), barEl = $('#bar'), vecEl = $('#vector');
    function roundup(x) { var n = Math.round(x * 100000); return n % 10000 === 0 ? n / 100000 : (Math.floor(n / 10000) + 1) / 10; }
    function val(k) { var el = form.querySelector('input[name="' + k + '"]:checked'); return el ? el.value : ''; }
    function band(s) { return s === 0 ? 'none' : s < 4 ? 'low' : s < 7 ? 'medium' : s < 9 ? 'high' : 'critical'; }
    function update() {
      var v = {}; ORDER.forEach(function (k) { v[k] = val(k); });
      var iss = 1 - (1 - Wt.CIA[v.C]) * (1 - Wt.CIA[v.I]) * (1 - Wt.CIA[v.A]);
      var impact = v.S === 'U' ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
      var expl = 8.22 * Wt.AV[v.AV] * Wt.AC[v.AC] * Wt.PR[v.S][v.PR] * Wt.UI[v.UI];
      var s = impact <= 0 ? 0 : v.S === 'U' ? roundup(Math.min(impact + expl, 10)) : roundup(Math.min(1.08 * (impact + expl), 10));
      var b = band(s);
      scoreEl.textContent = s.toFixed(1);
      sevEl.textContent = b.charAt(0).toUpperCase() + b.slice(1);
      sevEl.setAttribute('data-sev', b);
      barEl.style.transform = 'scaleX(' + Math.max(0.02, s / 10).toFixed(3) + ')';
      barEl.style.backgroundColor = token(SEV[b]);
      vecEl.textContent = 'CVSS:3.1/' + ORDER.map(function (k) { return k + ':' + v[k]; }).join('/');
    }
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    update();
  }

  /* Marquee pause control (it also pauses on hover and focus) */
  var marquee = $('#marquee'), mToggle = $('#marqueeToggle');
  if (marquee && mToggle) {
    mToggle.addEventListener('click', function () {
      var paused = marquee.classList.toggle('is-paused');
      mToggle.textContent = paused ? 'Play the tool strip' : 'Pause the tool strip';
      mToggle.setAttribute('aria-pressed', String(paused));
    });
  }

  /* Copy email: the label blurs into a confirmation, then back */
  var copyBtn = $('#copyBtn'), copyStatus = $('#copyStatus');
  if (copyBtn) {
    var copyT;
    copyBtn.addEventListener('click', function () {
      var email = 'itsashutoshpsingh@gmail.com';
      function done() {
        copyBtn.setAttribute('data-state', 'done'); copyStatus.textContent = 'Email address copied';
        clearTimeout(copyT); copyT = setTimeout(function () { copyBtn.setAttribute('data-state', 'idle'); copyStatus.textContent = ''; }, 2000);
      }
      function fallback() {
        var range = document.createRange(); range.selectNodeContents($('#emailLink'));
        var sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        copyStatus.textContent = 'Email selected. Press Ctrl+C or Cmd+C to copy.';
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email).then(done, fallback);
      else fallback();
    });
  }
})();
