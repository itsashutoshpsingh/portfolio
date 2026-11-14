/* Shared motion for the home page and /research: the WebGL background, decrypt labels,
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

  /* Background: one full-screen WebGL fragment shader behind the whole page. A drifting
     topographic field (domain-warped noise) in slate navy with soft blue and teal light and thin
     glowing contour lines; the pointer bends the contours like a lens and lights them up, and
     scrolling slowly moves the terrain. Rendered at 40% resolution and 30 fps (it is soft and slow by
     design, and full-screen shaders are fill-rate bound), paused when the tab is hidden, one still frame under
     reduced motion. Without WebGL the page keeps its flat background. */
  var BG_FRAG = [
    'precision mediump float;',
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uPtr; uniform float uPtrOn; uniform float uScroll;',
    'uniform vec3 uBg; uniform vec3 uBlue; uniform vec3 uTeal; uniform vec3 uLine;',
    'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(h(i), h(i + vec2(1., 0.)), u.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);',
    '  for (int i = 0; i < 4; i++){ v += a * n(p); p = m * p; a *= 0.5; } return v; }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;',
    '  vec2 p = vec2(uv.x * asp, uv.y) * 2.4 + vec2(0.0, uScroll * 1.6);',
    '  vec2 m = vec2(uPtr.x * asp, uPtr.y) * 2.4 + vec2(0.0, uScroll * 1.6);',
    '  float d = length(p - m); float lens = uPtrOn * exp(-d * d * 3.5);',
    '  p += (p - m) * lens * 0.35;',                                      // the pointer pushes the terrain outwards
    '  float t = uTime * 0.035;',
    '  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));',
    '  float f = fbm(p + 1.8 * q + vec2(t * 0.6, -t * 0.4));',
    '  vec3 col = uBg;',
    '  col = mix(col, uBlue, smoothstep(0.45, 0.95, f) * 0.20);',          // soft light where the field is high
    '  col = mix(col, uTeal, smoothstep(0.55, 1.0, q.x) * 0.12);',
    '  float g = abs(fract(f * 11.0) - 0.5);',                              // contour lines every 1/11 of the field
    '  float line = 1.0 - smoothstep(0.0, 0.05 + 0.03 * lens, g);',
    '  col += uLine * line * (0.07 + 0.30 * lens);',
    '  col += uBlue * lens * 0.06;',
    '  float vig = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(asp, 1.0)));',
    '  col *= 0.72 + 0.28 * vig;',
    '  col += (h(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.018;',  // fine grain, no banding
    '  gl_FragColor = vec4(col, 1.0);',
    '}'].join('\n');
  function background(cv) {
    var gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return;
    var sh = function (type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, BG_FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var a = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    var U = function (k) { return gl.getUniformLocation(pr, k); };
    var rgb = function (hex) { var v = parseInt(hex.slice(1), 16); return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; };
    gl.uniform3fv(U('uBg'), rgb(tok('--c-bg', '#0C1421')));
    gl.uniform3fv(U('uBlue'), rgb(C.blue)); gl.uniform3fv(U('uTeal'), rgb(C.green)); gl.uniform3fv(U('uLine'), rgb(C.cyan));
    var uRes = U('uRes'), uTime = U('uTime'), uPtr = U('uPtr'), uPtrOn = U('uPtrOn'), uScroll = U('uScroll');
    var tx = 0.7, ty = 0.6, px = tx, py = ty, on = 0, onT = 0, running = false, t0 = performance.now();
    var size = function () {
      var s = 0.4 * Math.min(window.devicePixelRatio || 1, 2);  // 40% resolution: the field is soft by design, so a sixth of the pixels is enough
      cv.width = Math.max(1, Math.round(innerWidth * s)); cv.height = Math.max(1, Math.round(innerHeight * s));
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uRes, cv.width, cv.height);
    };
    var draw = function (now) {
      px += (tx - px) * 0.06; py += (ty - py) * 0.06; on += (onT - on) * 0.05;
      gl.uniform1f(uTime, (now - t0) / 1000); gl.uniform2f(uPtr, px, py); gl.uniform1f(uPtrOn, on);
      gl.uniform1f(uScroll, scrollY / Math.max(1, innerHeight) * 0.35);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    var last = 0;
    var frame = function (now) { if (!running) return; if (now - last >= 32) { last = now; draw(now); } requestAnimationFrame(frame); };  // 30 fps: the field drifts slowly
    size(); draw(t0 + 4000); cv.classList.add('is-ready');
    window.addEventListener('resize', function () { size(); if (!running) draw(performance.now()); }, { passive: true });
    if (still) return;
    if (fine) {
      window.addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; onT = 1; }, { passive: true });
      document.addEventListener('pointerleave', function () { onT = 0; });
    }
    var set = function (v) { var was = running; running = v; if (running && !was) requestAnimationFrame(frame); };
    document.addEventListener('visibilitychange', function () { set(!document.hidden); });
    set(!document.hidden);
  }
  $$('canvas[data-bg]').forEach(background);

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

  /* Result charts drawn from each repo's results/summary.json "viz" blocks: labelled bars whose
     fill grows on reveal, coloured by what the number means (good, bad, warn, neutral). */
  var esc = function (x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function chart(v) {
    var max = v.unit === '%' ? 100 : Math.max.apply(null, v.bars.map(function (b) { return b.value; })) || 1;
    var fmt = function (x) {
      if (v.unit === '%') return (Math.round(x * 10) / 10).toLocaleString('en-GB') + '%';
      return x.toLocaleString('en-GB') + (v.unit === 'ms' ? ' ms' : '');
    };
    return '<figure class="vz"><figcaption class="vz__t">' + esc(v.title) + '</figcaption><div class="vz__rows">' +
      v.bars.map(function (b, i) {
        return '<div class="vz__row" data-tone="' + esc(b.tone || 'neutral') + '" style="--i:' + i + '"><span class="vz__l">' + esc(b.label) +
          '</span><span class="vz__track"><span class="vz__fill" style="--p:' + Math.max(0, Math.min(1, b.value / max)).toFixed(4) + '"></span></span>' +
          '<span class="vz__v">' + esc(fmt(b.value)) + '</span></div>';
      }).join('') + '</div></figure>';
  }
  var tilted = [];
  function mount(root) {
    once($$('.vz', root), function (el) { el.classList.add('is-on'); if (!still) $$('.vz__v', el).forEach(count); });
    if (!still && fine) $$('.board__card, .project', root).forEach(function (c) { if (tilted.indexOf(c) < 0) { tilted.push(c); tilt(c); } });
  }

  window.fx = { count: function (el) { if (!still) once([el], count); }, scramble: scramble, chart: chart, mount: mount };
  if (!document.querySelector('.progress')) { var bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); document.body.prepend(bar); }
  if (still) return;
  document.documentElement.classList.add('fx');
  once($$('[data-scramble], .eyebrow'), scramble);
  var heads = $$('main h2');
  heads.forEach(split);
  once(heads, function (h) { h.classList.add('fx-on'); }, '0px 0px -8% 0px');
  once($$('[data-count]'), count);
  if (fine) {
    $$('.btn').forEach(magnet);
  }
})();
