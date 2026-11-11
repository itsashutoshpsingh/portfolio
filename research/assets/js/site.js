(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Mobile menu */
  const toggle = $(".nav__toggle"), menu = $("#menu");
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) menu.hidden = false;
    requestAnimationFrame(() => {
      menu.classList.toggle("open", open);
      [...menu.querySelectorAll("a")].forEach((a, i) => (a.style.transitionDelay = open ? `${Math.min(i * 60, 400)}ms` : "0ms"));
    });
    if (!open) setTimeout(() => { if (toggle.getAttribute("aria-expanded") === "false") menu.hidden = true; }, 300);
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* Current section in nav */
  const navLinks = [...document.querySelectorAll(".nav__links a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === `#${en.target.id}` ? "true" : "false"));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["work", "method", "misses", "faq", "contact"].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

  /* Scroll reveal, once per element */
  const riser = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); riser.unobserve(en.target); } });
  }, { threshold: 0.12 });
  const watchRise = (root = document) => root.querySelectorAll(".rise:not(.in)").forEach((el) => riser.observe(el));

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

  /* Count up the numeric part of a value such as "12.4%" or "1,203" */
  const countUp = (el) => {
    const raw = el.dataset.value;
    const m = raw.match(/-?[\d,]*\.?\d+/);
    if (reduced || !m) { el.textContent = raw; return; }
    const target = parseFloat(m[0].replace(/,/g, ""));
    const decimals = (m[0].split(".")[1] || "").length;
    const comma = m[0].includes(",");
    const fmt = (v) => { const s = v.toFixed(decimals); return comma ? Number(s).toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : s; };
    const t0 = performance.now(), dur = 1400;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = raw.replace(m[0], fmt(target * e));
      if (p < 1) requestAnimationFrame(tick); else el.textContent = raw;
    };
    requestAnimationFrame(tick);
  };
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { countUp(en.target); countObs.unobserve(en.target); } });
  }, { threshold: 0.6 });

  /* Terminal replay of real headline lines */
  const typeTerminal = async (lines) => {
    const term = $("#term");
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    if (reduced) {
      term.innerHTML = lines.map((l) => `<span class="p">$ </span>${esc(l.cmd)}\n${l.out.map((o) => `<span class="o">${esc(o)}</span>`).join("\n")}`).join("\n\n");
      return;
    }
    for (;;) {
      term.innerHTML = "";
      for (const l of lines) {
        const row = document.createElement("span");
        row.innerHTML = '<span class="p">$ </span>';
        term.append(row);
        const cursor = document.createElement("span"); cursor.className = "cursor";
        for (const ch of l.cmd) { row.append(ch); row.append(cursor); await sleep(28 + Math.random() * 40); }
        cursor.remove();
        await sleep(380);
        for (const o of l.out) {
          const out = document.createElement("span");
          out.className = /->|=|%/.test(o) ? "hl" : "o";
          out.textContent = "\n" + o;
          term.append(out);
          await sleep(110);
        }
        term.append("\n\n");
        await sleep(900);
      }
      const c = document.createElement("span"); c.className = "cursor"; term.append(c);
      await sleep(6000);
    }
  };

  /* Render projects from data/projects.json */
  const render = (data) => {
    const projects = data.projects || [];
    $("#proof").innerHTML = projects.map((p) => `
      <div class="proof__item"><span class="proof__value" data-value="${esc(p.proof.value)}">${esc(p.proof.value)}</span><span class="caption-5 muted">${esc(p.proof.label)}</span></div>`).join("");
    $("#projects").innerHTML = projects.map((p, i) => `
      <article class="project rise" id="${esc(p.slug)}">
        <div class="project__info">
          <div class="tags">${p.tags.map((t) => `<span class="tag caption-3">${esc(t)}</span>`).join("")}</div>
          <h3 class="heading-3 mono">${esc(p.title)}</h3>
          <p class="title-2 muted">${esc(p.oneLine)}</p>
          <p class="body-3 project__headline">${esc(p.headline)}</p>
          <div class="metrics">${p.metrics.map((m) => `
            <div class="metric"><span class="metric__value" data-value="${esc(m.value)}">${esc(m.value)}</span><span class="caption-5 muted">${esc(m.label)}</span></div>`).join("")}</div>
          <div class="project__links">
            <a class="btn btn--primary button-sm" href="${esc(p.repo)}"><i class="ph ph-github-logo" aria-hidden="true"></i>Repository</a>
            ${p.report ? `<a class="btn btn--ghost button-sm" href="${esc(p.report)}"><i class="ph ph-file-text" aria-hidden="true"></i>Full write up</a>` : ""}
          </div>
        </div>
        <figure class="figure">
          <div class="figure__frame"><img src="${esc(p.charts[0].src)}" alt="${esc(p.charts[0].alt)}" loading="lazy" id="fig-${i}"></div>
          ${p.charts.length > 1 ? `<div class="figure__tabs" role="tablist" aria-label="${esc(p.title)} charts">${p.charts.map((c, j) => `
            <button class="caption-5" role="tab" aria-selected="${j === 0}" data-fig="${i}" data-src="${esc(c.src)}" data-alt="${esc(c.alt)}">${esc(c.label)}</button>`).join("")}</div>` : ""}
          <figcaption class="caption-5 muted">${esc(p.charts[0].alt)}</figcaption>
        </figure>
      </article>`).join("");
    $("#miss-list").innerHTML = projects.map((p) => `
      <div class="miss rise"><h3 class="title-2"><i class="ph ph-warning" aria-hidden="true"></i> ${esc(p.title)}</h3>
      <ul class="body-6">${p.misses.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      <a class="caption-3 mono" href="${esc(p.repo)}/blob/main/docs/what-went-wrong.md">Read the full list</a></div>`).join("");

    document.querySelectorAll(".figure__tabs button").forEach((b) => b.addEventListener("click", () => {
      const img = $(`#fig-${b.dataset.fig}`);
      img.style.opacity = 0;
      setTimeout(() => { img.src = b.dataset.src; img.alt = b.dataset.alt; img.closest("figure").querySelector("figcaption").textContent = b.dataset.alt; img.style.opacity = 1; }, 200);
      b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", x === b));
    }));
    document.querySelectorAll("[data-value]").forEach((el) => countObs.observe(el));
    watchRise();

    if (data.profile) {
      if (data.profile.bio) $("#bio").textContent = data.profile.bio;
      if (data.profile.links) $("#contact-links").innerHTML = data.profile.links.map((l, i) => `
        <a class="btn ${i === 0 ? "btn--primary" : "btn--ghost"} button-md" href="${esc(l.url)}"><i class="ph ${esc(l.icon)}" aria-hidden="true"></i>${esc(l.label)}</a>`).join("");
    }
    if (data.terminal) typeTerminal(data.terminal);
  };

  fetch("data/projects.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(() => {
      $("#projects").innerHTML = '<div class="error-box body-3">Results did not load. Refresh the page, or open the repositories directly on <a href="https://github.com/itsashutoshpsingh">GitHub</a>.</div>';
      $("#proof").innerHTML = "";
    });
  watchRise();

  /* Hero canvas: drifting address graph; red edges mark a false merge between clusters */
  const cv = $("#graph");
  if (!reduced && cv) {
    const ctx = cv.getContext("2d");
    let W, H, nodes = [], running = true, dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, (W * H) / 16000));
      nodes = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        c: i % 5, r: 1.2 + Math.random() * 1.6,
      }));
    };
    resize();
    addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
    const frame = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const a of nodes) { a.x += a.vx; a.y += a.vy; if (a.x < 0 || a.x > W) a.vx *= -1; if (a.y < 0 || a.y > H) a.vy *= -1; }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 130) continue;
        const cross = a.c !== b.c;
        if (cross && d > 60) continue;
        ctx.strokeStyle = cross ? `rgba(255,77,109,${0.5 * (1 - d / 60)})` : `rgba(0,229,160,${0.28 * (1 - d / 130)})`;
        ctx.lineWidth = cross ? 1.2 : 0.8;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (const a of nodes) { ctx.fillStyle = a.c === 0 ? "#ffb000" : "#00e5a0"; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.fill(); }
      requestAnimationFrame(frame);
    };
    new IntersectionObserver(([en]) => { const was = running; running = en.isIntersecting && !document.hidden; if (running && !was) requestAnimationFrame(frame); }).observe(cv);
    document.addEventListener("visibilitychange", () => { const was = running; running = !document.hidden; if (running && !was) requestAnimationFrame(frame); });
    requestAnimationFrame(frame);
  }
})();
