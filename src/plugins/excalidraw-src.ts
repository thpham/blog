/**
 * Lets an article name its Excalidraw drawing by a path relative to itself,
 * `<Excalidraw src="./site-architecture.excalidraw" … />`, as with images.
 *
 * A component does not know which file renders it, so this Sätteri mdast
 * plugin rewrites a relative `src` of every <Excalidraw> element into a
 * path from the project root ("/src/content/…/x.excalidraw"), which
 * src/components/Excalidraw.astro looks up among the exported SVGs.
 */
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { MdastPluginEntry } from "satteri";

interface JsxAttribute {
  type: string;
  name?: string;
  value?: unknown;
}

export function excalidrawSrc({ root }: { root: URL }): MdastPluginEntry {
  const rootPath = fileURLToPath(root);
  return {
    name: "excalidraw-src",
    mdxJsxFlowElement(node, ctx) {
      if (node.name !== "Excalidraw" || !ctx.fileURL) return;
      const attributes = node.attributes as JsxAttribute[];
      const src = attributes.find((a) => a.type === "mdxJsxAttribute" && a.name === "src");
      if (!src || typeof src.value !== "string" || !/^\.\.?\//.test(src.value)) return;
      const file = fileURLToPath(new URL(src.value, ctx.fileURL));
      const fromRoot = `/${relative(rootPath, file).split(/[\\/]/).join("/")}`;
      ctx.replaceNode(node, {
        ...node,
        attributes: attributes.map((a) => (a === src ? { ...a, value: fromRoot } : a)) as typeof node.attributes,
      });
    },
  };
}
