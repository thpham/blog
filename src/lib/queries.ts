/**
 * Collection queries shared by the writing pages. Production builds never
 * see drafts (`isVisible`); everything is sorted newest first.
 */
import { getCollection, type CollectionEntry } from "astro:content";
import { isVisible, type VisibilityData } from "./content";
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

export type RadarEntry = CollectionEntry<"radar">;

/** Alphabetical by name; the radar list itself groups by quadrant. */
function byName(a: RadarEntry, b: RadarEntry): number {
  return a.data.name.localeCompare(b.data.name) || a.id.localeCompare(b.id);
}

export async function visibleRadar(): Promise<RadarEntry[]> {
  // Radar notes carry no draft status today; the cast keeps them behind the
  // same visibility rule should one be added (it is what Header.astro does).
  const entries = await getCollection("radar", (e) =>
    isVisible(e.data as VisibilityData, import.meta.env.PROD),
  );
  return entries.sort(byName);
}
