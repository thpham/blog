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
    title: `${SITE.name} · ${lang === "fr" ? "FR" : "EN"}`,
    description: "Field notes by Thomas Pham on platforms, connected things and the AI woven through both.",
    site: context.site!,
    items,
    customData: `<language>${lang}</language><generator>ithings</generator>`,
  });
}