# ithings — Thomas Pham's blog

> Made with [Astro](https://astro.build/), served at [blog.ithings.ch](https://blog.ithings.ch) by GitHub Pages.

[![Deploy to GitHub Pages](https://github.com/thpham/blog/actions/workflows/deploy.yml/badge.svg)](https://github.com/thpham/blog/actions/workflows/deploy.yml)

## The stack

- **Astro 7** on Node.js 24 — Markdown/MDX content collections, every entry's frontmatter validated by Zod schemas at build time
- **Generative visuals** — each entry draws its own isoline terrain from a hash of its id (`src/lib/isolines.ts`); Mermaid and Excalidraw diagrams rendered at build time, once per theme (light/dark), in a headless Chromium
- **Search** — full-text by [Pagefind](https://pagefind.app/), indexing only the entries
- **Feeds & meta** — RSS/Atom (plus Docusaurus-compat legacy URLs), sitemap, `llms.txt`, build-time OG images (satori + resvg)
- **Tests** — [Vitest](https://vitest.dev/): unit tests over the pure helpers, build tests over two production builds — with the demo content, and without it

## Commands

```sh
yarn install --immutable   # corepack enables itself via the packageManager field
yarn dev                   # dev server on :4321
yarn test                  # unit tests
yarn test:build            # builds dist + dist-nodemo, runs every build test
yarn build                 # production build into dist (demo content included)
yarn build:nodemo          # the demo-free build into dist-nodemo (what Pages deploys)
yarn check                 # astro check
```

### Requirements

Nix users: `direnv` + `use flake` (`flake.nix`) sets up Node 24, corepack/yarn 4 and
the Chromium path (`ITHINGS_CHROMIUM`, consumed by the diagram rendering). Outside
Nix, you need Node ≥ 24 and a Chromium binary exported as `ITHINGS_CHROMIUM`.

## Structure

```text
src/content/{writing,lab,radar}/   entries (markdown/mdx; demo fixtures live in demo/)
src/lib/                           content types, queries, feeds, isolines, site identity
src/components/                    header, footer, rails, radar chart, preview panel…
src/layouts/                       Base, Page, Article — the layout system
src/pages/                         home, indexes, article routes, feeds, search
tools/logo/                        the wordmark generator (uv + HarfBuzz + FontTools)
tools/excalidraw/                  the Excalidraw → SVG (light/dark) exporter
tests/{unit,build}/                Vitest over helpers and over both builds
```

## Regenerating the wordmark

```sh
cd tools/logo
uv run python wordmark.py 600 round
```

Instrument Sans (weight 600) ships beside the script under its SIL OFL 1.1 (`OFL.txt`).

## Publishing

A merge to `main` triggers `.github/workflows/deploy.yml`: the CI builds
`yarn build:nodemo` — the demo-free output — and deploys `dist-nodemo` to
GitHub Pages. Demo entries are fixtures for the tests and the visual checks;
they never ship.

**Removing a demo entry when its real content exists:** delete the file or folder
under `src/content/*/demo/` — or for the whole demo set:

```sh
rm -r src/content/*/demo
```

The build tests read back both outputs and the nodemo suite
(`tests/build/nodemo.test.ts`) asserts the demo-free site stays presentable.