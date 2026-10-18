import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../../dist", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const relative = (file: string) => file.slice(dist.length + 1);

describe("page-weight budget (plan task 12)", () => {
  it("keeps the JavaScript the index page loads under 15 KiB uncompressed", () => {
    const html = readFileSync(join(dist, "index.html"), "utf-8");
    const scriptTags = [...html.matchAll(/<script([^>]*)>(.*?)<\/script>/gs)];

    let total = 0;
    for (const [, attrs, body] of scriptTags) {
      // JSON-LD blocks are data for crawlers, never code the browser runs.
      if (!/src=/.test(attrs) && /type="application\/(ld\+)?json"/.test(attrs)) continue;
      const src = attrs.match(/src="([^"]+)"/)?.[1];
      if (src) {
        // pagefind/ is loaded lazily by the search page, not by the index.
        if (/\/pagefind\//.test(src)) continue;
        // The build rewrites "/_astro/x.js" to paths relative to dist root.
        const file = join(dist, src.replace(/^\//, ""));
        total += statSync(file).size;
      } else {
        total += Buffer.byteLength(body);
      }
    }

    expect(
      total,
      `startup JS budget exceeded: ${total} bytes across ${scriptTags.length} script blocks`,
    ).toBeLessThanOrEqual(15 * 1024);
  });

  it("keeps every non-OG image under 300 KiB", () => {
    const images = walk(dist)
      .filter((file) => /\.(png|webp|jpe?g|avif|svg|gif)$/i.test(file))
      .filter((file) => !relative(file).startsWith("og/"));
    expect(images.length, "the site ships images to budget-check").toBeGreaterThan(0);
    for (const image of images) {
      const size = statSync(image).size;
      expect(size, relative(image)).toBeLessThan(300 * 1024);
    }
  });

  it("keeps gradients and backdrop-filter out of the site's own CSS", () => {
    // Scoped to the CSS of this site's design system (dist/_astro). Two
    // third-party sheets ship as-is and are not part of the system:
    // - pagefind's UI (its own interface, never restyled here);
    // - Expressive Code's frame chrome (ec.*; its default tab-bar border
    //   fade is library chrome, not one of our visual motifs).
    const css = walk(dist)
      .filter((file) => /\.(css|html)$/i.test(file))
      .filter((file) => !relative(file).startsWith("pagefind/"))
      .filter((file) => !/_astro\/ec\.[\w-]+\.css$/.test(file));

    const forbidden = /linear-gradient|radial-gradient|backdrop-filter/;
    for (const file of css) {
      const text = readFileSync(file, "utf-8");
      expect(text.toLowerCase(), relative(file)).not.toMatch(forbidden);
    }
  });
});