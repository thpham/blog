/**
 * Pure helpers for the writing list and its static filter pages. Inputs are
 * typed structurally so collection entries and test fixtures both fit.
 */

interface Dated {
  id: string;
  data: { date: Date };
}

interface Topical {
  data: { topics: { label: string; slug: string }[] };
}

export interface TopicCount {
  slug: string;
  label: string;
  count: number;
}

/** Newest first; same-day entries ordered by id so builds are stable. */
export function byDateDesc(a: Dated, b: Dated): number {
  return b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id);
}

/**
 * Every topic in use, with its entry count: most used first, then by label.
 * The label shown is the first one met for a slug.
 */
export function topicIndex(entries: Topical[]): TopicCount[] {
  const map = new Map<string, TopicCount>();
  for (const e of entries) {
    for (const t of e.data.topics) {
      const hit = map.get(t.slug);
      if (hit) hit.count++;
      else map.set(t.slug, { slug: t.slug, label: t.label, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
