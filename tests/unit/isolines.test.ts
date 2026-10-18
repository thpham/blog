import { describe, expect, it } from "vitest";
import { fnv1a } from "../../src/lib/hash";
import {
  contourField,
  levels,
  terrainField,
  terrainFor,
} from "../../src/lib/isolines";

// A single, analytically known gaussian bump, independent of terrainField's
// base warp terms, used to verify marching-squares correctness directly.
function gaussianBump(x: number, y: number): number {
  const dx = x - 100;
  const dy = (y - 100) * 1.2;
  return Math.exp(-(dx * dx + dy * dy) / (2 * 30 * 30));
}

function pointsOf(d: string): [number, number][] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) {
    points.push([nums[i], nums[i + 1]]);
  }
  return points;
}

describe("levels", () => {
  it("produces 15 float-safe levels for (0.06, 1.2, 0.08)", () => {
    const lv = levels(0.06, 1.2, 0.08);
    expect(lv).toHaveLength(15);
    expect(lv[0]).toBeCloseTo(0.06, 9);
    expect(lv[lv.length - 1]).toBeCloseTo(1.18, 9);
  });
});

describe("contourField", () => {
  it("places every segment endpoint within 0.02 of the requested level", () => {
    const [contour] = contourField(gaussianBump, 200, 200, [0.5]);
    const points = pointsOf(contour.d);
    expect(points.length).toBeGreaterThan(0);
    for (const [x, y] of points) {
      expect(Math.abs(gaussianBump(x, y) - 0.5)).toBeLessThan(0.02);
    }
  });

  it("marks every fourth level (by index) as major", () => {
    const lv = levels(0.06, 1.2, 0.08);
    const contours = contourField(gaussianBump, 200, 200, lv);
    const majors = contours.map((c) => c.major);
    const expected = lv.map((_, i) => i % 4 === 0);
    expect(majors).toEqual(expected);
    expect(majors.slice(0, 5)).toEqual([true, false, false, false, true]);
  });

  it("preserves the requested level on each contour", () => {
    const lv = levels(0.06, 1.2, 0.08);
    const contours = contourField(gaussianBump, 200, 200, lv);
    expect(contours.map((c) => c.level)).toEqual(lv);
  });
});

describe("terrainField", () => {
  it("builds a pure function of (x, y) from sources and a phase", () => {
    const f = terrainField([[100, 100, 1, 30]], 0);
    expect(typeof f).toBe("function");
    expect(f(100, 100)).toBeGreaterThan(f(0, 0));
  });
});

describe("terrainFor", () => {
  it("is deterministic for the same key and dimensions", () => {
    const first = terrainFor("a", 270, 170);
    const second = terrainFor("a", 270, 170);
    expect(second).toEqual(first);
  });

  it("produces different terrain for different keys", () => {
    const a = terrainFor("a", 270, 170);
    const b = terrainFor("b", 270, 170);
    expect(a.contours.map((c) => c.d)).not.toEqual(b.contours.map((c) => c.d));
  });

  it("produces between 2 and 4 sources", () => {
    const { sources } = terrainFor("a", 270, 170);
    expect(sources.length).toBeGreaterThanOrEqual(2);
    expect(sources.length).toBeLessThanOrEqual(4);
  });

  it("derives the seed from fnv1a(key) as a 6-char hex prefix", () => {
    const { seed } = terrainFor("a", 270, 170);
    expect(seed).toBe(fnv1a("a").toString(16).slice(0, 6));
  });
});
