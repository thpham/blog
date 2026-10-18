/**
 * Sharing images for the entries (spec §9): a 1200×630 card drawn at build
 * time with Satori (a layout tree → SVG) and resvg (SVG → PNG). The relief
 * is the entry's own terrain, the title typeset in Newsreader, and the
 * wordmark in Instrument Sans — the exact faces the site serves.
 *
 * Satori reads ttf/otf/woff but not .woff2, so the fonts come from the
 * @fontsource packages' .woff files. The palette is the dark one from
 * src/styles/tokens.css, read from the stylesheet that ships.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { themePalettes } from "./palette";
import { SITE } from "./site";
import { terrainFor } from "./isolines";

const WIDTH = 1200;
const HEIGHT = 630;

// Paths resolve from the process working directory, not `import.meta.url`:
// inside the prerender bundle the module's url lives in dist/.prerender/,
// where neither src/ nor node_modules/ is reachable. Every `astro` command
// and the test runner run from the project root.
const ROOT = resolve(process.cwd());
const palettes = themePalettes(readFileSync(join(ROOT, "src/styles/tokens.css"), "utf-8"));
const dark = palettes.dark;

interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 600;
  style: "normal";
}

function font(pkg: string, file: string, weight: 400 | 600): SatoriFont {
  return {
    name: pkg,
    data: readFileSync(join(ROOT, `node_modules/@fontsource/${pkg}/files/${file}`)),
    weight,
    style: "normal",
  };
}

// Titles are Newsreader, chrome and wordmark Instrument Sans — the site's
// own two text faces, loaded at fixed weights because Satori needs static
// cuts (the served fonts are variable instances).
const FONTS: SatoriFont[] = [
  font("newsreader", "newsreader-latin-400-normal.woff", 400),
  font("instrument-sans", "instrument-sans-latin-400-normal.woff", 400),
  font("instrument-sans", "instrument-sans-latin-600-normal.woff", 600),
];

/** The entry's terrain as a standalone SVG data URI (contours only). */
function terrainSvg(seedKey: string, opacity = 0.5): string {
  const { contours } = terrainFor(seedKey, WIDTH, HEIGHT);
  const paths = contours
    .filter((c) => c.d)
    .map(
      (c) =>
        `<path d="${c.d}" fill="none" stroke="${dark.iso}" stroke-width="${
          c.major ? 1.4 : 0.7
        }" opacity="${c.major ? 1 : opacity}" stroke-linecap="round"/>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">${paths}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** The wordmark's two signal arcs, concentric with an accent dot. */
function signalSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44">
    <circle cx="10" cy="34" r="4" fill="${dark.accent}"/>
    <path d="M 10 18 A 16 16 0 0 1 26 34" fill="none" stroke="${dark.accent}" stroke-width="2.5"/>
    <path d="M 10 8 A 26 26 0 0 1 36 34" fill="none" stroke="${dark.accent}" stroke-width="2.5" opacity="0.55"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface OgImageInput {
  title: string;
  lang: "en" | "fr";
  seedKey: string;
}

type Style = Record<string, string | number>;
type Node = { type: string; props: { style?: Style; children?: string | Node | Node[]; [key: string]: unknown } };

function el(type: string, style: Style, children?: string | Node[]): Node {
  return { type, props: { style, ...(children === undefined ? {} : { children }) } };
}

function img(src: string, style: Style, extra: Record<string, unknown> = {}): Node {
  return { type: "img", props: { src, style, ...extra } };
}

/**
 * Renders the sharing card for one entry: dark `--bg` ground, the entry's
 * terrain behind, the wordmark with its signal arcs at the top, and the
 * title in Newsreader at the bottom. Deterministic: the same entry always
 * renders the same card.
 */
export async function renderOgImage({ title, lang, seedKey }: OgImageInput): Promise<Uint8Array> {
  // Title sizes step down as length grows, in line with the display scale.
  const titleSize = title.length > 72 ? 52 : title.length > 48 ? 64 : 76;

  const card = el("div", {
    display: "flex",
    position: "relative",
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
    backgroundColor: dark.bg,
    color: dark.text,
  });

  // Satori lays out on the content box (padding adds on top of width/height),
  // so the canvas div carries no padding: the padded sheet inside it is
  // sized to the canvas minus that padding.
  const sheet = el("div", {
    display: "flex",
    flexDirection: "column",
    width: `${WIDTH - 128}px`,
    height: `${HEIGHT - 112}px`,
    padding: "56px 64px",
    position: "relative",
  });

  const topBar = el(
    "div",
    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" },
    [
      el("div", { display: "flex", alignItems: "center" }, [
        img(signalSvg(), { display: "block", width: "44px", height: "44px" }, { width: 44, height: 44 }),
        el("span", {
          fontFamily: "instrument-sans",
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: "-0.01em",
          marginLeft: 14,
        }, SITE.name),
      ]),
      el("span", {
        fontFamily: "instrument-sans",
        fontWeight: 400,
        fontSize: 22,
        color: dark.muted,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }, SITE.author),
    ],
  );

  const spacer = el("div", { flex: "1" });

  const ground = el(
    "div",
    { display: "flex", flexDirection: "column", position: "relative" },
    [
      el("span", {
        fontFamily: "instrument-sans",
        fontWeight: 400,
        fontSize: 20,
        color: dark.muted,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        marginBottom: 18,
      }, `BLOG.ITHINGS.CH · ${lang.toUpperCase()}`),
      el("span", {
        fontFamily: "newsreader",
        fontWeight: 400,
        fontSize: titleSize,
        lineHeight: 1.12,
        color: dark.text,
        maxWidth: "940px",
      }, title),
    ],
  );

  const tree = { ...card, props: { ...card.props, children: [
    img(terrainSvg(seedKey), { position: "absolute", top: "0", left: "0", width: `${WIDTH}px`, height: `${HEIGHT}px` }, { width: WIDTH, height: HEIGHT }),
    { ...sheet, props: sheet.props ? { ...sheet.props, children: [topBar, spacer, ground] } : sheet.props },
  ] } };

  const svg = await satori(tree, { width: WIDTH, height: HEIGHT, fonts: FONTS });
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
    font: { loadSystemFonts: false },
  }).render().asPng();
  return new Uint8Array(png);
}
