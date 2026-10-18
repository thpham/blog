import { describe, expect, it } from "vitest";
import { mdxToJs } from "satteri";
import { excalidrawSrc } from "../../src/plugins/excalidraw-src";

const root = new URL("file:///project/");
const fileURL = new URL("file:///project/src/content/writing/demo/article.mdx");

async function compile(mdx: string): Promise<string> {
  const { code } = await mdxToJs(mdx, { mdastPlugins: [excalidrawSrc({ root })], fileURL });
  return code;
}

describe("excalidrawSrc (Sätteri mdast plugin)", () => {
  it("resolves a src relative to the article into a path from the project root", async () => {
    const code = await compile('<Excalidraw src="./site.excalidraw" alt="A diagram" />\n');
    expect(code).toContain('"/src/content/writing/demo/site.excalidraw"');
    expect(code).toContain('"A diagram"');
  });

  it("follows ../ segments", async () => {
    const code = await compile('<Excalidraw src="../shared/x.excalidraw" alt="x" />\n');
    expect(code).toContain('"/src/content/writing/shared/x.excalidraw"');
  });

  it("leaves root paths and other components alone", async () => {
    const code = await compile('<Excalidraw src="/src/a.excalidraw" alt="a" />\n\n<Figure src="./b.png" alt="b" />\n');
    expect(code).toContain('"/src/a.excalidraw"');
    expect(code).toContain('"./b.png"');
  });
});
