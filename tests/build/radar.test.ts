import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { QUADRANTS, RINGS, layoutBlips, ringBounds } from "../../src/lib/radar";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));
const noDemoDir = fileURLToPath(new URL("../../dist-nodemo", import.meta.url));

function page(dir: string, path: string): string {
  return readFileSync(join(dir, path), "utf-8");
}

/** The first element opened by `open` up to its closing tag. */
function region(html: string, open: string | RegExp, tag: string): string {
  const start = html.search(typeof open === "string" ? new RegExp(open) : open);
  expect(start, `region ${open}`).toBeGreaterThan(-1);
  const end = html.indexOf(`</${tag}>`, start);
  return html.slice(start, end);
}

/**
 * Demo radar points (ruling P3). Positions are candidates, marked with
 * `# TO VALIDATE WITH THOMAS` in the YAML of the content files; the Task 11
 * checkpoint owns their real values. Claude Code carries two history
 * entries (the only `moved` indicator of the set); NixOS is recent enough
 * to be flagged `new`.
 */
const BLIPS = [
  { id: "astro", quadrant: "tools-practices", ring: "trial" },
  { id: "claude-code", quadrant: "ai-agents", ring: "trial" },
  { id: "crossplane", quadrant: "platform-cloud", ring: "assess" },
  { id: "home-assistant", quadrant: "connected-edge", ring: "assess" },
  { id: "kubernetes", quadrant: "platform-cloud", ring: "adopt" },
  { id: "nixos", quadrant: "tools-practices", ring: "assess" },
  { id: "openshift", quadrant: "platform-cloud", ring: "trial" },
  { id: "terraform", quadrant: "tools-practices", ring: "adopt" },
];

const SIZE = 640;
const R = SIZE / 2;

const html = page(distDir, "radar.html");
const head = region(html, '<header class="site-header', "header");
const svgStart = html.search(/<svg[^>]*class="[^"]*radar-chart/);
const svgEnd = html.indexOf("</svg>", svgStart);
const svg = html.slice(svgStart, svgEnd);

interface Link {
  block: string;
  id: string;
  quadrant: string;
  ring: string;
  cx: number;
  cy: number;
}

const links: Link[] = [...svg.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/g)]
  .map((m) => {
    const block = m[0];
    const attr = (name: string) => new RegExp(`${name}=["']([^"']+)["']`).exec(block)?.[1];
    const circle = /<circle[^>]*class="[^"]*\bnode\b[^>]*>/.exec(block)?.[0] ?? "";
    const coord = (name: string) => Number(new RegExp(`${name}=["']([^"']+)["']`).exec(circle)?.[1]);
    return {
      block,
      id: String(attr("data-id")),
      quadrant: String(attr("data-quadrant")),
      ring: String(attr("data-ring")),
      cx: coord("cx"),
      cy: coord("cy"),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

describe("radar chart (dist/radar.html)", () => {
  it("draws the rings as contour paths", () => {
    expect(svg).toMatch(/class="rings"/);
    const rings = [...svg.matchAll(/<path[^>]*class="[^"]*\bring\b[^>]*>/g)];
    expect(rings.length).toBeGreaterThanOrEqual(3);
  });

  it("links every visible blip, and only the visible ones", () => {
    expect(links.map((l) => l.id)).toEqual(BLIPS.map((b) => b.id));
    for (const link of links) {
      expect(link.block, `href of ${link.id}`).toContain(`href="/radar/${link.id}"`);
    }
  });

  it("keeps the chart free of scripts and inline handlers", () => {
    expect(svg).not.toMatch(/<script/i);
    expect(svg).not.toMatch(/\son[a-z]+=/i);
  });

  it("exposes each blip's name through a <title>, for hover and AT", () => {
    for (const link of links) {
      expect(link.block, `title of ${link.id}`).toMatch(/<title>[^<]+<\/title>/);
    }
  });

  it("places every blip exactly where the deterministic library does", () => {
    const expected = layoutBlips(
      BLIPS.map(({ id, quadrant, ring }) => ({ id, quadrant, ring })),
      SIZE,
    );
    expect(links.length).toBe(BLIPS.length);
    for (const [i, b] of [...BLIPS].sort((a, b) => a.id.localeCompare(b.id)).entries()) {
      const link = links[i];
      expect(link.quadrant, `quadrant of ${b.id}`).toBe(b.quadrant);
      expect(link.ring, `ring of ${b.id}`).toBe(b.ring);
      expect(link.cx, `x of ${b.id}`).toBeCloseTo(expected.find((p) => p.id === b.id)!.x, 6);
      expect(link.cy, `y of ${b.id}`).toBeCloseTo(expected.find((p) => p.id === b.id)!.y, 6);
    }
  });

  it("keeps every blip inside the 15 %..85 % margin of its ring band", () => {
    const bands = ringBounds(SIZE);
    for (const link of links) {
      const band = bands[RINGS.indexOf(link.ring as (typeof RINGS)[number])];
      const margin = (band.outer - band.inner) * 0.15;
      const radius = Math.hypot(link.cx - R, link.cy - R);
      expect(radius, `band margin of ${link.id}`).toBeGreaterThanOrEqual(band.inner + margin - 0.5);
      expect(radius, `band margin of ${link.id}`).toBeLessThanOrEqual(band.inner + (band.outer - band.inner) * 0.85 + 0.5);
    }
  });

  it("wobbles every ring by at most 3 % of the radius", () => {
    const rings = [...svg.matchAll(/<path[^>]*class="[^"]*\bring\b[^>]*>/g)];
    for (const ring of rings) {
      const tag = ring[0];
      const level = Number(/data-level=["']([^"']+)["']/.exec(tag)?.[1]);
      expect(Number.isFinite(level), `level attribute of ring ${level}`).toBe(true);
      const d = / d=["']([^"']+)["']/.exec(tag)?.[1] ?? "";
      const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      for (let i = 0; i < nums.length; i += 2) {
        const wobble = Math.abs(Math.hypot(nums[i] - R, nums[i + 1] - R) - level);
        expect(wobble, `ring ${level} point (${nums[i]}, ${nums[i + 1]})`).toBeLessThanOrEqual(
          0.03 * R + 0.1,
        );
      }
    }
  });

  it("labels the rings and the quadrants in the mono face", () => {
    for (const label of ["Adopt", "Trial", "Assess", "Hold"]) {
      expect(svg, `ring label ${label}`).toContain(`>${label}<`);
    }
    for (const q of QUADRANTS) {
      expect(svg, `quadrant label ${q.label}`).toContain(`>${q.label.replace("&", "&amp;")}<`);
    }
  });
});

describe("radar list (dist/radar.html)", () => {
  it("groups the entries under the four quadrant labels, in order", () => {
    const groups = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) =>
      m[1].replace(/&amp;/g, "&"),
    );
    for (const q of QUADRANTS) {
      expect(groups, `quadrant group ${q.label}`).toContain(q.label);
    }
    const positions = QUADRANTS.map((q) => groups.indexOf(q.label));
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("lists each blip in its own quadrant group only", () => {
    for (const q of QUADRANTS) {
      const group = region(html, `>${q.label.replace("&", "&amp;")}</h2`, "section");
      for (const b of BLIPS.filter((b) => b.quadrant === q.id)) {
        expect(group, `group ${q.id} holds ${b.id}`).toContain(`href="/radar/${b.id}"`);
      }
      for (const b of BLIPS.filter((b) => b.quadrant !== q.id)) {
        expect(group, `group ${q.id} omits ${b.id}`).not.toContain(`href="/radar/${b.id}"`);
      }
    }
  });

  it("shows the current ring of every row", () => {
    for (const ring of RINGS) {
      if (BLIPS.some((b) => b.ring === ring)) {
        expect(html, `ring data for ${ring}`).toContain(`data-ring="${ring}"`);
      }
    }
  });

  it("mentions recent movements in mono: one moved, one new", () => {
    expect(html).toContain('data-move="moved"');
    expect(html).toContain('data-move="new"');
  });

  it("appears in the navigation and marks itself current", () => {
    expect(head).toMatch(/href="\/radar"[^>]*aria-current="page"/);
  });
});

describe("blip page (dist/radar/claude-code.html)", () => {
  const sheet = page(distDir, "radar/claude-code.html");
  const history = region(sheet, /class="[^"]*history/, "section");

  it("sets <html lang> from the entry and ships the demo noindex", () => {
    expect(sheet).toMatch(/<html lang="en"/);
    expect(sheet).toMatch(/<meta name="robots" content="noindex, follow"/);
  });

  it("carries its dated history, latest first", () => {
    const dates = [...history.matchAll(/<time[^>]* datetime="([^"]+)"/g)].map((m) => m[1]);
    expect(dates).toEqual(["2026-09-01", "2026-04-01"]);
    expect(history).toContain('data-ring="trial"');
    expect(history).toContain('data-ring="assess"');
  });

  it("states its current ring and the recent movement", () => {
    expect(sheet).toMatch(/data-current-ring="trial"/);
    expect(sheet).toMatch(/data-movement="moved"/);
  });

  it("renders the note as prose", () => {
    expect(sheet).toMatch(/class="prose"/);
  });

  it("draws its own isoline terrain and links back to the radar", () => {
    expect(sheet).toMatch(/<svg[^>]*class="[^"]*\bisolines\b[\s\S]*?<path/);
    expect(sheet).toMatch(/href="\/radar"/);
    expect(sheet).toMatch(/All radar entries/);
  });
});

describe("blip page (dist/radar/nixos.html)", () => {
  const sheet = page(distDir, "radar/nixos.html");

  it("marks the recent entry as new", () => {
    expect(sheet).toMatch(/data-movement="new"/);
  });

  it("lists its single history entry", () => {
    const history = region(sheet, /class="[^"]*history/, "section");
    expect(history).toContain('data-ring="assess"');
  });
});

describe("an old entry is silent (dist/radar/terraform.html)", () => {
  const sheet = page(distDir, "radar/terraform.html");

  it("carries no movement marker", () => {
    expect(sheet).not.toMatch(/data-movement="moved"/);
    expect(sheet).not.toMatch(/data-movement="new"/);
  });
});

describe("with no radar at all (dist-nodemo)", () => {
  it("builds /radar with a sober empty state, no chart and no 'coming soon'", () => {
    const nodemo = page(noDemoDir, "radar.html");
    expect(nodemo).toMatch(/class="empty/);
    expect(nodemo).not.toMatch(/class="[^"]*radar-chart/);
    expect(nodemo).not.toMatch(/coming soon/i);
  });

  it("builds no blip page and drops Radar from the navigation", () => {
    for (const b of BLIPS) {
      expect(existsSync(join(noDemoDir, `radar/${b.id}.html`))).toBe(false);
    }
    const nodemo = page(noDemoDir, "radar.html");
    expect(nodemo).not.toMatch(/<header class="site-header[\s\S]*?href="\/radar"/);
  });
});