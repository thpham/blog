/**
 * Registers the build-time diagram plugins on Astro's Markdown processor
 * (Sätteri, the default), for .md and .mdx alike:
 *
 * - mermaidThemed: ```mermaid blocks become light and dark SVGs;
 * - excalidrawSrc: `<Excalidraw src="./x.excalidraw">` in MDX gets its
 *   path resolved against the article, for src/components/Excalidraw.astro.
 *
 * The Mermaid plugin is put first among the hast plugins, so it sees the
 * code block before Expressive Code highlights it, whatever the order of
 * the integrations. In the dev server (`command === "dev"`), an unavailable
 * browser degrades a diagram to its source as text; the production build
 * must fail loud instead (tools/excalidraw/export.mjs, mermaid-themed.ts).
 */
import type { AstroIntegration } from "astro";
import { readThemePalettes } from "../lib/palette";
import { excalidrawSrc } from "./excalidraw-src";
import { mermaidThemed } from "./mermaid-themed";

interface SatteriLike {
  name: string;
  options: { mdastPlugins: unknown[]; hastPlugins: unknown[] };
}

export function diagrams(): AstroIntegration {
  return {
    name: "ithings:diagrams",
    hooks: {
      "astro:config:setup": ({ command, config }) => {
        const processor = config.markdown.processor as unknown as SatteriLike | undefined;
        if (processor?.name !== "satteri") {
          throw new Error("ithings:diagrams expects the Sätteri Markdown processor (Astro's default).");
        }
        processor.options.hastPlugins.unshift(
          mermaidThemed({ palettes: readThemePalettes(config.root), dev: command === "dev" }),
        );
        processor.options.mdastPlugins.push(excalidrawSrc({ root: config.root }));
      },
    },
  };
}
