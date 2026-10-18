/**
 * Pure Zod schemas for the writing, lab and radar collections (design spec
 * §6). Kept free of `astro:content` so they stay importable from plain
 * Vitest unit tests. `content.config.ts` extends these with `reference()`
 * for the cross-collection fields (`related`, `translationOf`,
 * `promotedTo`), which are declared here as plain strings / string arrays.
 */
import { z } from "astro/zod";
import { topicSlug } from "../lib/ids";

const langSchema = z.enum(["en", "fr"]);

const testedSchema = z.object({
  name: z.string(),
  version: z.string(),
});

const sourceSchema = z.object({
  title: z.string(),
  url: z.url(),
});

/**
 * PoC artifact links. Ruling: both `writing` and `lab` nest their artifact
 * links here, keeping the top-level `demo` field exclusively the boolean
 * demo-content flag.
 */
const pocSchema = z.object({
  repo: z.string().optional(),
  demo: z.url().optional(),
  slides: z.url().optional(),
});

/** Free-form topic labels, normalized to a {label, slug} pair for display. */
const topicsSchema = z
  .array(z.string())
  .transform((topics) => topics.map((t) => ({ label: t, slug: topicSlug(t) })));

export const writingSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  lang: langSchema,
  topics: topicsSchema,
  horizon: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("published"),
  tested: z.array(testedSchema).optional(),
  verified: z.coerce.date().optional(),
  sources: z.array(sourceSchema).optional(),
  poc: pocSchema.optional(),
  related: z
    .object({
      lab: z.array(z.string()).optional(),
      radar: z.array(z.string()).optional(),
    })
    .optional(),
  translationOf: z.string().optional(),
  aiNote: z.string().optional(),
  demo: z.boolean().default(false),
});

export const labSchema = z.object({
  title: z.string(),
  intent: z.string(),
  lang: langSchema,
  topics: topicsSchema,
  status: z.enum(["exploring", "paused", "concluded", "abandoned"]),
  started: z.coerce.date(),
  lastTouched: z.coerce.date(),
  outcome: z.string().optional(),
  poc: pocSchema.optional(),
  promotedTo: z.string().optional(),
  demo: z.boolean().default(false),
});

const historyEntrySchema = z.object({
  date: z.coerce.date(),
  ring: z.enum(["adopt", "trial", "assess", "hold"]),
  note: z.string().optional(),
});

/** The ring of the most recent (by date) history entry. */
function latestHistoryRing(history: { date: Date; ring: string }[]): string {
  return [...history].sort((a, b) => b.date.getTime() - a.date.getTime())[0].ring;
}

/** `ring` must equal the ring of the most recent `history` entry. */
export function ringMatchesLatestHistory(data: {
  ring: string;
  history: { date: Date; ring: string }[];
}): boolean {
  // An empty history is already rejected by `history.min(1)`; don't also
  // throw here while that separate check reports it.
  if (data.history.length === 0) return true;
  return data.ring === latestHistoryRing(data.history);
}

/** Shared issue options for the `ringMatchesLatestHistory` refinement. */
export const ringMismatchIssue: { message: string; path: string[] } = {
  message: "ring must match the ring of the most recent history entry",
  path: ["ring"],
};

/**
 * Un-refined radar shape, exported so `content.config.ts` can `.extend()`
 * it with `reference()`-typed fields (not possible on `radarSchema`
 * itself: Zod forbids overwriting keys on an object that already carries
 * a `.refine()`) and then re-apply `ringMatchesLatestHistory`.
 */
export const radarShape = z.object({
  name: z.string(),
  lang: langSchema,
  quadrant: z.enum(["platform-cloud", "ai-agents", "connected-edge", "tools-practices"]),
  ring: z.enum(["adopt", "trial", "assess", "hold"]),
  history: z.array(historyEntrySchema).min(1),
  related: z
    .object({
      writing: z.array(z.string()).optional(),
      lab: z.array(z.string()).optional(),
    })
    .optional(),
  demo: z.boolean().default(false),
});

export const radarSchema = radarShape.refine(ringMatchesLatestHistory, ringMismatchIssue);
