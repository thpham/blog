import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { markdownToHtml, mdxToJs } from "satteri";
import { readThemePalettes } from "../../src/lib/palette";
import { mermaidConfig, mermaidThemed } from "../../src/plugins/mermaid-themed";

// Mermaid renders in a headless Chromium (Playwright), so these tests are
// slow by unit-test standards: one browser launch per render call.
const SLOW = 60_000;

const root = new URL("../../", import.meta.url);
const palettes = readThemePalettes(root);
const tokens = readFileSync(fileURLToPath(new URL("src/styles/tokens.css", root)), "utf-8");

const DIAGRAM = "```mermaid\ngraph LR; A-->B\n```\n";

/** Every id="…" in an HTML string. */
function ids(html: string): string[] {
  return [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
}

/** The inner HTML of the first <div class="only-…"> up to its </svg>. */
function variant(html: string, theme: "light" | "dark"): string {
  const m = new RegExp(`<div class="only-${theme}">(<svg[\\s\\S]*?</svg>)</div>`).exec(html);
  expect(m, `.only-${theme} wrapper`).not.toBeNull();
  return m![1];
}

describe("theme palettes read from tokens.css", () => {
  it("takes the light palette from :root and the dark one from [data-theme=dark]", () => {
    expect(palettes.light.bg).toBe("#f4f1ea");
    expect(palettes.light.surface).toBe("#ebe7de");
    expect(palettes.light.text).toBe("#16181a");
    expect(palettes.dark.bg).toBe("#0f1214");
    expect(palettes.dark.surface).toBe("#161b1e");
    expect(palettes.dark.text).toBe("#ece9e2");
    // The AA-adjusted light values, whatever the file says today.
    expect(tokens).toContain(`--accent: ${palettes.light.accent};`);
    expect(tokens).toContain(`--muted: ${palettes.light.muted};`);
  });
});

describe("mermaidConfig", () => {
  it.each(["light", "dark"] as const)("builds the %s theme from the design tokens", (theme) => {
    const p = palettes[theme];
    const config = mermaidConfig(theme, palettes);
    expect(config.theme).toBe("base");
    expect(config.darkMode).toBe(theme === "dark");
    expect(config.themeVariables).toMatchObject({
      background: p.bg,
      primaryColor: p.surface,
      primaryTextColor: p.text,
      lineColor: p.muted,
      noteBorderColor: p.accent,
    });
  });
});

describe("mermaidThemed (Sätteri hast plugin)", () => {
  const plugin = mermaidThemed({ palettes });

  it(
    "replaces a mermaid block by two SVG renders, under .only-light and .only-dark",
    async () => {
      const { html } = await markdownToHtml(DIAGRAM, { hastPlugins: [plugin] });

      expect(html).toMatch(/^<div class="diagram mermaid"><div class="only-light"><svg/);
      expect(html.match(/<svg/g)).toHaveLength(2);
      expect(html).not.toContain("<pre");

      const light = variant(html, "light");
      const dark = variant(html, "dark");
      expect(light).toContain(palettes.light.text);
      expect(dark).toContain(palettes.dark.text);
      expect(dark).toContain(palettes.dark.bg);
      // No Mermaid default palette left over (its lavender and purple).
      expect(html.toLowerCase()).not.toMatch(/#ececff|#9370db/);
      // Text uses the page's sans face, resolved by the page.
      expect(light).toContain("var(--font-sans)");
    },
    SLOW,
  );

  it(
    "gives the two renders distinct ids, so the inline SVGs never clash",
    async () => {
      const { html } = await markdownToHtml(DIAGRAM + "\ntext\n\n" + DIAGRAM, { hastPlugins: [plugin] });
      expect(html.match(/<svg/g)).toHaveLength(4);
      const all = ids(html);
      expect(all.length).toBeGreaterThan(4);
      expect(new Set(all).size).toBe(all.length);
    },
    SLOW,
  );

  it("leaves other code blocks to Expressive Code", async () => {
    const { html } = await markdownToHtml("```js\nconst a = 1;\n```\n", { hastPlugins: [plugin] });
    expect(html).toContain("<pre");
    expect(html).not.toContain("diagram mermaid");
  });

  it(
    "works in MDX too, as raw HTML that MDX does not re-parse",
    async () => {
      const { code } = await mdxToJs(DIAGRAM, {
        hastPlugins: [plugin],
        jsxImportSource: "astro",
        elementAttributeNameCase: "html",
      });
      const m = /"set:html":\s*("(?:[^"\\]|\\.)*")/.exec(code);
      expect(m, "Fragment set:html").not.toBeNull();
      const html = JSON.parse(m![1]) as string;
      expect(html).toMatch(/^<div class="diagram mermaid">/);
      expect(html.match(/<svg/g)).toHaveLength(2);
    },
    SLOW,
  );
});
