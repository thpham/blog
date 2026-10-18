import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { demoUrls } from "../../src/lib/demo";
import { entryUrl } from "../../src/lib/ids";

const contentRoot = fileURLToPath(new URL("../../src/content/", import.meta.url));
const COLLECTIONS = ["writing", "lab", "radar"] as const;
const CONTENT_EXTENSIONS = new Set([".md", ".mdx"]);

function listFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      listFiles(full, out);
    } else if (CONTENT_EXTENSIONS.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

/** Reads only the `demo:` key out of a file's YAML frontmatter block. */
function demoFlag(filePath: string): boolean | undefined {
  const raw = readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return undefined;
  const line = match[1].split(/\r?\n/).find((l) => /^demo\s*:/.test(l));
  if (!line) return undefined;
  return /^demo\s*:\s*true\s*$/.test(line.trim());
}

describe("demo convention", () => {
  it("marks every file under <collection>/demo/ with demo: true, and no file outside demo/ with it", () => {
    for (const collection of COLLECTIONS) {
      const collectionDir = join(contentRoot, collection);
      for (const file of listFiles(collectionDir)) {
        const relPath = relative(collectionDir, file).split(sep).join("/");
        const inDemoDir = relPath.startsWith("demo/");
        const flag = demoFlag(file);
        if (inDemoDir) {
          expect(flag, `${collection}/${relPath} should have demo: true`).toBe(true);
        } else {
          expect(flag, `${collection}/${relPath} should not have demo: true`).not.toBe(true);
        }
      }
    }
  });

  it("demoUrls maps files under <collection>/demo/ to their entry urls", () => {
    const urls = demoUrls(contentRoot);
    expect(urls.has(entryUrl("writing", "welcome"))).toBe(true);
  });
});
