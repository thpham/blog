import { describe, expect, it, vi } from "vitest";
import { markdownToHtml } from "satteri";
import { readThemePalettes } from "../../src/lib/palette";
import { mermaidThemed } from "../../src/plugins/mermaid-themed";

// Simulate the browser launch failing (a NixOS machine without
// ITHINGS_CHROMIUM) without needing a browser at all: each test decides what
// the mocked render call does. createMermaidRenderer is the only value import
// the plugin uses, so the mock factory provides it and nothing else.
const renderCall = vi.hoisted(() => vi.fn());

vi.mock("mermaid-isomorphic", () => ({
  createMermaidRenderer: () => renderCall,
}));

const palettes = readThemePalettes(new URL("../../", import.meta.url));

/** A render call rejected like a Playwright browser-launch failure. */
const LAUNCH_ERROR = new Error(
  "browserType.launch: Failed to launch chromium because\nlibglib-2.0.so.0: cannot open shared object file",
);
/** A render call that came back, with one diagram rejected like a Mermaid syntax error. */
const SYNTAX_RESULT = [{ status: "rejected", reason: new Error("Parse error on line 1") }];

const diagram = (source: string) => `\`\`\`mermaid\n${source}\n\`\`\`\n`;

describe("mermaidThemed without a browser", () => {
  it("degrades in dev: the source as text in the diagram container, no svg, with a notice", async () => {
    renderCall.mockRejectedValue(LAUNCH_ERROR);
    const { html } = await markdownToHtml(diagram("graph LR; A-->B"), {
      hastPlugins: [mermaidThemed({ palettes, dev: true })],
    });

    expect(html).toMatch(/^<div class="diagram mermaid diagram-fallback"><pre/);
    expect(html).not.toContain("<svg");
    expect(html).toContain("graph LR; A--&gt;B");
    expect(html).toContain("ITHINGS_CHROMIUM");
    expect(html).toMatch(/production build/);
  });

  it("hard-fails in production, as before", async () => {
    renderCall.mockRejectedValue(LAUNCH_ERROR);
    await expect(
      markdownToHtml(diagram("flowchart TD; X-->Y"), {
        hastPlugins: [mermaidThemed({ palettes, dev: false })],
      }),
    ).rejects.toThrow(/browserType\.launch/);
  });

  it("still throws in dev for a real render failure (a content bug): only launching degrades", async () => {
    renderCall.mockResolvedValue(SYNTAX_RESULT);
    await expect(
      markdownToHtml(diagram("graph TD; C-->D"), {
        hastPlugins: [mermaidThemed({ palettes, dev: true })],
      }),
    ).rejects.toThrow(/Parse error on line 1/);
  });
});