/**
 * The per-language feed (`/rss/en.xml`, `/rss/fr.xml`): the global feed
 * narrowed to one language — what the writing index's filter pages link to.
 */
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { feedEntries } from "../../lib/feeds";
import { SITE } from "../../lib/site";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "fr" } }] as const;
}

export async function GET(context: APIContext) {
  const { lang } = context.params;
  const items = (await feedEntries()).filter((entry) => entry.lang === lang);
  return rss({
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
    title: `${SITE.name} · ${lang === "fr" ? "FR" : "EN"}`,
    description: SITE.description,
    site: context.site!,
    customData: `<language>${lang}</language><generator>ithings</generator>`,
  });
}
