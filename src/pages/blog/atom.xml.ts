/**
 * The Docusaurus-compat Atom feed (`/blog/atom.xml`): the old URLs of the
 * previous site stay alive, shaped like a minimal Atom 1.0 feed carrying the
 * same demo-free entries as the RSS feeds (spec §9).
 */
import type { APIContext } from "astro";
import { feedEntries } from "../../lib/feeds";
import { SITE } from "../../lib/site";

/** Escapes a text node for XML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Atom dates carry the time; every content date parses as UTC midnight, so
 * the feed is built in UTC and no local time leaks in.
 */
function atomDate(date: Date): string {
  return date.toISOString();
}

export async function GET(context: APIContext) {
  const site = context.site!;
  const items = await feedEntries();
  const updated = items[0]?.date ?? new Date(0);
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(SITE.name)}</title>
  <subtitle>${esc("Field notes by Thomas Pham on platforms, connected things and the AI woven through both.")}</subtitle>
  <id>${site.href}</id>
  <link rel="alternate" href="${site.href}"/>
  <link rel="self" href="${new URL("/blog/atom.xml", site).href}"/>
  <updated>${atomDate(updated)}</updated>
  <author><name>${esc(SITE.author)}</name></author>
${items
  .map(
    (item) => `  <entry>
    <title>${esc(item.title)}</title>
    <link rel="alternate" href="${esc(new URL(item.url, site).href)}"/>
    <id>${esc(new URL(item.url, site).href)}</id>
    <published>${atomDate(item.date)}</published>
    <updated>${atomDate(item.date)}</updated>
    <summary>${esc(item.summary)}</summary>
  </entry>`,
  )
  .join("\n")}
</feed>
`;
  return new Response(xml, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } });
}