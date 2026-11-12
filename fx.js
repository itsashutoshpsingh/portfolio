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

  /* Address graph: owners' clusters drift, packets run along edges, false merges between
     clusters pulse red. One soft-glow sprite per colour keeps it cheap. */
  function graph(cv) {
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var palette = [C.blue, C.green, C.amber], sprites = {}, W, H, nodes = [], edges = [], cross = [], packets = [], t = 0, running = false;
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
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
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
      nodes.forEach(function (n) { var s = sprite(palette[n.c % 3]), z = n.r * 6; ctx.drawImage(s, n.x - z, n.y - z, z * 2, z * 2); });
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
