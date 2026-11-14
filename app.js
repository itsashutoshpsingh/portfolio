(function () {
  'use strict';
  var still = matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var io = 'IntersectionObserver' in window;

  /* Live Coventry time on the card */
  var clock = $('#clock');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
    var setClock = function () { clock.textContent = 'Coventry, ' + fmt.format(new Date()); };
    setClock(); setInterval(setClock, 30000);
  }

  /* Reveals, once, staggered inside a group */
  if (io) {
    var revealIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } }); }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    $$('[data-reveal]').forEach(function (el) {
      var sibs = el.parentElement ? $$(':scope > [data-reveal]', el.parentElement) : [];
      var k = sibs.indexOf(el); if (k > 0) el.style.setProperty('--d', Math.min(k, 5));
      revealIO.observe(el);
    });
  } else $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });

  /* Nav: current section */
  var pillLinks = $$('.pill a, .trail a'), stops = $$('.trail a');
  if (io && pillLinks.length) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; pillLinks.forEach(function (a) { if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
        var k = stops.findIndex(function (a) { return a.getAttribute('href') === '#' + e.target.id; });  // the path fills up to the current stop
        if (k >= 0) stops.forEach(function (a, i) { a.parentNode.classList.toggle('is-on', i <= k); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'experience', 'cv', 'work', 'research', 'proof', 'beyond', 'faq', 'contact'].forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* Mobile menu */
  var burger = $('#burger'), menu = $('#menu');
  $$('.menu__links a').forEach(function (a, i) { a.style.setProperty('--i', i); });
  function setMenu(open) {
    menu.classList.toggle('is-open', open); menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.documentElement.classList.toggle('is-locked', open);
    var main = $('#main'), trail = $('.trail');  // nothing behind the open menu can be reached
    var skip = $('.skip');
    if (main) main.inert = open; if (trail) trail.inert = open; if (skip) skip.inert = open;
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a, [data-doors]')) setMenu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); } });
    addEventListener('resize', function () { if (innerWidth >= 1024 && menu.classList.contains('is-open')) setMenu(false); });
  }


  /* Tagline: each word lights when it crosses 60% of the viewport, observed per word */
  var tagline = $('#tagline');
  if (tagline) {
    var words = tagline.textContent.trim().split(/\s+/); tagline.textContent = '';
    words.forEach(function (w, i) { var s = document.createElement('span'); s.className = 'wd'; s.textContent = w; tagline.appendChild(s); if (i < words.length - 1) tagline.appendChild(document.createTextNode(' ')); });
    if (io && !still.matches) {
      var wordIO = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-lit', e.isIntersecting || e.boundingClientRect.top < 0); }); }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
      $$('.wd', tagline).forEach(function (w) { wordIO.observe(w); });
    } else $$('.wd', tagline).forEach(function (w) { w.classList.add('is-lit'); });
  }

  /* Copy email */
  var copyBtn = $('#copyBtn'), copyStatus = $('#copyStatus'), copyT;
  if (copyBtn) copyBtn.addEventListener('click', function () {
    function done() { copyBtn.setAttribute('data-state', 'done'); copyStatus.textContent = 'Email address copied'; clearTimeout(copyT); copyT = setTimeout(function () { copyBtn.setAttribute('data-state', 'idle'); copyStatus.textContent = ''; }, 2000); }
    function fallback() { var r = document.createRange(); r.selectNodeContents($('#emailLink')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); copyStatus.textContent = 'Email selected. Press Ctrl+C or Cmd+C to copy.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('itsashutoshpsingh@gmail.com').then(done, fallback); else fallback();
  });
})();

// Research board: every number and chart comes from research/data/projects.json, built from each repo's results
fetch('research/data/projects.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
  var board = document.getElementById('board'), stats = document.getElementById('boardStats'), ps = d.projects || [];
  var esc = function (x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var series = ps.reduce(function (n, p) { return n + (p.viz || []).length; }, 0);
  var charts = ps.reduce(function (n, p) { return n + (p.charts || []).length; }, 0);
  stats.innerHTML = [[ps.length, 'Open benchmarks'], [series, 'Result series'], [charts, 'Published charts']].map(function (s) {
    return '<p><b class="mono">' + s[0] + '</b><span>' + s[1] + '</span></p>'; }).join('');
  board.innerHTML = ps.map(function (p, i) {
    var v = (p.viz || [])[0];
    return '<article class="board__card' + (i === 0 ? ' board__card--wide' : '') + '">' +
      '<p class="board__tags caption-3 mono">' + p.tags.map(esc).join(' · ') + '</p>' +
      '<h3 class="title-1">' + esc(p.title) + '</h3>' +
      '<p class="board__n mono"><b>' + esc(p.proof.value) + '</b><span>' + esc(p.proof.label) + '</span></p>' +
      '<p class="body-6 board__one">' + esc(p.oneLine) + '</p>' +
      (v && window.fx ? window.fx.chart(v) : '') +
      '<p class="board__links"><a class="textlink caption-2" href="' + esc(p.repo) + '" target="_blank" rel="noopener" aria-label="Repository: ' + esc(p.title) + '">Repository</a>' +
      '<a class="textlink caption-2" href="research/#' + esc(p.slug) + '" aria-label="Results: ' + esc(p.title) + '">Results</a></p></article>';
  }).join('');
  board.removeAttribute('aria-busy');
  if (window.fx) window.fx.mount(board);
  var deep = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (deep) deep.scrollIntoView({ behavior: 'instant' });
}).catch(function () {
  var board = document.getElementById('board');
  if (board) { board.removeAttribute('aria-busy'); board.innerHTML = '<p class="body-3" role="alert">The results did not load. Open the <a class="textlink" href="research/">research page</a> instead.</p>'; }
});

// Entrance doors: shown once per visit on a plain arrival (deep links and no-JS visitors go straight in).
// Any "Doors" control reopens them; closing puts focus back where it came from.
(function () {
  var gate = document.getElementById('gate');
  if (!gate) return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var main = document.getElementById('main'), opener = null, timer = 0, pending = null, was = 0;
  var go = function (target) {
    var el = target && document.querySelector(target);
    if (!el) return false;
    if (target === '#top') scrollTo({ top: 0, behavior: 'auto' });
    else el.scrollIntoView({ behavior: 'auto' });
    var head = el.querySelector('h1, h2'); if (head) { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); }
    return !!head;
  };
  var close = function (target) {
    clearTimeout(timer); timer = 0; pending = null;
    gate.hidden = true; document.body.classList.remove('gated'); if (main) main.inert = false;
    try { sessionStorage.setItem('gate', '1'); } catch (e) {}
    if (!go(target)) { scrollTo({ top: was, behavior: 'instant' }); var back = opener && opener.offsetParent ? opener : document.querySelector('.brand'); if (back) back.focus({ preventScroll: true }); }
    opener = null;
  };
  var open = function (from) {
    opener = from || null; was = scrollY;
    gate.classList.remove('is-leaving');
    gate.querySelectorAll('.door').forEach(function (d) { d.classList.remove('is-open'); });
    scrollTo({ top: 0, behavior: 'instant' });
    gate.hidden = false; document.body.classList.add('gated'); if (main) main.inert = true;
    gate.querySelector('.door').focus({ preventScroll: true });
  };
  gate.querySelectorAll('.door').forEach(function (d) {
    d.addEventListener('click', function () {
      if (pending) { close(pending); return; }  // a second click skips the rest of the animation
      pending = d.getAttribute('data-go');
      d.classList.add('is-open'); gate.classList.add('is-leaving');
      timer = setTimeout(function () { close(pending); }, still ? 0 : 900);
    });
  });
  gate.querySelector('.gate__skip').addEventListener('click', function () { close(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gate.hidden) close(pending); });
  document.querySelectorAll('[data-doors]').forEach(function (b) { b.addEventListener('click', function () { open(b.closest('.menu') ? document.getElementById('burger') : b); }); });

  var seen = false;
  try { seen = sessionStorage.getItem('gate') === '1'; } catch (e) {}
  if (!seen && !location.hash) open(null);
})();

// Ticker: a visible pause control, because it never stops on its own
(function () {
  var btn = document.querySelector('.ticker__pause'), ticker = document.querySelector('.ticker');
  if (!btn || !ticker) return;
  btn.addEventListener('click', function () {
    var paused = ticker.classList.toggle('is-paused');
    btn.setAttribute('aria-pressed', String(paused));
  });
})();

// Scroll story: on wide screens the three steps are pinned for under one screen of scrolling and swap as
// you go, so the page never feels held. Three invisible markers tell an IntersectionObserver which step is
// current (no scroll handler). Phones, reduced motion and old browsers keep the plain three-card row.
(function () {
  var story = document.querySelector('[data-scrolly]');
  if (!story || !('IntersectionObserver' in window)) return;
  var calm = matchMedia('(prefers-reduced-motion: reduce)'), wide = matchMedia('(min-width: 900px)');
  var n = story.querySelectorAll('.step').length, marks = document.createElement('div');
  marks.className = 'scrolly__marks'; marks.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < n; i++) { var m = document.createElement('i'); m.dataset.i = i; marks.appendChild(m); }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) story.dataset.step = e.target.dataset.i; });
  }, { rootMargin: '-50% 0px -50% 0px' });
  var set = function () {
    var on = wide.matches && !calm.matches;
    if (on === story.classList.contains('is-scrolly')) return;
    story.classList.toggle('is-scrolly', on);
    if (on) {
      story.querySelectorAll('.step').forEach(function (s) { s.removeAttribute('data-reveal'); });  // the pinned stage shows and hides the steps itself
      story.appendChild(marks); story.dataset.step = '0';
      marks.querySelectorAll('i').forEach(function (m) { io.observe(m); });
    } else { io.disconnect(); marks.remove(); delete story.dataset.step; }
  };
  wide.addEventListener('change', set); calm.addEventListener('change', set);
  set();
})();
