import { describe, expect, it } from "vitest";
import { fnv1a, parkMiller } from "../../src/lib/hash";

describe("fnv1a", () => {
  it("hashes the empty string to the FNV-1a offset basis", () => {
    expect(fnv1a("")).toBe(2166136261);
  });

  it("hashes a known string to a stable, frozen value", () => {
    expect(fnv1a("ithings")).toBe(3647597929);
  });

  it("returns an unsigned 32-bit integer", () => {
    const h = fnv1a("some longer string with más características");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("parkMiller", () => {
  it("produces 1000 draws strictly between 0 and 1", () => {
    const rng = parkMiller(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("produces the same sequence for two generators seeded alike", () => {
    const r1 = parkMiller(42);
    const r2 = parkMiller(42);
    const seq1 = Array.from({ length: 1000 }, () => r1());
    const seq2 = Array.from({ length: 1000 }, () => r2());
    expect(seq2).toEqual(seq1);
  });
});
