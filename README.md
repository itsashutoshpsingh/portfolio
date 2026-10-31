# Ashutosh Pal Singh · Portfolio

Personal site for Ashutosh Pal Singh, cyber security analyst (MSc Cyber Security Engineering, University of Warwick).

Live at **https://itsashutoshpsingh.github.io/portfolio/**

## Files

- `index.html` – the page content
- `styles.css` – the page styles, opened by the Hallmark stamp
- `tokens.css`, `base.css` – the Hallmark Cobalt theme tokens and base rules
- `app.js` – the hero's ASCII field, the CVSS v3.1 calculator, the event-to-rule connectors and the copy button
- `favicon.svg`, `og.png` – the tab icon and the link-preview image
- `.claude/skills/` – Emil Kowalski's design-engineering skills and Hallmark, loaded by Claude Code in this repo
- `.hallmark/log.json` – Hallmark's build log, used to vary future builds

No build step and no dependencies apart from Google Fonts.

## Design

Built with the Hallmark skill, Cobalt theme: cool near-white paper, graphite code panels and one electric cobalt accent. The fonts are Familjen Grotesk, IBM Plex Sans and JetBrains Mono.

- **Opening:** the hero's ASCII field sweeps from noise into ranked lanes, like raw scan output becoming prioritised findings, while the "7 months" figure counts up.
- **Signature:** a working CVSS v3.1 base-score calculator using the FIRST formula.
- **Accessibility:** reduced motion is respected and everything works without JavaScript. The smallest text is 15px and controls are at least 44px tall.

The previous version of the site is in git history at commit `0943d6e`.
