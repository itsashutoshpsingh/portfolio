/* Shared motion for the home page and /research: decrypt labels, word-by-word headings,
   count-ups, card tilt and magnetic buttons. Transform and opacity only; IntersectionObserver,
   never scroll handlers. Everything is skipped under prefers-reduced-motion. */
(function () {
  'use strict';
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var GLYPHS = '!<>/[]{}=+*#%01ABCDEF';
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var once = function (els, fn, margin) {
    if (!('IntersectionObserver' in window)) { els.forEach(fn); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } });
    }, { rootMargin: margin || '0px 0px -12% 0px' });
    els.forEach(function (el) { io.observe(el); });
  };

  /* Decrypt: random glyphs settle into the real text, left to right */
  function scramble(el) {
    var text = el.textContent, n = text.length, t0 = performance.now(), dur = Math.min(900, 300 + n * 28);
    el.setAttribute('aria-label', text);
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), done = Math.floor(n * k), out = '';
      for (var i = 0; i < n; i++) out += i < done || text[i] === ' ' ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
      if (k < 1) requestAnimationFrame(step); else el.removeAttribute('aria-label');
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
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      var v = m[1] + fmt(target * e) + m[3];
      if (node === el) el.textContent = v; else node.nodeValue = v;
      if (k < 1) requestAnimationFrame(step);
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
    card.addEventListener('pointerenter', function () { card.style.transition = 'transform 200ms ' + EASE + ', border-color 300ms ' + EASE; });
    card.addEventListener('pointermove', function (e) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateX(' + (-y * 3).toFixed(2) + 'deg) rotateY(' + (x * 3).toFixed(2) + 'deg) translateY(-4px)';
      });
    });
    card.addEventListener('pointerleave', function () { cancelAnimationFrame(raf); card.style.transition = 'transform 500ms ' + EASE + ', border-color 300ms ' + EASE; card.style.transform = ''; });
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
  if (still) return;
  document.documentElement.classList.add('fx');
  once($$('[data-scramble], .eyebrow'), scramble);
  var heads = $$('main h2');
  heads.forEach(split);
  once(heads, function (h) { h.classList.add('fx-on'); }, '0px 0px -8% 0px');
  once($$('[data-count]'), count);
  if (fine) {
    $$('.glassline, .project, .miss, .step, .metric').forEach(tilt);
    $$('.btn').forEach(magnet);
  }
})();
