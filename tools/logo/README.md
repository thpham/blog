# ithings wordmark

`wordmark.py` builds the logo as outlined SVG from the geometry of
Instrument Sans (`InstrumentSans.ttf`, SIL Open Font License 1.1). Nothing is
drawn by hand.

## Construction

- The word `ithings` is shaped with HarfBuzz (kerning on) from the variable
  font instanced at weight 600, with a tracking of -0.025 em, then outlined.
- The first letter is set as a dotless `ı`. Its stem is measured in the font:
  at weight 600 the stem axis is at x = 130.0/1000 em. The tittle and the
  signal are centred exactly on that axis.
- Both tittles (on the first `i` and in `things`) are redrawn as discs. A disc
  looks smaller than a square of the same width, so each disc is enlarged by
  8% over the font's square tittle (optical compensation).
- The first tittle is in the accent colour and emits two concentric arcs,
  open ±48° from vertical, at opacities 0.9 and 0.5. The second tittle stays
  in the text colour.
- Letters use `currentColor`; the tittle (`.tt`) and arcs (`.arc`, `.a1`,
  `.a2`) are coloured by the page with `var(--accent)`, so the logo follows
  the light and dark themes.
- `mark-round.svg` is the same `ı` with a heavier signal (thicker arcs), in a
  square box, so it survives at 16 px.

## Regenerate

```sh
cd tools/logo
uv run --with fonttools --with uharfbuzz python wordmark.py 600 round
```

This writes `wordmark-round.svg`, `mark-round.svg` and an instanced
`inst.ttf` (all git-ignored here). Copy the results into the site:

- `wordmark-round.svg` -> `src/assets/logo/wordmark.svg` (inlined by
  `src/components/Wordmark.astro`)
- `mark-round.svg` -> `src/assets/logo/mark.svg`
- `mark-round.svg` -> `public/favicon.svg`, then make it standalone: a
  favicon cannot read the page's CSS variables, so add
  `xmlns="http://www.w3.org/2000/svg"`, replace `fill="currentColor"` with
  `class="l"`, and add a `<style>` with explicit colours: letters `#16181a`,
  accent `#975800`, and under `@media (prefers-color-scheme: dark)` letters
  `#ece9e2`, accent `#f2b544`. These are the `--text` and `--accent` tokens
  of `src/styles/tokens.css`.
