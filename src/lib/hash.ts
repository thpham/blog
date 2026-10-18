/**
 * Deterministic hashing + PRNG, ported verbatim from the
 * visual-direction-v2 mockup so that terrain generation is stable across
 * runs, builds and languages.
 */

/** FNV-1a 32-bit hash, returned as an unsigned 32-bit integer. */
export function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Park-Miller minimal standard PRNG. Returns a generator function that
 * yields successive values in the open interval ]0, 1[.
 */
export function parkMiller(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
