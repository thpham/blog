/**
 * The design tokens (src/styles/tokens.css) as data, for the diagrams drawn
 * at build time: Mermaid and Excalidraw render outside the page, so they
 * cannot read CSS custom properties and need the hex values. Reading them
 * from the stylesheet that ships means a token change reaches the diagrams
 * on the next build, with no copy to keep in sync.
 *
 * Dependency-free on purpose: tools/excalidraw/export.mjs imports this file
 * straight from Node (type stripping), outside Vite.
 */
import { readFileSync } from "node:fs";

export const TOKEN_NAMES = ["bg", "surface", "text", "muted", "line", "accent", "iso", "ok"] as const;
export type TokenName = (typeof TOKEN_NAMES)[number];
export type Palette = Record<TokenName, string>;
export type Theme = "light" | "dark";
export type ThemePalettes = Record<Theme, Palette>;

/** Body of the first `{ … }` block that directly follows `selector`. */
function block(css: string, selector: RegExp): string {
  const m = new RegExp(selector.source + String.raw`\s*\{([^}]*)\}`).exec(css);
  if (!m) throw new Error(`tokens.css: no block for ${selector}`);
  return m[1];
}

function palette(body: string): Palette {
  const out = {} as Palette;
  for (const name of TOKEN_NAMES) {
    const m = new RegExp(String.raw`--${name}\s*:\s*(#[0-9a-fA-F]{6})\s*;`).exec(body);
    if (!m) throw new Error(`tokens.css: --${name} missing`);
    out[name] = m[1].toLowerCase();
  }
  return out;
}

/** Light palette from bare `:root`, dark from `:root[data-theme="dark"]`. */
export function themePalettes(css: string): ThemePalettes {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return {
    light: palette(block(clean, /(?:^|\n)\s*:root/)),
    dark: palette(block(clean, /:root\[data-theme="dark"\]/)),
  };
}

/** Reads src/styles/tokens.css under the project `root`. */
export function readThemePalettes(root: URL): ThemePalettes {
  return themePalettes(readFileSync(new URL("src/styles/tokens.css", root), "utf-8"));
}

// ---------- colour arithmetic ----------

type Rgb = [number, number, number];

function parseHex(color: string): Rgb | undefined {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return undefined;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** `a` over `b` at `amount` (0 gives `b`, 1 gives `a`), in sRGB. */
export function mix(a: string, b: string, amount: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) throw new Error(`mix: not hex colours: ${a}, ${b}`);
  return toHex(x.map((c, i) => c * amount + y[i] * (1 - amount)) as Rgb);
}

/** Hue in degrees, saturation and lightness in 0..1. */
function hsl([r, g, b]: Rgb): { h: number; s: number; l: number } {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

// ---------- Excalidraw scenes ----------

/** Strength of the accent and ok washes used as fills. */
const WASH = 0.16;

/**
 * The site colour for a colour picked in Excalidraw. Authors draw with
 * Excalidraw's own palette; the export recolours each element per theme so
 * the drawing sits on the site palette in both themes, instead of
 * Excalidraw's dark mode (a CSS invert filter, which lands off-palette).
 *
 * By hue: amber and orange become the accent, green the ok colour; other
 * hues have no token and fold into ink (strokes) or paper (fills). By
 * lightness for greys: ink, muted, or a hairline.
 */
export function sceneColor(color: string, role: "stroke" | "fill", p: Palette): string {
  if (!color || color === "transparent") return color;
  const rgb = parseHex(color);
  if (!rgb) return role === "stroke" ? p.text : p.surface;
  const { h, s, l } = hsl(rgb);
  const vivid = s >= 0.35 && l > 0.12 && l < 0.97;
  const amber = vivid && h >= 18 && h <= 65;
  const green = vivid && h >= 90 && h <= 170;

  if (role === "stroke") {
    if (amber) return p.accent;
    if (green) return p.ok;
    if (s < 0.35 && l >= 0.45 && l < 0.85) return p.muted;
    if (s < 0.35 && l >= 0.85) return p.line;
    return p.text;
  }
  if (amber) return mix(p.accent, p.bg, WASH);
  if (green) return mix(p.ok, p.bg, WASH);
  if (s < 0.35 && l < 0.3) return p.text;
  return p.surface;
}
