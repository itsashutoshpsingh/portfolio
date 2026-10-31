# Ashutosh Pal Singh · Portfolio

Personal portfolio for Ashutosh Pal Singh, cyber security analyst (MSc Cyber Security Engineering, University of Warwick).

Live at **https://itsashutoshpsingh.github.io/portfolio/**

## Files

- `index.html`: all content, taken from the master CV
- `styles.css`: the Night Ops design system and the motion tokens
- `app.js`: the hero network, cursor spotlight, card glow, scroll reveals and counters, nav indicator, timeline progress, project dialogs, CVSS v3.1 calculator, marquee control and copy button
- `favicon.svg`, `og.png`: the tab icon and the link-preview image
- `.claude/skills/`: Emil Kowalski's skills and Hallmark, loaded by Claude Code in this repo

No build step and no dependencies apart from Google Fonts (Geist and Geist Mono).

## Motion principles

The motion follows Emil Kowalski's design-engineering rules:

- custom ease-out curves, with interface animations under 300ms
- only transform and opacity animate, plus clip-path for the nav indicator
- buttons give press feedback (scale 0.97), and hover effects only run on devices with a fine pointer
- the menu opens from its button, and dialogs exit faster than they enter
- decorative loops stop after a few cycles and pause when off screen
- reduced motion gets a calm version with no movement, and everything is visible without JavaScript

The previous versions are in git history.
