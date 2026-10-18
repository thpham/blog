/**
 * The isoline tech radar (spec §7.8): four quadrant sectors, four concentric
 * rings with Adopt at the centre ("the summit"), and every technology placed
 * deterministically in its ring × quadrant cell. Pure and DOM-free so the
 * chart is computed at build time and unit tests run against plain objects.
 */

import { fnv1a, parkMiller } from "./hash";

export const QUADRANTS = [
  { id: "platform-cloud", label: "Platform & Cloud" },
  { id: "ai-agents", label: "AI & Agents" },
  { id: "connected-edge", label: "Connected things & Edge" },
  { id: "tools-practices", label: "Tools & Practices" },
] as const;

export const RINGS = ["adopt", "trial", "assess", "hold"] as const;

export type QuadrantId = (typeof QUADRANTS)[number]["id"];
export type RingId = (typeof RINGS)[number];

/**
 * One band per ring, quarters of the half-size radius: Adopt takes the
 * innermost quarter (the summit), Hold the outermost. The bands abut, and
 * the last one reaches the full radius.
 */
export function ringBounds(size: number): { inner: number; outer: number }[] {
  const r = size / 2;
  return RINGS.map((_, i) => ({ inner: (i * r) / 4, outer: ((i + 1) * r) / 4 }));
}

/** The outer rim of the radar, drawn just inside the chart's edge. */
export const RIM = 0.94;

/**
 * The contour levels that draw the rings: one at each band boundary plus
 * the outer rim. (There are 4 rings but only 3 inner boundaries.)
 */
export function ringLevels(size: number): number[] {
  const r = size / 2;
  return [...ringBounds(size).slice(0, -1).map((b) => b.outer), RIM * r];
}

/**
 * A radial field lightly perturbed by angular ripples, seeded like the
 * terrains: the isolines drawn at `ringLevels(size)` are the rings — wobbly
 * contour circles, never off by more than 3 % of the radius from any ring
 * bound.
 */
export function ringField(size: number, seed: string): (x: number, y: number) => number {
  const r = size / 2;
  const random = parkMiller(fnv1a(seed));
  const phase = random() * Math.PI * 2;
  const shift = random() * Math.PI * 2;
  return (x, y) => {
    const dx = x - r;
    const dy = y - r;
    const radial = Math.hypot(dx, dy);
    const theta = Math.atan2(dy, dx);
    // Two ripples: ≤ 0.012·r + 0.006·r, together under the 3 % budget.
    const ripple =
      0.012 * r * Math.sin(4 * theta + phase) + 0.006 * r * Math.sin(7 * theta + shift);
    return radial + ripple;
  };
}

const RETRIES = 40;
const SECTOR = Math.PI / 2;

export interface BlipInput {
  id: string;
  quadrant: string;
  ring: string;
}

export interface PositionedBlip {
  id: string;
  x: number;
  y: number;
}

/**
 * Deterministic placement: every blip draws its own pseudo-random angle and
 * radius from `parkMiller(fnv1a(id))` — `angle = sector start +
 * (0.1 + 0.8·R())·90°` for its quadrant, `r = inner + (0.15 + 0.7·R())·(outer
 * − inner)` for its ring, which keeps a 15 % margin inside the band — and
 * redraws up to `RETRIES` times when it lands within `size·0.03` of an
 * already-placed blip. Two calls, whatever the input order, place a blip at
 * the same coordinates.
 */
export function layoutBlips(blips: BlipInput[], size: number): PositionedBlip[] {
  const centre = size / 2;
  const bands = ringBounds(size);
  const minDistance = size * 0.03;
  const placed: PositionedBlip[] = [];

  for (const blip of blips) {
    const quadrantIndex = QUADRANTS.findIndex((q) => q.id === blip.quadrant);
    if (quadrantIndex === -1) {
      throw new Error(`unknown radar quadrant: ${blip.quadrant}`);
    }
    const bandIndex = RINGS.indexOf(blip.ring as (typeof RINGS)[number]);
    if (bandIndex === -1) {
      throw new Error(`unknown radar ring: ${blip.ring}`);
    }
    const { inner, outer } = bands[bandIndex];
    const start = -SECTOR + quadrantIndex * SECTOR;

    const random = parkMiller(fnv1a(blip.id));
    let best: PositionedBlip | undefined;
    let bestClearance = -Infinity;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const angle = start + (0.1 + 0.8 * random()) * SECTOR;
      const radius = inner + (0.15 + 0.7 * random()) * (outer - inner);
      const x = centre + Math.cos(angle) * radius;
      const y = centre + Math.sin(angle) * radius;
      let nearest = Infinity;
      for (const p of placed) {
        nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
      }
      if (nearest > bestClearance) {
        bestClearance = nearest;
        best = { id: blip.id, x, y };
      }
      if (nearest >= minDistance) {
        best = { id: blip.id, x, y };
        break;
      }
    }
    placed.push(best!);
  }

  return placed;
}

/**
 * Whether a blip moved recently: `new` when its single history entry is
 * inside the window, `moved` when the latest entry changed ring inside it,
 * `null` otherwise (including when a recent entry repeats the ring it
 * already had).
 */
export function movement(
  history: { date: Date; ring: string }[],
  now: Date,
  days = 90,
): "moved" | "new" | null {
  if (history.length === 0) return null;
  const sorted = [...history].sort((a, b) => b.date.getTime() - a.date.getTime());
  const [latest, previous] = sorted;
  if (now.getTime() - latest.date.getTime() > days * 24 * 60 * 60 * 1000) return null;
  if (previous === undefined) return "new";
  return latest.ring !== previous.ring ? "moved" : null;
}