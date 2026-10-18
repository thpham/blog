---
title: Isolines as a visual identity
intent: Can contour lines computed from hashed seeds carry the site's identity, without a signature colour beyond the amber accent?
lang: en
topics:
  - Generative design
  - Static sites
status: exploring
started: 2026-10-16
lastTouched: 2026-10-18
demo: true
---

Every entry here owns a terrain. An FNV-1a hash of `<collection>/<id>` seeds a
small pseudo-random generator, which places a few gaussian hills; marching
squares then traces the contour lines of that field into plain SVG paths. The
same entry always draws the same contours, and the drawing is recoloured by
`--iso` and `--accent`, so it follows the theme toggle like the rest of the
site. Today the contours appear on the home hero and above every writing
article.

Still open: how far the terrain can spread — the rings of the technology radar,
the home feed's preview panel, per-entry backgrounds — before it stops reading
as a signature and starts reading as noise.
