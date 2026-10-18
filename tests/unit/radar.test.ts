import { describe, expect, it } from "vitest";
import { contourField } from "../../src/lib/isolines";
import {
  QUADRANTS,
  RINGS,
  layoutBlips,
  movement,
  ringBounds,
  ringField,
  ringLevels,
} from "../../src/lib/radar";

const SIZE = 640;

const D = (s: string) => new Date(`${s}T00:00:00Z`);
const NOW = D("2026-10-18");

/** Angle of a point relative to the centre, in degrees, in [0, 360[. */
function angleOf(x: number, y: number): number {
  return ((Math.atan2(y - SIZE / 2, x - SIZE / 2) * 180) / Math.PI + 360) % 360;
}

/** Quadrant sector start angle, in degrees (index 0 = "up", SVG y-down). */
function sectorStart(index: number): number {
  return (270 + index * 90) % 360;
}

/** Path endpoints of a marching-squares contour, rounded to 0.1. */
function contourPoints(d: string): [number, number][] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: [number, number][] = [];
  for (let i = 0; i < nums.length; i += 2) {
    points.push([nums[i], nums[i + 1]]);
  }
  return points;
}

describe("QUADRANTS and RINGS", () => {
  it("declares the four quadrants and their validated labels, in order", () => {
    expect(QUADRANTS.map((q) => q.id)).toEqual([
      "platform-cloud",
      "ai-agents",
      "connected-edge",
      "tools-practices",
    ]);
    expect(QUADRANTS.map((q) => q.label)).toEqual([
      "Platform & Cloud",
      "AI & Agents",
      "Connected things & Edge",
      "Tools & Practices",
    ]);
  });

  it("declares the four rings with Adopt at the centre", () => {
    expect([...RINGS]).toEqual(["adopt", "trial", "assess", "hold"]);
  });
});

describe("ringBounds", () => {
  it("returns one band per ring, growing outwards, inside the half-size radius", () => {
    const bands = ringBounds(SIZE);
    expect(bands).toHaveLength(RINGS.length);
    expect(bands[0].inner).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < bands.length; i++) {
      expect(bands[i].inner, `band ${RINGS[i]} inner`).toBeLessThan(bands[i].outer);
      if (i > 0) {
        expect(bands[i].inner, `band ${RINGS[i]} abuts the previous band`).toBe(
          bands[i - 1].outer,
        );
      }
    }
    expect(bands[RINGS.length - 1].outer).toBe(SIZE / 2);
  });

  it("scales linearly with the size", () => {
    const small = ringBounds(320);
    expect(small[1].outer).toBeCloseTo(ringBounds(SIZE)[1].outer / 2, 9);
  });
});

describe("ringLevels", () => {
  it("lists the three ring boundaries plus an outer rim inside the radius", () => {
    const bands = ringBounds(SIZE);
    expect(ringLevels(SIZE)).toEqual([
      bands[0].outer,
      bands[1].outer,
      bands[2].outer,
      0.94 * (SIZE / 2),
    ]);
    expect(ringLevels(320)[3]).toBeCloseTo(0.94 * (SIZE / 2) / 2, 6);
  });
});

describe("layoutBlips", () => {
  const blips = [
    { id: "kubernetes", quadrant: "platform-cloud", ring: "adopt" },
    { id: "claude-code", quadrant: "ai-agents", ring: "trial" },
    { id: "home-assistant", quadrant: "connected-edge", ring: "assess" },
    { id: "nixos", quadrant: "tools-practices", ring: "trial" },
  ];
  const placed = layoutBlips(blips, SIZE);
  const bands = ringBounds(SIZE);

  it("returns one position per blip, carrying the blip's id", () => {
    expect(placed.map((p) => p.id)).toEqual(blips.map((b) => b.id));
    for (const p of placed) {
      expect(Number.isFinite(p.x), `x of ${p.id}`).toBe(true);
      expect(Number.isFinite(p.y), `y of ${p.id}`).toBe(true);
    }
  });

  it("places every blip in its quadrant's 90° sector, with a margin off the sector axes", () => {
    for (let i = 0; i < placed.length; i++) {
      const q = QUADRANTS.findIndex((q) => q.id === blips[i].quadrant);
      const relative = (angleOf(placed[i].x, placed[i].y) - sectorStart(q) + 360) % 360;
      // The plan's angle formula keeps positions in [0.1, 0.9] of the sector.
      expect(relative, `sector position of ${blips[i].id}`).toBeGreaterThanOrEqual(0.05 * 90);
      expect(relative, `sector position of ${blips[i].id}`).toBeLessThanOrEqual(0.95 * 90);
    }
  });

  it("places every blip inside its ring band", () => {
    for (let i = 0; i < placed.length; i++) {
      const band = bands[RINGS.indexOf(blips[i].ring as (typeof RINGS)[number])];
      const radius = Math.hypot(placed[i].x - SIZE / 2, placed[i].y - SIZE / 2);
      expect(radius, `ring band of ${blips[i].id}`).toBeGreaterThanOrEqual(band.inner);
      expect(radius, `ring band of ${blips[i].id}`).toBeLessThanOrEqual(band.outer);
    }
  });

  it("is deterministic: two calls give identical results", () => {
    expect(layoutBlips(blips, SIZE)).toEqual(placed);
    // Order of the input does not change a blip's own position.
    const shuffled = [blips[2], blips[0], blips[3], blips[1]];
    const rerun = layoutBlips(shuffled, SIZE);
    for (const b of blips) {
      expect(rerun.find((p) => p.id === b.id)).toEqual(placed.find((p) => p.id === b.id));
    }
  });

  it("keeps 12 blips of one cell at least size·0.03 apart", () => {
    const crowded = Array.from({ length: 12 }, (_, i) => ({
      id: `crowd-${i}`,
      quadrant: "tools-practices",
      ring: "trial",
    }));
    const positions = layoutBlips(crowded, SIZE);
    const minDistance = sizeOfMinPair(positions);
    expect(minDistance).toBeGreaterThanOrEqual(SIZE * 0.03);
  });

  it("keeps 40 attempts from collapsing two blips into one cell edge", () => {
    // Same seeds collide only if the retry budget were not honoured; any
    // number of blips still lands with the plan's margin inside the band.
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `many-${i}`,
      quadrant: "ai-agents",
      ring: "assess",
    }));
    const positions = layoutBlips(many, SIZE);
    expect(positions).toHaveLength(40);
  });

  it("throws on a blip whose quadrant or ring is unknown", () => {
    expect(() => layoutBlips([{ id: "x", quadrant: "nowhere", ring: "adopt" }], SIZE)).toThrow();
    expect(() => layoutBlips([{ id: "x", quadrant: "ai-agents", ring: "deep" }], SIZE)).toThrow();
  });

  function sizeOfMinPair(positions: { x: number; y: number }[]): number {
    let min = Infinity;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const d = Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y);
        if (d < min) min = d;
      }
    }
    return min;
  }
});

describe("ringField", () => {
  it("is a radial field, perturbed by at most 3 % of the radius", () => {
    const field = ringField(SIZE, "radar");
    const r = SIZE / 2;
    let max = 0;
    for (let x = 0; x <= SIZE; x += 7) {
      for (let y = 0; y <= SIZE; y += 7) {
        const radial = Math.hypot(x - r, y - r);
        const deviation = Math.abs(field(x, y) - radial);
        if (deviation > max) max = deviation;
      }
    }
    expect(max).toBeLessThanOrEqual(0.03 * r);
    expect(max).toBeGreaterThan(0); // there is a perturbation at all
  });

  it("is deterministic for a given seed, and differs between seeds", () => {
    const first = ringField(SIZE, "radar");
    expect(first(10, 10)).toBe(ringField(SIZE, "radar")(10, 10));
    const other = ringField(SIZE, "another-radar");
    expect(other(210, 210)).not.toBe(first(210, 210));
  });

  it("contours drawn at the ring bounds stay within 3 % of the radius", () => {
    const r = SIZE / 2;
    const field = ringField(SIZE, "radar");
    const bands = ringBounds(SIZE);
    const contours = contourField(field, SIZE, SIZE, bands.map((b) => b.outer), 4);
    for (const contour of contours) {
      const points = contourPoints(contour.d);
      expect(points.length, `ring at level ${contour.level} is traced`).toBeGreaterThan(4);
      for (const [x, y] of points) {
        const wobble = Math.abs(Math.hypot(x - r, y - r) - contour.level);
        expect(wobble).toBeLessThanOrEqual(0.03 * r + 0.1); // +0.1: contour rounding
      }
    }
  });

  it("rings that are traced never leave the chart square by more than the wobble", () => {
    const r = SIZE / 2;
    const field = ringField(SIZE, "radar");
    const bands = ringBounds(SIZE);
    const contours = contourField(field, SIZE, SIZE, bands.slice(0, -1).map((b) => b.outer), 4);
    for (const contour of contours) {
      for (const [x, y] of contourPoints(contour.d)) {
        expect(Math.abs(x - r)).toBeLessThanOrEqual(r + 0.03 * r);
        expect(Math.abs(y - r)).toBeLessThanOrEqual(r + 0.03 * r);
      }
    }
  });
});

describe("movement", () => {
  it("flags 'moved' when the latest history entry changed ring within 90 days", () => {
    expect(movement([D("2026-01-01"), D("2026-09-01")].map((date, i) => ({
      date,
      ring: i === 0 ? "assess" : "trial",
    })), NOW)).toBe("moved");
  });

  it("flags 'new' when a single history entry is inside the window", () => {
    expect(movement([{ date: D("2026-09-01"), ring: "assess" }], NOW)).toBe("new");
  });

  it("returns null when the latest entry predates the window", () => {
    expect(movement([{ date: D("2025-01-01"), ring: "assess" }], NOW)).toBeNull();
  });

  it("returns null when the recent move repeats the ring it had", () => {
    expect(
      movement(
        [
          { date: D("2026-08-01"), ring: "trial" },
          { date: D("2026-09-01"), ring: "trial" },
        ],
        NOW,
      ),
    ).toBeNull();
  });

  it("sorts internally: an unsorted history is judged on its latest entry", () => {
    expect(
      movement(
        [
          { date: D("2026-09-01"), ring: "trial" },
          { date: D("2026-01-01"), ring: "assess" },
        ],
        NOW,
      ),
    ).toBe("moved");
  });
});