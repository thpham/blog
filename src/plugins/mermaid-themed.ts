/**
 * Mermaid at build time, following the theme toggle (spec §7.2, §7.9).
 *
 * Each ```mermaid block is rendered twice in a headless Chromium
 * (mermaid-isomorphic, on Playwright), with Mermaid's `base` theme fed from
 * the design tokens: once light, once dark. Both SVGs are inlined:
 *
 *   <div class="diagram mermaid">
 *     <div class="only-light"><svg …/></div>
 *     <div class="only-dark"><svg …/></div>
 *   </div>
 *
 * and global.css shows the one matching html[data-theme] (or the system
 * preference without JavaScript). No Mermaid script reaches the browser.
 *
 * It is a Sätteri hast plugin that must run before Expressive Code, which
 * would otherwise turn the block into highlighted code: see
 * src/plugins/diagrams.ts. In Markdown the result is spliced in as raw HTML;
 * in MDX, as `<Fragment set:html>`, so MDX never re-parses the SVG as
 * Markdown or JSX.
 *
 * Text is measured at render time with Instrument Sans (the same face the
 * page uses, from tools/logo/), then the SVG is pointed at the page's own
 * font stack, var(--font-sans).
 *
 * Chromium: Playwright's own, or the binary named by ITHINGS_CHROMIUM (for
 * hosts where Playwright's build cannot run, such as NixOS; CI uses
 * Playwright's own browser).
 */
import { createHash } from "node:crypto";
import type { MermaidConfig } from "mermaid";
import { createMermaidRenderer, type MermaidRenderer } from "mermaid-isomorphic";
import type { HastPluginEntry } from "satteri";
import type { Palette, Theme, ThemePalettes } from "../lib/palette";

const THEMES: Theme[] = ["light", "dark"];

/** Family used while measuring; swapped for the page's stack afterwards. */
const MEASURE_FAMILY = "ithings-diagram-sans";
const FONT_CSS = new URL("./mermaid-fonts.css", import.meta.url);

/** Mermaid `base` theme variables for one palette. */
function themeVariables(p: Palette, dark: boolean) {
  return {
    darkMode: dark,
    fontFamily: MEASURE_FAMILY,
    fontSize: "15px",
    background: p.bg,
    textColor: p.text,
    titleColor: p.text,
    lineColor: p.muted,
    // Flowchart, state and class nodes.
    primaryColor: p.surface,
    primaryTextColor: p.text,
    primaryBorderColor: p.muted,
    secondaryColor: p.surface,
    secondaryTextColor: p.text,
    secondaryBorderColor: p.muted,
    tertiaryColor: p.bg,
    tertiaryTextColor: p.text,
    tertiaryBorderColor: p.iso,
    mainBkg: p.surface,
    nodeBorder: p.muted,
    nodeTextColor: p.text,
    clusterBkg: p.bg,
    clusterBorder: p.iso,
    edgeLabelBackground: p.bg,
    // Notes and sequence diagrams.
    noteBkgColor: p.surface,
    noteTextColor: p.text,
    noteBorderColor: p.accent,
    actorBkg: p.surface,
    actorBorder: p.muted,
    actorTextColor: p.text,
    actorLineColor: p.muted,
    signalColor: p.text,
    signalTextColor: p.text,
    labelBoxBkgColor: p.surface,
    labelBoxBorderColor: p.muted,
    labelTextColor: p.text,
    loopTextColor: p.text,
    activationBkgColor: p.surface,
    activationBorderColor: p.accent,
    sequenceNumberColor: p.bg,
  };
}

/**
 * A node given the `accent` class (`A:::accent`, or `class A accent`) is
 * drawn with an amber outline, in both themes.
 */
function themeCSS(p: Palette): string {
  return [
    `.node.accent rect, .node.accent circle, .node.accent ellipse, .node.accent polygon, .node.accent path { stroke: ${p.accent}; stroke-width: 1.5px; }`,
    `.edgeLabel, .edgeLabel p { color: ${p.muted}; }`,
  ].join("\n");
}

export function mermaidConfig(theme: Theme, palettes: ThemePalettes): MermaidConfig {
  const p = palettes[theme];
  return {
    theme: "base",
    darkMode: theme === "dark",
    fontFamily: MEASURE_FAMILY,
    themeVariables: themeVariables(p, theme === "dark"),
    themeCSS: themeCSS(p),
    flowchart: { padding: 12, nodeSpacing: 36, rankSpacing: 44 },
  };
}

let renderer: MermaidRenderer | undefined;

function getRenderer(): MermaidRenderer {
  // ITHINGS_CHROMIUM overrides the browser path (NixOS dev machines; CI uses
  // Playwright's own browser). Unset, this is the default launch.
  const executablePath = process.env.ITHINGS_CHROMIUM || undefined;
  renderer ??= createMermaidRenderer({ launchOptions: { executablePath } });
  return renderer;
}

function digest(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 8);
}

/** Renders one diagram in one theme. `id` must be unique on the page. */
async function renderOne(source: string, id: string, theme: Theme, palettes: ThemePalettes): Promise<string> {
  const [result] = await getRenderer()([source], {
    prefix: id,
    css: FONT_CSS,
    mermaidConfig: mermaidConfig(theme, palettes),
  });
  if (result.status === "rejected") {
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
    throw new Error(`Mermaid could not render this diagram (${theme}): ${reason}\n${source}`);
  }
  // Point the text at the page's font stack, which resolves to the same face.
  return result.value.svg.replace(new RegExp(`"?${MEASURE_FAMILY}"?`, "g"), "var(--font-sans)");
}

/** Both renders of a diagram, keyed by source: the dev server re-renders unchanged diagrams for free. */
const cache = new Map<string, Promise<string>>();

/**
 * The themed HTML for one diagram. `key` tells apart diagrams on the same
 * page; the ids inside each SVG derive from it and from the theme.
 */
export function renderThemedMermaid(source: string, key: string, palettes: ThemePalettes): Promise<string> {
  const id = `mermaid-${digest(source)}-${key}`;
  const cacheKey = `${id}\n${JSON.stringify(palettes)}\n${source}`;
  let html = cache.get(cacheKey);
  if (!html) {
    html = Promise.all(THEMES.map((t) => renderOne(source, `${id}-${t}`, t, palettes))).then(
      ([light, dark]) =>
        `<div class="diagram mermaid"><div class="only-light">${light}</div><div class="only-dark">${dark}</div></div>`,
    );
    html.catch(() => cache.delete(cacheKey));
    cache.set(cacheKey, html);
  }
  return html;
}

interface HastElementLike {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastElementLike[];
}

function mermaidCode(pre: HastElementLike): HastElementLike | undefined {
  const code = pre.children?.find((c) => c.type === "element" && c.tagName === "code");
  const classes = code?.properties?.className;
  return Array.isArray(classes) && classes.includes("language-mermaid") ? code : undefined;
}

export interface MermaidThemedOptions {
  palettes: ThemePalettes;
}

/** The Sätteri hast plugin. A factory: one counter per document. */
export function mermaidThemed({ palettes }: MermaidThemedOptions): HastPluginEntry {
  return () => {
    let count = 0;
    return {
      name: "mermaid-themed",
      element: {
        filter: ["pre"],
        async visit(node, ctx) {
          const code = mermaidCode(node as HastElementLike);
          if (!code) return;
          const source = ctx.textContent(code as never).replace(/\n$/, "");
          const html = await renderThemedMermaid(source, String(count++), palettes);
          ctx.replaceNode(
            node,
            ctx.sourceFormat === "mdx"
              ? ({
                  type: "mdxJsxFlowElement",
                  name: "Fragment",
                  attributes: [{ type: "mdxJsxAttribute", name: "set:html", value: html }],
                  children: [],
                } as never)
              : { type: "raw", value: html },
          );
        },
      },
    };
  };
}
