import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import {
  labSchema,
  radarShape,
  ringMatchesLatestHistory,
  ringMismatchIssue,
  writingSchema,
} from "./content/schemas";
import { idFromPath } from "./lib/ids";

/**
 * When set, demo content (anything under a collection's `demo/` subfolder)
 * is excluded from the sync — used by the `yarn build:nodemo` production
 * check that the site still builds once demo content is deleted.
 */
const NO_DEMO = !!process.env.ITHINGS_NO_DEMO;

function pattern(): string | string[] {
  return NO_DEMO ? ["**/*.{md,mdx}", "!demo/**"] : "**/*.{md,mdx}";
}

function loader(collection: "writing" | "lab" | "radar") {
  return glob({
    base: `./src/content/${collection}`,
    pattern: pattern(),
    generateId: ({ entry }) => idFromPath(entry),
  });
}

const writing = defineCollection({
  loader: loader("writing"),
  schema: writingSchema.extend({
    related: z
      .object({
        lab: z.array(reference("lab")).optional(),
        radar: z.array(reference("radar")).optional(),
      })
      .optional(),
    translationOf: reference("writing").optional(),
  }),
});

const lab = defineCollection({
  loader: loader("lab"),
  schema: labSchema.extend({
    promotedTo: reference("writing").optional(),
  }),
});

const radar = defineCollection({
  loader: loader("radar"),
  // Extend the un-refined shape (overwriting `related`'s string-array
  // fields with `reference()`s), then re-apply the same ring/history
  // integrity check `radarSchema` carries in its pure form.
  schema: radarShape
    .extend({
      related: z
        .object({
          writing: z.array(reference("writing")).optional(),
          lab: z.array(reference("lab")).optional(),
        })
        .optional(),
    })
    .refine(ringMatchesLatestHistory, ringMismatchIssue),
});

export const collections = { writing, lab, radar };
