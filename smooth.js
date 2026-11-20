/* Smooth, eased wheel and trackpad scrolling. Touch keeps the phone's own scroll, and under reduced motion
   the browser scrolls as usual. Scrolling stops behind the doors and the open menu, as it does natively. */
(function () {
  if (!window.Lenis || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -96 }, allowNestedScroll: true, autoRaf: true });
  window.lenis = lenis;
  var root = document.documentElement;
  var lock = function () {
    var held = document.body.classList.contains('gated') || root.classList.contains('is-locked');
    if (held && !lenis.isStopped) lenis.stop(); else if (!held && lenis.isStopped) lenis.start();
  };
  new MutationObserver(lock).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(lock).observe(root, { attributes: true, attributeFilter: ['class'] });
  lock();
})();
