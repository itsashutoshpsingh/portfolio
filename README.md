# Ashutosh Pal Singh · Portfolio

Personal site for Ashutosh Pal Singh, cyber security analyst (MSc Cyber Security Engineering, University of Warwick).

Live at **https://itsashutoshpsingh.github.io/portfolio/**

## What's here

- `index.html` – the whole site: HTML, CSS and JavaScript in one file, with no build step and no dependencies apart from Google Fonts.
- `favicon.svg`, `og.png` – the tab icon and the link-preview image used on LinkedIn, Slack and email.
- `.nojekyll` – tells GitHub Pages to serve the files as they are.

## Design notes

- **Direction:** a signed evidence file. The palette is calm, the type is large, and claims link to proof wherever public proof exists.
- **Opening:** a short integrity check. It plays once per browser session, can be skipped, and is turned off when the visitor asks for reduced motion.
- **Journey:** a chain-of-custody line that follows the scroll through a critically damped spring and seals each milestone as it passes.
- **Themes and accessibility:** light and dark themes follow the system setting and can be switched by hand. The smallest text is 15px and tap targets are at least 44px. Reduced motion, reduced transparency and high contrast settings are respected.

## Editing

All content is plain HTML in `index.html`. Search for the section `id` (`journey`, `work`, `toolkit`, `credentials`, `contact`) and edit the text directly. Colour and type tokens live at the top of the `<style>` block.

The previous version of the site is preserved at the git tag `v1-archive`.
