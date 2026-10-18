/**
 * The global feed (spec §9): every published, non-demo entry of the site,
 * newest first — the source the writing index and the footer link to.
 */
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { feedEntries } from "../lib/feeds";
import { SITE } from "../lib/site";

export async function GET(context: APIContext) {
  const items = await feedEntries();
  return rss({
    title: SITE.name,
    description: "Field notes by Thomas Pham on platforms, connected things and the AI woven through both.",
    site: context.site!,
    items,
    customData: "<generator>ithings</generator>",
  });
}