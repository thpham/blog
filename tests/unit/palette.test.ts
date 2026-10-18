import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../src/lib/contrast";
import { mix, readThemePalettes, sceneColor } from "../../src/lib/palette";

const palettes = readThemePalettes(new URL("../../", import.meta.url));

describe("mix", () => {
  it("blends two hex colours in sRGB", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", 1)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

// Excalidraw's own palette (the first row of its colour pickers) is what
// an author picks from; each colour lands on a site token, per theme.
describe.each(["light", "dark"] as const)("sceneColor, %s theme", (theme) => {
  const p = palettes[theme];

  it("keeps transparency", () => {
    expect(sceneColor("transparent", "stroke", p)).toBe("transparent");
    expect(sceneColor("transparent", "fill", p)).toBe("transparent");
  });

  it("maps strokes and text: ink to --text, greys to --muted, amber to --accent, green to --ok", () => {
    expect(sceneColor("#1e1e1e", "stroke", p)).toBe(p.text);
    expect(sceneColor("#000000", "stroke", p)).toBe(p.text);
    expect(sceneColor("#868e96", "stroke", p)).toBe(p.muted);
    expect(sceneColor("#f08c00", "stroke", p)).toBe(p.accent);
    expect(sceneColor("#e8590c", "stroke", p)).toBe(p.accent);
    expect(sceneColor("#2f9e44", "stroke", p)).toBe(p.ok);
  });

  it("folds hues outside the palette (red, blue, violet) into --text", () => {
    expect(sceneColor("#e03131", "stroke", p)).toBe(p.text);
    expect(sceneColor("#1971c2", "stroke", p)).toBe(p.text);
    expect(sceneColor("#6741d9", "stroke", p)).toBe(p.text);
  });

  it("maps fills to --surface, or to a matte wash of --accent / --ok", () => {
    expect(sceneColor("#a5d8ff", "fill", p)).toBe(p.surface);
    expect(sceneColor("#ffc9c9", "fill", p)).toBe(p.surface);
    expect(sceneColor("#e9ecef", "fill", p)).toBe(p.surface);
    expect(sceneColor("#ffec99", "fill", p)).toBe(mix(p.accent, p.bg, 0.16));
    expect(sceneColor("#b2f2bb", "fill", p)).toBe(mix(p.ok, p.bg, 0.16));
  });

  it("keeps text readable (AA) on every fill it produces", () => {
    for (const fill of ["#a5d8ff", "#ffec99", "#b2f2bb"]) {
      const bg = sceneColor(fill, "fill", p);
      expect(contrastRatio(p.text, bg), `${theme} text on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
