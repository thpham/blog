import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contrastRatio } from "../../src/lib/contrast";
import ecConfig, { codePalettes } from "../../ec.config.mjs";

const css = readFileSync(fileURLToPath(new URL("../../src/styles/tokens.css", import.meta.url)), "utf-8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

function token(selector: RegExp, name: string): string {
  const body = new RegExp(selector.source + String.raw`\s*\{([^}]*)\}`).exec(css)![1];
  return new RegExp(String.raw`--${name}\s*:\s*(#[0-9a-fA-F]{6})`).exec(body)![1].toLowerCase();
}

const site = {
  light: (n: string) => token(/(?:^|\n)\s*:root/, n),
  dark: (n: string) => token(/:root\[data-theme="dark"\]/, n),
};

describe.each(["light", "dark"] as const)("%s code palette", (type) => {
  const p = codePalettes[type];

  it("sits on --surface and writes in --text", () => {
    expect(p.bg).toBe(site[type]("surface"));
    expect(p.fg).toBe(site[type]("text"));
  });

  it("uses the site accent and ok tokens for marks and insertions", () => {
    expect(p.accent).toBe(site[type]("accent"));
    expect(p.ok).toBe(site[type]("ok"));
  });

  it("keeps every syntax colour at WCAG AA on the code background", () => {
    for (const [role, colour] of Object.entries(p.syntax)) {
      expect(contrastRatio(colour, p.bg), `${type} ${role} ${colour}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("Expressive Code config", () => {
  it("defines one light and one dark theme, light first", () => {
    const themes = ecConfig.themes as Array<{ name: string; type: string }>;
    expect(themes.map((t) => [t.name, t.type])).toEqual([
      ["light", "light"],
      ["dark", "dark"],
    ]);
  });

  it("selects themes with the site's html[data-theme]", () => {
    const select = ecConfig.themeCssSelector as (t: { name: string; type: string }) => string;
    expect(select({ name: "dark", type: "dark" })).toBe('[data-theme="dark"]');
    expect(select({ name: "light", type: "light" })).toBe('[data-theme="light"]');
    expect(ecConfig.useDarkModeMediaQuery).toBe(true);
  });
});
