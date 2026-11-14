/* Shared motion for the home page and /research: scroll-driven footage, decrypt labels,
   word-by-word headings, card tilt and magnetic buttons. Numbers are never animated: a result is
   shown as its final value, because a counting figure is a wrong figure until it stops. Transform and opacity only
   for DOM motion; IntersectionObserver, never scroll handlers. Under prefers-reduced-motion the
   footage stays on its poster frame and everything else is shown at its final state. */
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

  /* Background: real footage that moves with the page. Scrolling plays the film forward and back, eased
     so it glides instead of stepping, while the frame slowly pushes in. It never plays on its own, so
     nothing moves unless the visitor scrolls. Under reduced motion it stays on its poster frame. */
  var film = document.querySelector('video.bg');
  if (film && !still) {
    var want = 0, at = 0, ticking = false;
    var glide = function () {
      at += (want - at) * 0.12;
      if (Math.abs(want - at) < 0.0005) at = want;
      var d = film.duration, t = d ? at * (d - 0.05) : 0, late = false;
      if (d) { if (film.seeking) late = true; else if (Math.abs(film.currentTime - t) > 0.01) film.currentTime = t; }
      film.style.transform = 'scale(' + (1 + at * 0.12).toFixed(4) + ')';
      if (at !== want || late) requestAnimationFrame(glide); else ticking = false;
    };
    var aim = function () {
      var max = document.documentElement.scrollHeight - innerHeight;
      want = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      if (!ticking) { ticking = true; requestAnimationFrame(glide); }
    };
    var primed = film.play();  // some phones only load frames once play has been called
    if (primed && primed.then) primed.then(function () { film.pause(); aim(); }).catch(function () {}); else film.pause();
    film.addEventListener('loadedmetadata', aim);
    window.addEventListener('scroll', aim, { passive: true });
    window.addEventListener('resize', aim, { passive: true });
    aim();
  }

  /* Decrypt: cyan glyphs settle into the real text, left to right */
  function scramble(el) {
    var text = el.textContent, n = text.length, t0 = performance.now(), dur = Math.min(900, 300 + n * 28);
    el.setAttribute('aria-hidden', 'true');
    var esc = function (ch) { return ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch; };
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), done = Math.floor(n * k), out = esc(text.slice(0, done)), tail = '';
      for (var i = done; i < n; i++) tail += text[i] === ' ' ? ' ' : esc(GLYPHS[(Math.random() * GLYPHS.length) | 0]);
      el.innerHTML = out + (tail ? '<span class="fx-glyph">' + tail + '</span>' : '');
      if (k < 1) requestAnimationFrame(step); else { el.textContent = text; el.removeAttribute('aria-hidden'); }
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
    var raf = 0;
    btn.addEventListener('pointermove', function (e) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var r = btn.getBoundingClientRect();
        btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1) + 'px)';
      });
    });
    btn.addEventListener('pointerleave', function () { cancelAnimationFrame(raf); btn.style.transform = ''; });
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
    once($$('.vz', root), function (el) { el.classList.add('is-on'); });
    if (!still && fine) $$('.board__card, .project, .idcard', root).forEach(function (c) { if (tilted.indexOf(c) < 0) { tilted.push(c); tilt(c); } });
  }

  window.fx = { count: function () {}, scramble: scramble, chart: chart, mount: mount };  // count is kept as a no-op for older callers
  if (!document.querySelector('.progress')) { var bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); document.body.prepend(bar); }
  if (still) return;
  document.documentElement.classList.add('fx');
  once($$('[data-scramble], .eyebrow'), scramble);
  var heads = $$('main h2');
  heads.forEach(split);
  once(heads, function (h) { h.classList.add('fx-on'); }, '0px 0px -8% 0px');
  if (fine) {
    $$('.btn').forEach(magnet);
  }
})();
