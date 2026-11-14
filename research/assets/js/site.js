(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Mobile menu */
  const toggle = $(".nav__toggle"), menu = $("#menu");
  const behind = [$(".skip"), $("main"), $("footer")];
  const isOpen = () => menu.classList.contains("open");
  const setMenu = (open) => {
    if (open === isOpen()) return;
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("open", open);
    document.documentElement.classList.toggle("menu-open", open);
    // inert keeps Tab and screen readers inside the nav and the menu while it covers the page
    behind.forEach((el) => { el.inert = open; });
    menu.querySelectorAll("a").forEach((a, i) => { a.style.transitionDelay = open ? `${Math.min(i * 60, 400)}ms` : "0ms"; });
  };
  toggle.addEventListener("click", () => setMenu(!isOpen()));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) { setMenu(false); toggle.focus(); } });
  // the same width at which the CSS swaps the toggle for the full nav
  matchMedia("(min-width: 901px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* Current section in nav */
  const navLinks = [...document.querySelectorAll(".nav__links a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === `#${en.target.id}` ? "true" : "false"));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["work", "method", "misses", "published", "faq", "contact"].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

  /* Scroll reveal, once per element. "is-on" is the class ../fx.css grows the result bars on. */
  const riser = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in", "is-on"); riser.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px" });
  const watchRise = (root = document) => root.querySelectorAll(".rise:not(.in), .vz:not(.is-on)").forEach((el) => riser.observe(el));

  /* Tagline: one word at a time as it crosses the trigger line */
  const tagline = $("#tagline");
  (function splitWords(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(part);
          const s = document.createElement("span");
          s.className = "w" + (node.classList && node.classList.contains("accent") ? " accent" : "");
          s.textContent = part;
          frag.append(s);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) splitWords(child);
    });
  })(tagline);
  if (!reduced) {
    const words = [...tagline.querySelectorAll(".w")];
    const wordObs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("on"); wordObs.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -38% 0px" });
    words.forEach((w) => wordObs.observe(w));
  } else tagline.querySelectorAll(".w").forEach((w) => w.classList.add("on"));

  /* Terminal replay of real headline lines: typed once, then left as it is */
  const typeTerminal = async (lines) => {
    const term = $("#term");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    if (reduced) {
      term.innerHTML = lines.map((l) => `<span class="p">$ </span>${esc(l.cmd)}\n${l.out.map((o) => `<span class="o">${esc(o)}</span>`).join("\n")}`).join("\n\n");
      return;
    }
    // the box has a fixed height, so follow the newest line the way a terminal does
    const follow = () => { term.scrollTop = term.scrollHeight; };
    term.innerHTML = "";
    for (const [i, l] of lines.entries()) {
      const row = document.createElement("span");
      row.innerHTML = '<span class="p">$ </span>';
      term.append(row);
      const cursor = document.createElement("span"); cursor.className = "cursor";
      for (const ch of l.cmd) { row.append(ch); row.append(cursor); follow(); await sleep(28 + Math.random() * 40); }
      cursor.remove();
      await sleep(380);
      for (const o of l.out) {
        const out = document.createElement("span");
        out.className = "o";
        out.textContent = "\n" + o;
        term.append(out);
        follow();
        await sleep(110);
      }
      if (i < lines.length - 1) { term.append("\n\n"); await sleep(900); }
    }
  };

  /* Render projects from data/projects.json. Values are written once, as published: no counting up. */
  const render = (data) => {
    const projects = data.projects || [];
    $("#proof").innerHTML = projects.map((p) => `
      <div class="proof__item"><span class="proof__value">${esc(p.proof.value)}</span><span class="caption-5 muted">${esc(p.proof.label)}</span></div>`).join("");
    $("#projects").innerHTML = projects.map((p, i) => {
      const c0 = p.charts[0], name = esc(p.title);
      return `
      <article class="project rise" id="${esc(p.slug)}">
        <div class="project__info">
          <div class="tags">${p.tags.map((t) => `<span class="tag caption-3">${esc(t)}</span>`).join("")}</div>
          <h3 class="heading-3 mono">${name}</h3>
          <p class="title-2 muted">${esc(p.oneLine)}</p>
          <p class="body-3 project__headline">${esc(p.headline)}</p>
          <div class="metrics">${p.metrics.map((m) => `
            <div class="metric"><span class="metric__value">${esc(m.value)}</span><span class="caption-5 muted">${esc(m.label)}</span></div>`).join("")}</div>
          <div class="project__links">
            <a class="btn btn--primary button-sm" href="${esc(p.repo)}" aria-label="Repository: ${name}"><i class="ph ph-github-logo" aria-hidden="true"></i>Repository</a>
            ${p.report ? `<a class="btn btn--ghost button-sm" href="${esc(p.report)}" aria-label="Full write up: ${name}"><i class="ph ph-file-text" aria-hidden="true"></i>Full write up</a>` : ""}
          </div>
        </div>
        <figure class="figure">
          <a class="figure__frame" href="${esc(c0.src)}" target="_blank" rel="noopener" title="Open the chart at full size"><img src="${esc(c0.src)}" alt="${esc(c0.alt)}" width="${c0.w}" height="${c0.h}" loading="lazy"></a>
          ${p.charts.length > 1 ? `<div class="figure__tabs" role="group" aria-label="${name} charts">${p.charts.map((c, j) => `
            <button class="caption-5" type="button" aria-pressed="${j === 0}" data-project="${i}" data-chart="${j}">${esc(c.label)}</button>`).join("")}</div>` : ""}
          <figcaption class="caption-5 muted">${esc(c0.alt)}</figcaption>
        </figure>
        ${(p.viz || []).length && window.fx ? `<div class="project__viz">${p.viz.map(window.fx.chart).join("")}</div>` : ""}
      </article>`;
    }).join("");
    $("#miss-list").innerHTML = projects.map((p) => `
      <div class="miss rise"><h3 class="title-2"><i class="ph ph-warning" aria-hidden="true"></i> ${esc(p.title)}</h3>
      <ul class="body-6">${p.misses.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      <a class="caption-3 mono" href="${esc(p.repo)}/blob/main/docs/what-went-wrong.md" aria-label="Read the full list: ${esc(p.title)}">Read the full list</a></div>`).join("");

    $("#projects").addEventListener("click", (e) => {
      const b = e.target.closest(".figure__tabs button");
      if (!b) return;
      const fig = b.closest("figure"), c = projects[b.dataset.project].charts[b.dataset.chart];
      Object.assign(fig.querySelector("img"), { src: c.src, alt: c.alt, width: c.w, height: c.h });
      fig.querySelector("a").href = c.src;
      fig.querySelector("figcaption").textContent = c.alt;
      fig.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    });
    watchRise();

    if (data.profile) {
      if (data.profile.bio) $("#bio").textContent = data.profile.bio;
      if (data.profile.links) $("#contact-links").innerHTML = data.profile.links.map((l, i) => `
        <a class="btn ${i === 0 ? "btn--primary" : "btn--ghost"} button-md" href="${esc(l.url)}"><i class="ph ${esc(l.icon)}" aria-hidden="true"></i>${esc(l.label)}</a>`).join("");
    }
    if (data.terminal) typeTerminal(data.terminal);

    // The targets of deep links (a project id, or a section below the projects) only reach their
    // real position now, so go there again.
    const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      target.classList.remove("rise");  // a card still sliding in would be measured 32px low
      target.scrollIntoView({ behavior: "instant" });
    }
  };

  fetch("data/projects.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(() => {
      $("#projects").innerHTML = '<div class="error-box body-3">Results did not load. Refresh the page, or open the repositories directly on <a href="https://github.com/itsashutoshpsingh">GitHub</a>.</div>';
      $("#proof").innerHTML = "";
    });
  watchRise();

})();
