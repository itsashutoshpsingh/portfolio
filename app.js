(function () {
  'use strict';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var css = getComputedStyle(document.documentElement);
  function token(name) { return css.getPropertyValue(name).trim(); }

  /* ---------- The field: raw scan noise on the left resolves into ranked lanes on the right ---------- */
  var canvas = document.getElementById('field');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var RAMP = ' .:-=+*#%@';
    // The raw side is the page's own traffic; the lanes resolve to scored findings (the calculator's reference vectors)
    var STREAM = 'EventID: 1 CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H powershell.exe -nop -enc SQBFAFgA T1059.001 process_creation Image|endswith CommandLine|contains nessus qualys sysmon ';
    var LABELS = ['9.8 critical', '7.8 high', '6.1 medium', '5.9 medium', '1.6 low'];
    var CELL_W = 8, CELL_H = 16;
    var colours = ['--color-glyph-1', '--color-glyph-2', '--color-glyph-3', '--color-glyph-4', '--color-accent-deep'].map(token);
    var paper = token('--color-paper');
    var LANES = [0.26, 0.4, 0.54, 0.68, 0.82];
    var LANE_WEIGHT = [1, 0.84, 0.68, 0.52, 0.38]; // ranked, like findings sorted by score
    var cols = 0, rows = 0, w = 0, h = 0, dpr = 1;
    var born = performance.now(), last = 0, visible = true, raf = 0;
    var lens = { x: -9999, y: -9999, on: false };

    function hash(x, y) {
      var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    function noise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      var u = smooth(xf), v = smooth(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function step(e0, e1, x) { var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return smooth(t); }

    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '13px "JetBrains Mono", ui-monospace, monospace';
      ctx.textBaseline = 'top';
      cols = Math.ceil(w / CELL_W); rows = Math.ceil(h / CELL_H);
    }

    function draw(now) {
      var t = (now - born) / 1000;
      var reveal = still.matches ? 1 : Math.min(1, t / 1.4); // the opening: a sweep that resolves left to right
      var buckets = [[], [], [], [], []];
      for (var j = 0; j < rows; j++) {
        var y = j / rows;
        var edge = step(0, 0.12, y) * step(1, 0.88, y);
        for (var i = 0; i < cols; i++) {
          var x = i / cols;
          var raw = noise(i * 0.09 + t * 0.35, j * 0.22 - t * 0.12);
          raw = Math.max(0, raw - 0.42) * 1.8;
          var lane = 0;
          for (var k = 0; k < LANES.length; k++) {
            var spread = 0.06 - 0.05 * x;
            var dy = (y - LANES[k]) / Math.max(spread, 0.012);
            var pulse = 0.65 + 0.35 * Math.sin(x * 26 - t * 2.4 + k * 1.3);
            lane = Math.max(lane, Math.exp(-dy * dy) * LANE_WEIGHT[k] * pulse);
          }
          var m = step(0.25, 0.72, x);
          var d = ((1 - m) * raw + m * lane) * edge;
          if (lens.on) {
            var lx = i * CELL_W - lens.x, ly = j * CELL_H - lens.y;
            var near = Math.max(0, 1 - Math.sqrt(lx * lx + ly * ly) / 90);
            d = Math.min(1, d + near * 0.35);
          }
          var front = x - (reveal * 1.25 - 0.2);
          if (front > 0) {
            if (front > 0.18) continue;
            d = hash(i + Math.floor(t * 30), j) * 0.6; // scrambling just ahead of the sweep
          }
          var level = Math.min(RAMP.length - 1, Math.floor(d * RAMP.length));
          if (level < 1) continue;
          var b = level >= 9 ? 4 : level >= 7 ? 3 : level >= 5 ? 2 : level >= 3 ? 1 : 0;
          var ch = m < 0.55 && level >= 3 ? STREAM.charAt((i + j * 11 + Math.floor(t * 6)) % STREAM.length) : RAMP.charAt(level);
          if (ch === ' ') ch = RAMP.charAt(level);
          buckets[b].push(i * CELL_W, j * CELL_H, ch);
        }
      }
      ctx.clearRect(0, 0, w, h);
      for (var c = 0; c < buckets.length; c++) {
        var list = buckets[c];
        if (!list.length) continue;
        ctx.fillStyle = colours[c];
        for (var p = 0; p < list.length; p += 3) ctx.fillText(list[p + 2], list[p], list[p + 1]);
      }
      if (reveal > 0.9 && w > 420) {
        ctx.globalAlpha = Math.min(1, (reveal - 0.9) * 10);
        for (var q = 0; q < LANES.length; q++) {
          var ly = Math.round((LANES[q] * rows)) * CELL_H, lw = (LABELS[q].length + 2) * CELL_W, lx = w - lw - CELL_W * 2;
          ctx.fillStyle = paper; ctx.fillRect(lx, ly - 2, lw, CELL_H + 4);
          ctx.fillStyle = colours[q < 2 ? 4 : 3]; ctx.fillText(LABELS[q], lx + CELL_W, ly);
        }
        ctx.globalAlpha = 1;
      }
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      if (now - last >= 33) { last = now; draw(now); } // about 30 fps
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && !still.matches) raf = requestAnimationFrame(frame); }

    resize();
    draw(performance.now());
    if (!still.matches) start();
    window.addEventListener('resize', function () { resize(); draw(performance.now()); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; if (visible) start(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
    still.addEventListener && still.addEventListener('change', function () { draw(performance.now()); start(); });
    var hero = canvas.parentElement;
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = canvas.getBoundingClientRect();
      lens.x = e.clientX - r.left; lens.y = e.clientY - r.top; lens.on = true;
    });
    hero.addEventListener('pointerleave', function () { lens.on = false; });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); draw(performance.now()); });
  }

  /* ---------- The figure ticks from 0 to its real value; the markup already holds the final number ---------- */
  var fig = document.querySelector('[data-tick]');
  if (fig && !still.matches) {
    var target = parseInt(fig.getAttribute('data-tick'), 10), t0 = performance.now(), DUR = 420;
    fig.textContent = '0';
    (function tick(now) {
      var p = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - p, 3);
      fig.textContent = String(Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- CVSS v3.1 base score (FIRST specification) ---------- */
  var form = document.getElementById('calc');
  if (form) {
    var W = {
      AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
      AC: { L: 0.77, H: 0.44 },
      PR: { U: { N: 0.85, L: 0.62, H: 0.27 }, C: { N: 0.85, L: 0.68, H: 0.5 } },
      UI: { N: 0.85, R: 0.62 },
      CIA: { H: 0.56, L: 0.22, N: 0 }
    };
    var ORDER = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
    var scoreEl = document.getElementById('score'), sevEl = document.getElementById('sev');
    var meterEl = document.getElementById('meter'), vectorEl = document.getElementById('vector');

    function roundup(x) {
      var n = Math.round(x * 100000);
      return n % 10000 === 0 ? n / 100000 : (Math.floor(n / 10000) + 1) / 10;
    }
    function value(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
    function severity(s) { return s === 0 ? 'None' : s < 4 ? 'Low' : s < 7 ? 'Medium' : s < 9 ? 'High' : 'Critical'; }

    function update() {
      var v = {}; ORDER.forEach(function (k) { v[k] = value(k); });
      var iss = 1 - (1 - W.CIA[v.C]) * (1 - W.CIA[v.I]) * (1 - W.CIA[v.A]);
      var impact = v.S === 'U' ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
      var expl = 8.22 * W.AV[v.AV] * W.AC[v.AC] * W.PR[v.S][v.PR] * W.UI[v.UI];
      var score = impact <= 0 ? 0 : v.S === 'U' ? roundup(Math.min(impact + expl, 10)) : roundup(Math.min(1.08 * (impact + expl), 10));
      scoreEl.textContent = score.toFixed(1);
      sevEl.textContent = severity(score);
      vectorEl.textContent = 'CVSS:3.1/' + ORDER.map(function (k) { return k + ':' + v[k]; }).join('/');
      var on = Math.round(score * 5);
      meterEl.innerHTML = '<b>' + '█'.repeat(on) + '</b>' + '░'.repeat(50 - on);
    }
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    update();
  }

  /* ---------- The mapping: hairline elbows join matched fields ---------- */
  var map = document.getElementById('map'), svg = document.getElementById('mapLinks');
  function linkLines() {
    if (!map || !svg || getComputedStyle(svg).display === 'none') return;
    var box = svg.getBoundingClientRect(), panes = map.querySelectorAll('.pane');
    var NS = 'http://www.w3.org/2000/svg', out = '';
    ['a', 'b'].forEach(function (id, n) {
      var l = panes[0].querySelector('[data-link="' + id + '"]'), r = panes[1].querySelector('[data-link="' + id + '"]');
      if (!l || !r) return;
      var lr = l.getBoundingClientRect(), rr = r.getBoundingClientRect();
      var y1 = lr.top + lr.height / 2 - box.top, y2 = rr.top + rr.height / 2 - box.top;
      var x0 = 0, x1 = box.width, mid = box.width * (n ? 0.62 : 0.38);
      out += '<path d="M' + x0 + ' ' + y1 + ' H' + mid + ' V' + y2 + ' H' + x1 + '"/>' +
        '<circle cx="' + x0 + '" cy="' + y1 + '" r="3"/><circle cx="' + x1 + '" cy="' + y2 + '" r="3"/>';
    });
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.innerHTML = out;
    svg.setAttribute('xmlns', NS);
  }
  if (map && svg) {
    linkLines();
    window.addEventListener('resize', linkLines);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(linkLines);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { linkLines(); svg.classList.add('is-drawn'); io.disconnect(); }
      }, { rootMargin: '0px 0px -20% 0px' });
      io.observe(map);
    } else { svg.classList.add('is-drawn'); }
  }

  /* ---------- Masthead: mark the section in view ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.mast__links a'));
  if ('IntersectionObserver' in window && links.length) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { a.setAttribute('aria-current', 'false'); });
    ['top', 'where', 'case', 'work', 'lab', 'credentials', 'contact'].forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById('copyBtn'), status = document.getElementById('copied');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = 'itsashutoshpsingh@gmail.com';
      function say(msg) { status.textContent = msg; clearTimeout(say.t); say.t = setTimeout(function () { status.textContent = ''; }, 3000); }
      function select() { var r = document.createRange(); r.selectNodeContents(document.getElementById('emailLink')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () { say('Email address copied.'); }, function () { select(); say('Selected. Press Ctrl+C or Cmd+C to copy.'); });
      } else { select(); say('Selected. Press Ctrl+C or Cmd+C to copy.'); }
    });
  }
})();
