/**
 * Pure, DOM-free marching-squares isoline (contour) generator, ported from
 * the visual-direction-v2 mockup. Produces SVG path data for a scalar field
 * without ever touching the DOM, so it can run at build time (home hero,
 * previews, article headers, OG images, radar rings).
 */

import { fnv1a, parkMiller } from "./hash";

export type Contour = { level: number; major: boolean; d: string };

/** A terrain "node": [x, y, amplitude, sigma]. */
export type Source = [x: number, y: number, amp: number, sigma: number];

type Point = [number, number];

/**
 * Builds the list of contour levels between `from` and `to` (inclusive),
 * spaced by `step`. Float-safe: the count is computed with a small epsilon
 * so that e.g. levels(0.06, 1.2, 0.08) yields exactly 15 values, and each
 * level is rounded to avoid floating-point drift.
 */
export function levels(from: number, to: number, step: number): number[] {
  const count = Math.floor((to - from) / step + 1e-9) + 1;
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = from + i * step;
    result.push(Math.round(v * 1e9) / 1e9);
  }
  return result;
}

// Marching-squares segment table, keyed by the 4-bit corner mask
// (TL=8, TR=4, BR=2, BL=1). Ported verbatim from the mockup, including its
// case 7 / case 8 duplication.
function segmentsFor(mask: number, T: Point, R: Point, B: Point, L: Point): Point[][] {
  const table: Record<number, Point[][]> = {
    1: [[L, B]],
    2: [[B, R]],
    3: [[L, R]],
    4: [[T, R]],
    5: [
      [L, T],
      [B, R],
    ],
    6: [[T, B]],
    7: [[L, T]],
    8: [[L, T]],
    9: [[T, B]],
    10: [
      [L, B],
      [T, R],
    ],
    11: [[T, R]],
    12: [[L, R]],
    13: [[B, R]],
    14: [[L, B]],
  };
  return table[mask];
}

/**
 * Marching squares over a scalar field `f`, sampled on a `cell`-sized grid
 * covering [0, w] x [0, h]. Returns one Contour per requested level, each a
 * single `d` path (segments as `M…L…`) with coordinates rounded to 0.1.
 * `major` is true for every fourth level by index (0, 4, 8, …).
 */
export function contourField(
  f: (x: number, y: number) => number,
  w: number,
  h: number,
  levelList: number[],
  cell = 4,
): Contour[] {
  const nx = Math.ceil(w / cell) + 1;
  const ny = Math.ceil(h / cell) + 1;
  const g = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      g[j * nx + i] = f(i * cell, j * cell);
    }
  }

  return levelList.map((level, index) => {
    let d = "";
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = g[j * nx + i];
        const b = g[j * nx + i + 1];
        const c = g[(j + 1) * nx + i + 1];
        const e = g[(j + 1) * nx + i];
        const mask =
          (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (e > level ? 1 : 0);
        if (mask === 0 || mask === 15) continue;

        const x = i * cell;
        const y = j * cell;
        const T: Point = [x + (cell * (level - a)) / (b - a), y];
        const R: Point = [x + cell, y + (cell * (level - b)) / (c - b)];
        const B: Point = [x + (cell * (level - e)) / (c - e), y + cell];
        const L: Point = [x, y + (cell * (level - a)) / (e - a)];

        for (const [p1, p2] of segmentsFor(mask, T, R, B, L)) {
          d += `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
        }
      }
    }
    return { level, major: index % 4 === 0, d };
  });
}

/**
 * Builds the scalar terrain field for a set of sources and a phase: a soft
 * directional warp plus a sum of elliptical gaussian bumps, one per source.
 */
export function terrainField(
  sources: Source[],
  phase: number,
): (x: number, y: number) => number {
  return (x: number, y: number) => {
    let v =
      0.05 * Math.sin(x / 47 + phase) * Math.cos(y / 39 - phase) +
      0.035 * Math.sin((x + 2 * y) / 31 + phase * 2);
    for (const [sx, sy, amp, sigma] of sources) {
      const dx = x - sx;
      const dy = (y - sy) * 1.2;
      v += amp * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
    return v;
  };
}

/**
 * Deterministically derives a terrain (sources, phase, contours, seed) from
 * a string key, so that e.g. an article's title always renders the same
 * topographic motif.
 */
export function terrainFor(
  key: string,
  w: number,
  h: number,
): { sources: Source[]; phase: number; contours: Contour[]; seed: string } {
  const hashed = fnv1a(key);
  const R = parkMiller(hashed);

  const n = 2 + Math.floor(R() * 3);
  const sources: Source[] = [];
  for (let i = 0; i < n; i++) {
    const x = 0.11 * w + R() * (0.89 * w - 0.11 * w);
    const y = 0.15 * h + R() * (0.85 * h - 0.15 * h);
    const amp = i === 0 ? 1 : 0.4 + R() * 0.5;
    const sigma = 0.104 * w + R() * (0.215 * w - 0.104 * w);
    sources.push([x, y, amp, sigma]);
  }
  const phase = R() * 6;

  const lv = levels(0.06, 1.2, 0.08);
  const contours = contourField(terrainField(sources, phase), w, h, lv);
  const seed = hashed.toString(16).slice(0, 6);

  return { sources, phase, contours, seed };
}
