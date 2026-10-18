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
    // @astrojs/rss consumes { link, pubDate, description } and silently
    // drops unknown keys, so our FeedEntry shape maps onto it here.
    // trailingSlash: false — the site serves extensionless files from GitHub
    // Pages, so a slashed URL would 404; match the sitemap and canonical tags.
    trailingSlash: false,
    items: items.map(({ url, title, date, summary }) => ({
      link: url,
      title,
      pubDate: date,
      description: summary,
    })),
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    customData: "<generator>ithings</generator>",
  });
}
