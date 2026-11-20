# Ashutosh Pal Singh · Portfolio

Personal site for Ashutosh Pal Singh, security analyst (vulnerability management and threat detection; MSc Cyber Security Engineering, University of Warwick).

Live at **https://itsashutoshpsingh.github.io/portfolio/**

## Files

- `index.html`, `tokens.css`, `styles.css`, `fx.css`, `app.js`, `fx.js`, `journey.js`, `smooth.js`: the site. No build step. The only libraries are Lenis for smooth scrolling (`vendor/`, MIT); the background network, the doors and the scroll cube are plain canvas, CSS and JavaScript.
- `research/`: the research page, built from `research/data/projects.json`, which `scripts/sync_research.py` writes from each project's `results/summary.json`.
- `logos/`: company and university logos, used only to identify where the work was done.
- `404.html`: not-found page.
- `favicon.svg`, `og.png`: tab icon and link preview.
- `github/`: animated SVG cards and the README for the GitHub profile page.

## Design notes

A light page: pale blue-white base, royal navy text, electric blue for actions, green for good results, burgundy for tags (`tokens.css`). Calibri/Carlito for the interface, Georgia/Gelasio for reading. Entrance doors with a walk-through in perspective and a small Web Audio door sound. Behind the page, a 2D canvas network that reacts to scrolling; a 3D CSS cube in the corner shows progress and returns to the top. Motion is transform and opacity; reduced motion gets still frames and instant cuts. Everything is readable without JavaScript.

