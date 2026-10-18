/**
 * The Docusaurus-compat global feed (`/blog/rss.xml`): the old URLs of the
 * previous site stay alive, shaped like the global feed (spec §9).
 */
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { feedEntries } from "../../lib/feeds";
import { SITE } from "../../lib/site";

export async function GET(context: APIContext) {
  const items = await feedEntries();
  return rss({
    title: `${SITE.name} (blog)`,
    description: "Field notes by Thomas Pham on platforms, connected things and the AI woven through both.",
    site: context.site!,
    // @astrojs/rss consumes { link, pubDate, description } and silently
    // drops unknown keys, so our FeedEntry shape maps onto it here.
    // trailingSlash: false — the site serves extensionless files, so a
    // slashed URL would 404; match the sitemap and canonical tags.
    trailingSlash: false,
    items: items.map(({ url, title, date, summary }) => ({
      link: url,
      title,
      pubDate: date,
      description: summary,
    })),
  });
}
