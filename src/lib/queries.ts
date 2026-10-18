/**
 * Collection queries shared by the writing pages. Production builds never
 * see drafts (`isVisible`); everything is sorted newest first.
 */
import { getCollection, type CollectionEntry } from "astro:content";
import { isVisible } from "./content";
import { byDateDesc } from "./writing";

export type WritingEntry = CollectionEntry<"writing">;

export async function visibleWriting(): Promise<WritingEntry[]> {
  const entries = await getCollection("writing", (e) => isVisible(e.data, import.meta.env.PROD));
  return entries.sort(byDateDesc);
}

export type LabEntry = CollectionEntry<"lab">;

/** Most recent activity first; a tie is broken by the latest start. */
function byLastTouchedDesc(a: LabEntry, b: LabEntry): number {
  return (
    b.data.lastTouched.getTime() - a.data.lastTouched.getTime() ||
    b.data.started.getTime() - a.data.started.getTime() ||
    a.id.localeCompare(b.id)
  );
}

export async function visibleLab(): Promise<LabEntry[]> {
  const entries = await getCollection("lab", (e) => isVisible(e.data, import.meta.env.PROD));
  return entries.sort(byLastTouchedDesc);
}
