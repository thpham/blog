import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contrastRatio } from "../../src/lib/contrast";

// The tokens are read from the real stylesheet, so this test guards the
// file that ships rather than a copy of its values.
const tokensPath = fileURLToPath(new URL("../../src/styles/tokens.css", import.meta.url));
const css = readFileSync(tokensPath, "utf-8").replace(/\/\*[\s\S]*?\*\//g, "");

const TOKENS = ["bg", "surface", "text", "muted", "line", "accent", "iso", "ok"] as const;
type Palette = Record<(typeof TOKENS)[number], string>;

/** Body of the first `{ … }` block that directly follows `selector`. */
function block(source: string, selector: RegExp): string {
  const m = new RegExp(selector.source + String.raw`\s*\{([^}]*)\}`).exec(source);
  if (!m) throw new Error(`no block for ${selector}`);
  return m[1];
}

function palette(body: string): Palette {
  const out = {} as Palette;
  for (const name of TOKENS) {
    const m = new RegExp(String.raw`--${name}\s*:\s*(#[0-9a-fA-F]{3,6})\s*;`).exec(body);
    if (!m) throw new Error(`--${name} missing`);
    out[name] = m[1].toLowerCase();
  }
  return out;
}

const mediaDark = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?\})\s*\}/.exec(css);

const themes: Record<string, Palette> = {
  light: palette(block(css, /(?:^|\n)\s*:root/)),
  dark: palette(block(css, /:root\[data-theme="dark"\]/)),
};

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // Symmetric, and accepts 3-digit hex.
    expect(contrastRatio("#fff", "#777")).toBeCloseTo(contrastRatio("#777777", "#ffffff"), 10);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("rejects malformed colours", () => {
    expect(() => contrastRatio("tomato", "#fff")).toThrow();
  });
});

describe("design tokens (src/styles/tokens.css)", () => {
  it("defines the no-JS dark fallback with exactly the dark palette", () => {
    expect(mediaDark).not.toBeNull();
    const fallback = palette(block(mediaDark![1], /:root:not\(\[data-theme\]\)/));
    expect(fallback).toEqual(themes.dark);
  });

  for (const [name, p] of Object.entries(themes)) {
    describe(`${name} theme`, () => {
      it("text on bg and surface ≥ 4.5:1", () => {
        expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(4.5);
      });
      it("muted on bg and surface ≥ 4.5:1", () => {
        expect(contrastRatio(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
      });
      it("accent on bg and surface ≥ 4.5:1", () => {
        expect(contrastRatio(p.accent, p.bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(p.accent, p.surface)).toBeGreaterThanOrEqual(4.5);
      });
      it("ok status mark on bg and surface ≥ 3:1 (non-text)", () => {
        expect(contrastRatio(p.ok, p.bg)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(p.ok, p.surface)).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it("keeps the dark palette of §7.1 unchanged", () => {
    expect(themes.dark).toEqual({
      bg: "#0f1214",
      surface: "#161b1e",
      text: "#ece9e2",
      muted: "#8d9699",
      line: "#262c2f",
      accent: "#f2b544",
      iso: "#6f7c81",
      ok: "#7fc98a",
    });
  });
});
