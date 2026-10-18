import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const noDemoDir = fileURLToPath(new URL("../../dist-nodemo", import.meta.url));
const SITE = "https://blog.ithings.ch";

/**
 * The old URLs the previous Docusaurus site served, kept alive: each old
 * route rebuilds as a static page whose only content is a refresh to the
 * new address (Astro's `redirects`, configured in astro.config.mjs).
 */
const LEGACY = [
  { path: "blog.html", from: "/blog", to: "/writing" },
  { path: "blog/welcome.html", from: "/blog/welcome", to: "/writing" },
] as const;

describe.each(LEGACY)("legacy route $from", ({ path, to }) => {
  it("exists as a static redirect page", () => {
    expect(existsSync(join(distDir, path)), path).toBe(true);
  });

  it("refreshes the browser to the new route, in both production builds", () => {
    for (const dir of [distDir, noDemoDir]) {
      const html = readFileSync(join(dir, path), "utf-8");
      expect(html, path).toMatch(
        new RegExp(`http-equiv="refresh"[^>]*content="0;url=${to}"`),
      );
    }
  });

  it("advertises the new location as canonical, in both production builds", () => {
    for (const dir of [distDir, noDemoDir]) {
      const html = readFileSync(join(dir, path), "utf-8");
      expect(html, path).toMatch(new RegExp(`rel="canonical"[^>]*href="${SITE}${to}"`));
    }
  });

  it("does not leak itself into the sitemap", () => {
    const urls = readdirSync(distDir)
      .filter((f) => /sitemap-\d+\.xml$/.test(f))
      .map((f) => readFileSync(join(distDir, f), "utf-8"))
      .join("\n");
    expect(urls).not.toContain(`${SITE}/blog`);
  });
});
