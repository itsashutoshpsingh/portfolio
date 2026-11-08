# Ashutosh Pal Singh · Portfolio

Personal portfolio for Ashutosh Pal Singh, security analyst (vulnerability management and threat detection; MSc Cyber Security Engineering, University of Warwick).

Live at **https://itsashutoshpsingh.github.io/portfolio/**

## Files

- `index.html`: the page. All facts come from the master CV and the LinkedIn profile.
- `styles.css`: the design system. Geist and Geist Mono; sizes on the Tailwind type scale; spacing on the 2/4/8/12/16/24/32/40/48/64/80/96 scale.
- `app.js`: the films, scroll progress, the word-by-word statement, stacking experience cards, the work preview that follows the row in view, the nav and menu, the band control and the copy button.
- `404.html`: a branded not-found page (GitHub Pages serves it automatically).
- `favicon.svg`, `og.png`: tab icon and link-preview image.
- `.claude/skills/`: Emil Kowalski's skills and Hallmark, loaded by Claude Code in this repo.

No build step and no libraries. The two background films are MP4s hosted by MotionSites.

## Design

One film stage, and every section rolls over it as a sheet. Each section shares a rhythm: a pinned left rail with the section number and title, scrolling content on the right. The reader's position shows in a thin line at the top of the page.

- Hero: the name as display type over a film of one blue signal threading through black. Words rise out of a blur on load.
- About: his own words light up one at a time as they cross the reading line.
- Experience: cards stack and settle as you scroll; the rail tracks which role is in view.
- Work: a preview panel changes with the row in view, under the pointer or in focus.
- Contact: a second film, a figure walking into light.

Reduced motion gets still frames and final states. Everything is visible without JavaScript. The 16 MB hero film is skipped on data-saver and slow connections.
