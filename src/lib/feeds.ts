/**
 * The demo-free feed model shared by every feed endpoint (`/rss.xml`,
 * `rss/[lang].xml`, the Docusaurus-compat `blog/rss.xml` and
 * `blog/atom.xml`, and `llms.txt`). Published entries of every collection,
 * demo entries excluded (spec §9): the feed is the public record.
 */
import { entryUrl } from "./ids";
import { QUADRANTS } from "./radar";
import { visibleLab, visibleRadar, visibleWriting } from "./queries";

export interface FeedEntry {
  kind: "writing" | "lab" | "radar";
  id: string;
  url: string;
  title: string;
  date: Date;
  lang: "en" | "fr";
  summary: string;
}

/**
 * One record per collection: writing contributes its `description`, Lab its
 * `intent`, Radar a one-line position sentence. `date` is the entry's own
 * publication date (`date`, `lastTouched`, latest history date).
 */
function toFeedEntry(
  e: { id: string; data: Record<string, unknown> },
  kind: "writing" | "lab" | "radar",
): FeedEntry {
  const d = e.data as {
    title?: string;
    name?: string;
    description?: string;
    intent?: string;
    date?: Date;
    lastTouched?: Date;
    history?: { date: Date; ring: string }[];
    lang: "en" | "fr";
    quadrant?: string;
    ring?: string;
  };
  const summary =
    kind === "radar"
      ? `${d.name} — ${QUADRANTS.find((q) => q.id === d.quadrant)?.label ?? ""}, in the ${d.ring} ring of the tech radar.`
      : (d.description ?? d.intent ?? "");
  return {
    kind,
    id: e.id,
    url: entryUrl(kind, e.id),
    title: kind === "radar" ? (d.name as string) : (d.title as string),
    date: (d.date ?? d.lastTouched ?? d.history?.at(-1)?.date) as Date,
    lang: d.lang,
    summary,
  };
}

/** An entry feeds out when it is published and not demo content (spec §9). */
export function feedsIt(entry: { data: { demo: boolean; status?: string } }): boolean {
  return !entry.data.demo && entry.data.status !== "draft";
}

/**
 * Published, non-demo entries of every collection, newest first (writing by
 * `date`, lab by `lastTouched`, radar by its latest history date).
 */
export async function feedEntries(): Promise<FeedEntry[]> {
  const [writing, lab, radar] = await Promise.all([visibleWriting(), visibleLab(), visibleRadar()]);
  const kept = [
    ...writing.filter(feedsIt).map((e) => toFeedEntry(e, "writing")),
    ...lab.filter(feedsIt).map((e) => toFeedEntry(e, "lab")),
    ...radar.filter(feedsIt).map((e) => toFeedEntry(e, "radar")),
  ];
  kept.sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
  return kept;
}