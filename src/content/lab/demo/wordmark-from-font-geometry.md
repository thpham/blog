---
title: The wordmark from the font's own geometry
intent: Can the site's logo be measured out of the typeface itself instead of drawn by hand?
lang: en
topics:
  - Typography
  - Generative design
status: concluded
started: 2026-10-17
lastTouched: 2026-10-18
outcome: >-
  Yes. tools/logo/wordmark.py loads Instrument Sans, instantiates it at weight
  600, shapes the word "ithings" with HarfBuzz and outlines the glyphs; the two
  signal arcs are concentric circles centred on the tittle of the first "i",
  measured in the font, and the tittle itself stays the font's own. The result
  is the logo served at the top of this site — nothing in it was drawn by hand,
  and it can be regenerated at any weight without drifting off the letter's
  real geometry.
poc:
  repo: thpham/blog
promotedTo: building-this-site
demo: true
---

The question grew out of the redesign of this site: the wordmark had always been
a hand-tuned SVG, and every change of weight or tracking meant redrawing it.

The notebook version is a Python script: it instances the variable font at a
chosen weight, asks HarfBuzz for the shaped positions, walks the outlines with
FontTools, and marks where the stem of the first "i" actually runs. The two
signal arcs of the logo are circles concentric with that mark's tittle, with
their half-opening (48°) measured from vertical.

It concluded the day the script produced the logo now inlined in this site's
header. The full place it took in the pipeline is written up in the article it
was promoted to.