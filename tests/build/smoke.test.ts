import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));

describe("astro build smoke test", () => {
  it("produces dist/index.html with the expected <html> tag", () => {
    const html = readFileSync(`${distDir}/index.html`, "utf-8");
    expect(html).toContain('<html lang="en"');
  });

  it("produces dist/CNAME with the expected domain", () => {
    const cname = readFileSync(`${distDir}/CNAME`, "utf-8").trim();
    expect(cname).toBe("blog.ithings.ch");
  });
});
