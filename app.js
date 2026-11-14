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
  var pillLinks = $$('.pill a');
  if (io && pillLinks.length) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; pillLinks.forEach(function (a) { if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['top', 'experience', 'cv', 'work', 'research', 'proof', 'beyond', 'faq', 'contact'].forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* Mobile menu */
  var burger = $('#burger'), menu = $('#menu');
  $$('.menu__links a').forEach(function (a, i) { a.style.setProperty('--i', i); });
  function setMenu(open) {
    menu.classList.toggle('is-open', open); menu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
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
    return '<p><b class="mono" data-count>' + s[0] + '</b><span>' + s[1] + '</span></p>'; }).join('');
  board.innerHTML = ps.map(function (p, i) {
    var v = (p.viz || [])[0];
    return '<article class="board__card' + (i === 0 ? ' board__card--wide' : '') + '">' +
      '<p class="board__tags caption-3 mono">' + p.tags.map(esc).join(' · ') + '</p>' +
      '<h3 class="title-1">' + esc(p.title) + '</h3>' +
      '<p class="board__n mono"><b data-count>' + esc(p.proof.value) + '</b><span>' + esc(p.proof.label) + '</span></p>' +
      '<p class="body-6 board__one">' + esc(p.oneLine) + '</p>' +
      (v && window.fx ? window.fx.chart(v) : '') +
      '<p class="board__links"><a class="textlink caption-2" href="' + esc(p.repo) + '" target="_blank" rel="noopener">Repository</a>' +
      '<a class="textlink caption-2" href="research/#' + esc(p.slug) + '">Results</a></p></article>';
  }).join('');
  board.removeAttribute('aria-busy');
  if (window.fx) { document.querySelectorAll('#research [data-count]').forEach(window.fx.count); window.fx.mount(board); }
}).catch(function () {
  var board = document.getElementById('board');
  if (board) { board.removeAttribute('aria-busy'); board.innerHTML = '<p class="body-3">The results did not load. Open the <a class="textlink" href="research/">research page</a> instead.</p>'; }
});
