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
