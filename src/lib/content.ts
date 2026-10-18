/**
 * Visibility, reading-time, feed and navigation helpers shared by pages and
 * tests. Inputs are typed structurally so plain objects and Astro
 * `CollectionEntry` values both satisfy them.
 */
import { entryUrl } from "./ids";

export interface VisibilityData {
  status?: string;
}

/**
 * Draft entries (`status: 'draft'`) are visible while developing
 * (`astro dev`) but excluded from the production build.
 */
export function isVisible(data: VisibilityData, prod: boolean): boolean {
  if (data.status === "draft") {
    return !prod;
  }
  return true;
}

const WORDS_PER_MINUTE = 220;

/** Estimated reading time in minutes: ceil(words / 220), minimum 1. */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE));
}

export interface FeedItem {
  kind: "writing" | "lab";
  id: string;
  url: string;
  title: string;
  date: Date;
  lang: "en" | "fr";
  summary: string;
  readingTime?: number;
  tested?: { name: string; version: string }[];
  verified?: Date;
  labStatus?: string;
  seedKey: string;
}

export interface WritingFeedInput {
  id: string;
  data: {
    title: string;
    description: string;
    date: Date;
    lang: "en" | "fr";
    tested?: { name: string; version: string }[];
    verified?: Date;
  };
  body?: string;
}

export interface LabFeedInput {
  id: string;
  data: {
    title: string;
    intent: string;
    lang: "en" | "fr";
    status: string;
    lastTouched: Date;
  };
}

/** `<collection>/<id>`, a stable key for deterministic terrain seeding. */
function seedKey(collection: "writing" | "lab", id: string): string {
  return `${collection}/${id}`;
}

function writingToFeedItem(entry: WritingFeedInput): FeedItem {
  return {
    kind: "writing",
    id: entry.id,
    url: entryUrl("writing", entry.id),
    title: entry.data.title,
    date: entry.data.date,
    lang: entry.data.lang,
    summary: entry.data.description,
    readingTime: entry.body !== undefined ? readingTime(entry.body) : undefined,
    tested: entry.data.tested,
    verified: entry.data.verified,
    seedKey: seedKey("writing", entry.id),
  };
}

function labToFeedItem(entry: LabFeedInput): FeedItem {
  return {
    kind: "lab",
    id: entry.id,
    url: entryUrl("lab", entry.id),
    title: entry.data.title,
    date: entry.data.lastTouched,
    lang: entry.data.lang,
    summary: entry.data.intent,
    labStatus: entry.data.status,
    seedKey: seedKey("lab", entry.id),
  };
}

/**
 * Merges writing and lab entries into one feed, sorted descending on
 * `date` (writing) / `lastTouched` (lab).
 */
export function latestFeed(
  writing: WritingFeedInput[],
  lab: LabFeedInput[],
  limit = 8,
): FeedItem[] {
  const items = [...writing.map(writingToFeedItem), ...lab.map(labToFeedItem)];
  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items.slice(0, limit);
}

export interface NavCounts {
  writing: number;
  lab: number;
  radar: number;
}

export interface NavItem {
  label: string;
  href: string;
}

/**
 * Writing and About are always present. Lab and Radar only appear once
 * their collection has at least one visible entry. Fixed order: Writing,
 * Lab, Radar, About.
 */
export function navItems(counts: NavCounts): NavItem[] {
  const items: NavItem[] = [{ label: "Writing", href: "/writing" }];
  if (counts.lab > 0) items.push({ label: "Lab", href: "/lab" });
  if (counts.radar > 0) items.push({ label: "Radar", href: "/radar" });
  items.push({ label: "About", href: "/about" });
  return items;
}
