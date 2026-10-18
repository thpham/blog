/**
 * Walks the demo convention on disk: every collection keeps its demo
 * content under a `demo/` subfolder, so deleting those folders is enough
 * to remove all demo content.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { entryUrl, idFromPath, type Collection } from "./ids";

const COLLECTIONS: Collection[] = ["writing", "lab", "radar"];
const CONTENT_EXTENSIONS = new Set([".md", ".mdx"]);

function collectContentFiles(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectContentFiles(full, out);
    } else if (CONTENT_EXTENSIONS.has(extname(entry))) {
      out.push(full);
    }
  }
}

/**
 * Maps every file under `<contentRoot>/<collection>/demo/**` to
 * `entryUrl(collection, idFromPath(<path relative to the collection dir>))`.
 */
export function demoUrls(contentRoot: string): Set<string> {
  const urls = new Set<string>();
  for (const collection of COLLECTIONS) {
    const collectionDir = join(contentRoot, collection);
    const demoDir = join(collectionDir, "demo");
    const files: string[] = [];
    collectContentFiles(demoDir, files);
    for (const file of files) {
      const relPath = relative(collectionDir, file).split(sep).join("/");
      urls.add(entryUrl(collection, idFromPath(relPath)));
    }
  }
  return urls;
}
