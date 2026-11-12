/* Shared motion for the home page and /research: the address-graph canvas, decrypt labels,
   word-by-word headings, count-ups, card tilt and magnetic buttons. Transform and opacity only
   for DOM motion; IntersectionObserver, never scroll handlers. Under prefers-reduced-motion the
   graph draws one still frame and everything else is shown at its final state. */
(function () {
  'use strict';
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var css = getComputedStyle(document.documentElement);
  var tok = function (name, fallback) { return (css.getPropertyValue(name) || '').trim() || fallback; };
  var C = { blue: tok('--c-blue', '#5BA8FF'), cyan: tok('--c-cyan', '#6BE4F0'), green: tok('--c-green', '#4FD8A0'), amber: tok('--c-amber', '#F0B35B'), red: tok('--c-red', '#FF5C7A') };
  var GLYPHS = '!<>/[]{}=+*#%01ABCDEF';
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var once = function (els, fn, margin) {
    if (!('IntersectionObserver' in window)) { els.forEach(fn); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } });
    }, { rootMargin: margin || '0px 0px -12% 0px' });
    els.forEach(function (el) { io.observe(el); });
  };
  var rgba = function (hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };

  /* Address graph: a far layer of drifting dust for depth; owners' clusters drift, packets run
     along edges, false merges between clusters pulse red; every few seconds a transaction trace
     lights up hop by hop, sometimes crossing a false merge, which is the error the research measures.
     Nodes near the pointer reach out to it. One soft-glow sprite per colour keeps it cheap. */
  function graph(cv) {
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var palette = [C.blue, C.green, C.amber], sprites = {}, W, H, nodes = [], edges = [], cross = [], packets = [], dust = [], adj = [], trace = null, nextTrace = 1.5, t = 0, running = false, px = -1e4, py = -1e4;
    var density = parseFloat(cv.getAttribute('data-density') || '1'), zone = cv.getAttribute('data-zone') || 'all';
    // where cluster centres may sit, as fractions of the width: keep them clear of the text column
    function spot(c, k) {
      if (W < 900) return 0.1 + 0.8 * Math.random();
      if (zone === 'right') return 0.58 + 0.36 * Math.random();
      if (zone === 'sides') return c % 2 ? 0.76 + 0.2 * Math.random() : 0.04 + 0.2 * Math.random();
      return 0.12 + 0.76 * Math.random();
    }
    function sprite(col) {
      if (sprites[col]) return sprites[col];
      var s = document.createElement('canvas'), r = 24; s.width = s.height = r * 2;
      var g = s.getContext('2d'), grd = g.createRadialGradient(r, r, 0, r, r, r);
      grd.addColorStop(0, rgba(col, 0.9)); grd.addColorStop(0.18, rgba(col, 0.55)); grd.addColorStop(1, rgba(col, 0));
      g.fillStyle = grd; g.fillRect(0, 0, r * 2, r * 2);
      return (sprites[col] = s);
    }
    function build() {
      W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var k = Math.max(3, Math.min(7, Math.round(W / 260))), per = Math.round(Math.min(14, Math.max(6, (W * H) / 52000)) * density);
      nodes = []; edges = []; cross = []; packets = [];
      for (var c = 0; c < k; c++) {
        var cx = W * spot(c, k), cy = H * (0.15 + 0.7 * ((c + Math.random()) / k)), rad = Math.min(W, H) * (0.09 + Math.random() * 0.08), first = nodes.length;
        for (var i = 0; i < per; i++) {
          var a = Math.random() * 6.283, d = rad * Math.sqrt(Math.random());
          nodes.push({ bx: cx + Math.cos(a) * d, by: cy + Math.sin(a) * d, ph: Math.random() * 6.283, sp: 0.2 + Math.random() * 0.5, amp: 4 + Math.random() * 10, c: c, r: 1.3 + Math.random() * 1.7, x: 0, y: 0 });
          if (i) edges.push([first + i, first + ((Math.random() * i) | 0)]);
          if (i > 2 && Math.random() < 0.35) edges.push([first + i, first + ((Math.random() * i) | 0)]);
        }
      }
      // the error the research measures: a wrong link between two owners, drawn between the closest
      // nodes of neighbouring clusters so it reads as one short bridge, not a line across the page
      for (var j = 1; j < k; j++) {
        var best = null, bd = 1e9;
        nodes.forEach(function (a, ia) { if (a.c !== j) return; nodes.forEach(function (b, ib) {
          if (b.c !== j - 1) return; var dd = Math.hypot(a.bx - b.bx, a.by - b.by); if (dd < bd) { bd = dd; best = [ia, ib]; } }); });
        if (best && bd < Math.min(W, H) * 0.6) cross.push([best[0], best[1], Math.random() * 6.283]);
      }
      for (var p = 0; p < Math.round(edges.length / 4); p++) packets.push({ e: (Math.random() * edges.length) | 0, u: Math.random(), v: 0.004 + Math.random() * 0.008 });
      adj = nodes.map(function () { return []; });
      edges.concat(cross).forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
      dust = [];
      for (var q = 0; q < Math.min(170, Math.round((W * H) / 9000)); q++) dust.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, r: 0.4 + Math.random() * 0.9, a: 0.12 + Math.random() * 0.28, z: 0.3 + Math.random() * 0.7 });
      trace = null;
    }
    function startTrace() {  // a random walk of up to 7 hops, preferring the false-merge bridge when one is adjacent
      var crossSet = {}; cross.forEach(function (e) { crossSet[e[0]] = e[1]; crossSet[e[1]] = e[0]; });
      var start = cross.length && Math.random() < 0.6 ? cross[(Math.random() * cross.length) | 0][0] : (Math.random() * nodes.length) | 0;
      var path = [start], seen = {}; seen[start] = 1;
      while (path.length < 8) {
        var here = path[path.length - 1], opts = adj[here].filter(function (n) { return !seen[n]; });
        if (!opts.length) break;
        var nxt = crossSet[here] !== undefined && !seen[crossSet[here]] && Math.random() < 0.7 ? crossSet[here] : opts[(Math.random() * opts.length) | 0];
        path.push(nxt); seen[nxt] = 1;
      }
      trace = path.length > 2 ? { path: path, u: 0, fade: 1 } : null;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var ox = px > -1e3 ? (px / W - 0.5) * 14 : 0, oy = py > -1e3 ? (py / H - 0.5) * 10 : 0;
      dust.forEach(function (d) {  // far layer: slow drift, slight parallax with the pointer
        d.x = (d.x + d.vx + W) % W; d.y = (d.y + d.vy + H) % H;
        ctx.globalAlpha = d.a; ctx.fillStyle = d.z > 0.75 ? C.cyan : C.blue;
        ctx.beginPath(); ctx.arc(d.x - ox * d.z, d.y - oy * d.z, d.r, 0, 6.283); ctx.fill();
      });
      ctx.globalAlpha = 1;
      nodes.forEach(function (n) { n.x = n.bx + Math.cos(t * n.sp + n.ph) * n.amp; n.y = n.by + Math.sin(t * n.sp * 0.8 + n.ph) * n.amp; });
      ctx.lineWidth = 1;
      edges.forEach(function (e) {
        var a = nodes[e[0]], b = nodes[e[1]];
        ctx.strokeStyle = rgba(palette[a.c % 3], 0.22);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      cross.forEach(function (e) {
        var a = nodes[e[0]], b = nodes[e[1]], pulse = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2 + e[2]));
        ctx.save(); ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 18;
        ctx.strokeStyle = rgba(C.red, pulse); ctx.lineWidth = 1.4; ctx.shadowColor = rgba(C.red, 0.8); ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
        [a, b].forEach(function (n) { var s = sprite(C.red), z = 18 + 10 * pulse; ctx.globalAlpha = pulse; ctx.drawImage(s, n.x - z, n.y - z, z * 2, z * 2); ctx.globalAlpha = 1; });
      });
      nodes.forEach(function (n) {
        var dd = Math.hypot(n.x - px, n.y - py), near = dd < 150 ? 1 - dd / 150 : 0, s = sprite(palette[n.c % 3]), z = n.r * (6 + 5 * near);
        if (near) { ctx.strokeStyle = rgba(C.cyan, 0.35 * near); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(px, py); ctx.stroke(); }
        ctx.drawImage(s, n.x - z, n.y - z, z * 2, z * 2);
      });
      if (trace) {  // the trace: finished hops stay lit and fade, the head moves along the current hop
        var P = trace.path, seg = Math.floor(trace.u), f = trace.u - seg;
        ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = C.cyan; ctx.shadowBlur = 12;
        for (var i2 = 0; i2 < Math.min(seg + 1, P.length - 1); i2++) {
          var A = nodes[P[i2]], B = nodes[P[i2 + 1]], isX = A.c !== B.c, part = i2 < seg ? 1 : f;
          ctx.strokeStyle = rgba(isX ? C.red : C.cyan, 0.85 * trace.fade); ctx.lineWidth = isX ? 2.2 : 1.8;
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(A.x + (B.x - A.x) * part, A.y + (B.y - A.y) * part); ctx.stroke();
          if (i2 < seg) { ctx.globalAlpha = trace.fade; ctx.drawImage(sprite(C.cyan), B.x - 14, B.y - 14, 28, 28); ctx.globalAlpha = 1; }
        }
        ctx.restore();
        if (seg < P.length - 1) {
          var a2 = nodes[P[seg]], b2 = nodes[P[seg + 1]];
          ctx.drawImage(sprite(C.cyan), a2.x + (b2.x - a2.x) * f - 16, a2.y + (b2.y - a2.y) * f - 16, 32, 32);
          trace.u += 0.022;
        } else if ((trace.fade -= 0.012) <= 0) { trace = null; nextTrace = t + 1.2 + Math.random() * 2; }
      } else if (t > nextTrace && nodes.length) startTrace();
      packets.forEach(function (p) {
        p.u += p.v; if (p.u > 1) { p.u = 0; p.e = (Math.random() * edges.length) | 0; }
        var e = edges[p.e], a = nodes[e[0]], b = nodes[e[1]], x = a.x + (b.x - a.x) * p.u, y = a.y + (b.y - a.y) * p.u;
        ctx.drawImage(sprite(C.cyan), x - 8, y - 8, 16, 16);
      });
    }
    function frame() { if (!running) return; t += 0.016; draw(); requestAnimationFrame(frame); }
    build(); if (still) { draw(); }
    var resize = function () { clearTimeout(resize.t); resize.t = setTimeout(function () { build(); draw(); }, 150); };
    window.addEventListener('resize', resize);
    if (still) return;
    if (fine) window.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; }, { passive: true });
    var set = function (on) { var was = running; running = on && !document.hidden; if (running && !was) requestAnimationFrame(frame); };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { set(es[0].isIntersecting); }).observe(cv); else set(true);
    document.addEventListener('visibilitychange', function () { set(!document.hidden); });
    cv.classList.add('is-ready');
  }
  $$('canvas[data-graph]').forEach(graph);

  /* Decrypt: cyan glyphs settle into the real text, left to right */
  function scramble(el) {
    var text = el.textContent, n = text.length, t0 = performance.now(), dur = Math.min(900, 300 + n * 28);
    el.setAttribute('aria-label', text);
    var esc = function (ch) { return ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch; };
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), done = Math.floor(n * k), out = esc(text.slice(0, done)), tail = '';
      for (var i = done; i < n; i++) tail += text[i] === ' ' ? ' ' : esc(GLYPHS[(Math.random() * GLYPHS.length) | 0]);
      el.innerHTML = out + (tail ? '<span class="fx-glyph">' + tail + '</span>' : '');
      if (k < 1) requestAnimationFrame(step); else { el.textContent = text; el.removeAttribute('aria-label'); }
    })(t0);
  }

  /* Count up the leading number of a value such as "1,828", "27%" or "0.5% (95% CI ...)" */
  function count(el) {
    var raw = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : el.textContent;
    var m = raw.match(/^(\D*?)(\d[\d,]*\.?\d*)(.*)$/s);
    if (!m || still) return;
    var target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, comma = m[2].indexOf(',') > -1;
    var node = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : el, t0 = performance.now(), dur = 1400;
    var fmt = function (v) { var s = v.toFixed(dec); return comma ? Number(s).toLocaleString('en-GB', { minimumFractionDigits: dec }) : s; };
    el.classList.add('fx-counting');
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      var v = m[1] + fmt(target * e) + m[3];
      if (node === el) el.textContent = v; else node.nodeValue = v;
      if (k < 1) requestAnimationFrame(step); else el.classList.remove('fx-counting');
    })(t0);
  }

  /* Headings: each word rises in turn; <br> and inline markup are kept */
  function split(h) {
    var w = 0;
    (function walk(node) {
      $$(':scope > *', node).forEach(walk);
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType !== 3 || !c.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        c.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement('span'); s.className = 'fx-w'; s.textContent = part; s.style.setProperty('--w', w++);
          frag.appendChild(s);
        });
        node.replaceChild(frag, c);
      });
    })(h);
    h.classList.add('fx-split');
  }

  /* Cards lean towards the pointer, at most 3 degrees */
  function tilt(card) {
    var raf = 0;
    card.classList.add('fx-tilt');
    card.addEventListener('pointerenter', function () { card.style.transition = 'transform 200ms ' + EASE + ', border-color 300ms ' + EASE + ', box-shadow 300ms ' + EASE; });
    card.addEventListener('pointermove', function (e) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateX(' + (-y * 3).toFixed(2) + 'deg) rotateY(' + (x * 3).toFixed(2) + 'deg) translateY(-4px)';
      });
    });
    card.addEventListener('pointerleave', function () { cancelAnimationFrame(raf); card.style.transition = 'transform 500ms ' + EASE + ', border-color 300ms ' + EASE + ', box-shadow 300ms ' + EASE; card.style.transform = ''; });
  }

  /* Buttons drift a few pixels towards the pointer */
  function magnet(btn) {
    btn.classList.add('fx-mag');
    btn.addEventListener('pointermove', function (e) {
      var r = btn.getBoundingClientRect();
      btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + 'px)';
    });
    btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
  }

  window.fx = { count: function (el) { if (!still) once([el], count); }, scramble: scramble };
  if (!document.querySelector('.progress')) { var bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); document.body.prepend(bar); }
  if (still) return;
  document.documentElement.classList.add('fx');
  once($$('[data-scramble], .eyebrow'), scramble);
  var heads = $$('main h2');
  heads.forEach(split);
  once(heads, function (h) { h.classList.add('fx-on'); }, '0px 0px -8% 0px');
  once($$('[data-count]'), count);
  if (fine) {
    $$('#research .step, .project').forEach(tilt);  // research cards only: hover motion on every card is noise
    $$('.btn').forEach(magnet);
  }
})();
