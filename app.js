(function () {
  'use strict';
  var root = document.documentElement;
  var still = matchMedia('(prefers-reduced-motion: reduce)');
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var rafQueue = [], rafId = 0;
  function onFrame(fn) { rafQueue.push(fn); }
  function tick() {
    rafId = 0;
    for (var i = 0; i < rafQueue.length; i++) rafQueue[i]();
  }
  function request() { if (!rafId) rafId = requestAnimationFrame(tick); }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);

  /* ---------- Films: fade in on first frame, pause off screen, still frame under reduced motion ---------- */
  function mountFilm(video, opts) {
    var src = video.getAttribute('data-src');
    if (!src) return;
    video.muted = true; video.playsInline = true; video.src = src;
    var ready = function () { video.classList.add('is-ready'); };
    if (video.readyState >= 2) ready(); else video.addEventListener('loadeddata', ready, { once: true });
    if (still.matches) { video.removeAttribute('autoplay'); video.pause(); return; }
    if (opts && opts.fadeLoop) fadeLoop(video); else { video.loop = true; video.play().catch(function () {}); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) video.play().catch(function () {}); else video.pause();
      }, { threshold: 0.05 }).observe(video);
    }
  }
  // Manual loop: fade out just before the last frame, 100ms of black, restart. Hides the cut.
  function fadeLoop(video) {
    var raf = 0, fadingOut = false;
    function fadeTo(target, ms) {
      cancelAnimationFrame(raf);
      var from = parseFloat(video.style.opacity) || (video.classList.contains('is-ready') ? 1 : 0), t0 = performance.now();
      (function step(now) {
        var p = Math.min((now - t0) / ms, 1);
        video.style.opacity = String(from + (target - from) * p);
        if (p < 1) raf = requestAnimationFrame(step);
      })(t0);
    }
    video.loop = false;
    video.addEventListener('timeupdate', function () {
      var left = video.duration - video.currentTime;
      if (!fadingOut && left > 0 && left <= 0.55) { fadingOut = true; fadeTo(0, 500); }
    });
    video.addEventListener('ended', function () {
      cancelAnimationFrame(raf); video.style.opacity = '0';
      setTimeout(function () { video.currentTime = 0; fadingOut = false; video.play().catch(function () {}); fadeTo(1, 500); }, 100);
    });
    video.play().catch(function () {});
  }
  // The hero film is 16 MB: skip it on data-saver or slow connections and keep the black stage.
  var conn = navigator.connection || {};
  var lean = conn.saveData || /(^|-)2g$|^3g$/.test(conn.effectiveType || '');
  var film = $('#film'); if (film && !lean) mountFilm(film, { fadeLoop: true });
  var closeFilm = $('.close__film'); if (closeFilm) mountFilm(closeFilm);

  /* ---------- Live local time in the corner label ---------- */
  var clock = $('#clock');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London', timeZoneName: 'short' });
    var setClock = function () { clock.textContent = fmt.format(new Date()); };
    setClock(); setInterval(setClock, 30000);
  }

  /* ---------- Scroll progress line ---------- */
  var progress = $('#progress');
  onFrame(function () {
    var max = root.scrollHeight - innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0).toFixed(4) + ')';
  });

  /* ---------- Nav: current section, mobile menu ---------- */
  var pillLinks = $$('.pill a'), menuLinks = $$('.menu__links a');
  menuLinks.forEach(function (a, i) { a.style.setProperty('--i', i); });
  var current = null;
  function setCurrent(id) {
    if (id === current) return; current = id;
    pillLinks.forEach(function (a) { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) setCurrent(e.target.id); }); }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'about', 'experience', 'work', 'toolkit', 'credentials', 'approach', 'contact'].forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }
  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    addEventListener('resize', function () { if (innerWidth >= 1024 && menu.classList.contains('is-open')) setMenu(false); });
  }

  /* ---------- Reveals (once) ---------- */
  var revealIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }) : null;
  $$('[data-reveal]').forEach(function (el, i) {
    if (!el.style.getPropertyValue('--d') && el.parentElement) {
      var sibs = $$(':scope > [data-reveal]', el.parentElement); var k = sibs.indexOf(el); if (k > 0) el.style.setProperty('--d', Math.min(k, 5));
    }
    if (revealIO) revealIO.observe(el); else el.classList.add('is-in');
  });

  /* ---------- Statement: each word lights as it crosses 60% of the viewport ---------- */
  var statement = $('[data-reveal-words]');
  if (statement) {
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'wd'; s.textContent = part; frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) split(n);
      });
    })(statement);
    var words = $$('.wd', statement);
    onFrame(function () {
      var line = innerHeight * 0.6;
      for (var i = 0; i < words.length; i++) {
        var r = words[i].getBoundingClientRect();
        words[i].classList.toggle('is-lit', still.matches || r.top + r.height / 2 < line);
      }
    });
  }

  /* ---------- Experience: stacking cards + rail index ---------- */
  var stack = $('#stack'), jobs = $$('.job'), expIndex = $$('#expIndex li');
  if (stack && jobs.length) {
    var n = jobs.length;
    onFrame(function () {
      var wide = innerWidth >= 1024;
      var r = stack.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      var active = 0;
      jobs.forEach(function (card, i) {
        if (wide && !still.matches) {
          var target = 1 - (n - 1 - i) * 0.03, t = Math.min(1, Math.max(0, (p - i / n) / (1 - i / n)));
          card.style.transform = 'scale(' + (1 + (target - 1) * t).toFixed(4) + ')';
        } else card.style.transform = '';
        if (card.getBoundingClientRect().top < innerHeight * 0.5) active = i;
      });
      expIndex.forEach(function (li, i) { li.classList.toggle('is-on', i === active); });
    });
  }

  /* ---------- Work: the preview follows the row in view, or the one under the pointer ---------- */
  var rows = $$('.row'), pvs = $$('.pv'), pinned = null, hovered = null;
  function showPv(key) {
    pvs.forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-pv') === key); });
    rows.forEach(function (r) { r.classList.toggle('is-on', r.getAttribute('data-key') === key); });
  }
  if (rows.length) {
    onFrame(function () {
      var best = null, bestD = Infinity, line = innerHeight * 0.45;
      rows.forEach(function (r) { var b = r.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - line); if (d < bestD) { bestD = d; best = r.getAttribute('data-key'); } });
      pinned = best; if (!hovered) showPv(pinned);
    });
    if (fine.matches) rows.forEach(function (r) {
      r.addEventListener('pointerenter', function () { hovered = r.getAttribute('data-key'); showPv(hovered); });
      r.addEventListener('pointerleave', function () { hovered = null; showPv(pinned); });
    });
    rows.forEach(function (r) {
      r.addEventListener('focusin', function () { hovered = r.getAttribute('data-key'); showPv(hovered); });
      r.addEventListener('focusout', function () { hovered = null; showPv(pinned); });
    });
  }

  /* ---------- Band pause ---------- */
  var band = $('#band'), bandPause = $('#bandPause');
  if (band && bandPause) bandPause.addEventListener('click', function () {
    var paused = band.classList.toggle('is-paused');
    bandPause.textContent = paused ? 'Play' : 'Pause'; bandPause.setAttribute('aria-pressed', String(paused));
  });

  /* ---------- Copy email ---------- */
  var copyBtn = $('#copyBtn'), copyStatus = $('#copyStatus'), copyT;
  if (copyBtn) copyBtn.addEventListener('click', function () {
    function done() { copyBtn.setAttribute('data-state', 'done'); copyStatus.textContent = 'Email address copied'; clearTimeout(copyT); copyT = setTimeout(function () { copyBtn.setAttribute('data-state', 'idle'); copyStatus.textContent = ''; }, 2000); }
    function fallback() { var rg = document.createRange(); rg.selectNodeContents($('#emailLink')); var s = getSelection(); s.removeAllRanges(); s.addRange(rg); copyStatus.textContent = 'Email selected. Press Ctrl+C or Cmd+C to copy.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('itsashutoshpsingh@gmail.com').then(done, fallback); else fallback();
  });

  request();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);
})();
