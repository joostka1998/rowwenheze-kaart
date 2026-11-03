# Project Guidelines

## Project Overview

This repository is a static, vanilla-JavaScript website for an interactive
Rowwen Hèze campsite map. It is published with GitHub Pages from the repository
root; there is no build step or package manager.

## Architecture

- `index.html` defines the page structure and loads `config.js` before `app.js`
  with deferred scripts.
- `config.js` contains `window.MAP_CONFIG` (map image, legend groups, colors,
  house numbers, and circle positions) and the first-visit popup settings.
- `app.js` renders the legend and SVG circle overlay, and owns the map's
  zoom, pan, pointer, and keyboard behavior. Reuse its existing state and
  clamping logic when changing map interactions.
- `styles.css` contains the responsive layout and all presentation.
- `assets/` contains the map and other images. Keep asset paths and the
  configured map image in sync.

## Data Conventions

- Each `MAP_CONFIG.legend` entry represents one group and may contain several
  `circles`.
- Circle `x`, `y`, and `diameter` are pixels in the original map image, with
  the origin at its top-left. Group-to-circle association comes from the
  containing legend entry; house numbers are legend data, not map markers.
- Preserve the current data shape when adding features. Validate optional
  circle data so a missing or invalid marker does not break legend rendering
  or map interaction.

## Code Style

- Use the existing vanilla JavaScript and CSS patterns; do not add a framework
  or dependency for functionality the browser already provides.
- Keep user-facing text in Dutch and preserve the existing visual design unless
  the task calls for a deliberate change.
- Maintain keyboard accessibility, touch support, and
  `prefers-reduced-motion` behavior for interactive features.
- Update `README.md` when a user-facing behavior or data-editing convention
  changes.

## Build and Test

- There are no configured build, lint, or automated test commands.
- For JavaScript changes, check syntax where a JavaScript runtime is available,
  and inspect `git diff --check`.
- Open `index.html` in a browser to verify the change. Test both a desktop
  viewport and a narrow mobile viewport for layout and interactions.
- For map changes, verify that markers stay aligned with the image, existing
  zoom controls and Reset still work, and the map does not expose empty space
  beyond its edges.
- For animation changes, check reduced-motion behavior as well as normal
  motion.
