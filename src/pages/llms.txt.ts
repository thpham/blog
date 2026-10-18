/**
 * `llms.txt` (llmstxt.org): the site header — a title line, a summary line
 * and the base URL of every section — followed by link-list sections
 * (`- [title](url): description`): the evergreen site pages first, then the
 * published, non-demo articles per kind.
 */
import { feedEntries, type FeedEntry } from "../lib/feeds";
import { SITE } from "../lib/site";

/**
 * The evergreen pages, always present: llms.txt must never ship without at
 * least one link, even while no entries are published yet. `lab` and `radar`
 * are intentionally absent — their indexes hide while empty (the nav).
 */
function siteSection(): string {
  const page = (path: string, title: string, summary: string) =>
    `- [${title}](${new URL(path, SITE.url).href}): ${summary}`;
  return [
    "## Site",
    "",
    page("/about", "About", `who ${SITE.author} is and how to reach him`),
    page("/colophon", "Colophon", "how the site is built, designed and published"),
    page("/writing", "Writing", "every published article, newest first"),
    page("/rss.xml", "RSS", "the full-text feed of everything published"),
  ].join("\n");
}

/** Sections of the file, in the order the entries list them. */
function sections(entries: FeedEntry[]): string[] {
  const labels = { writing: "Writing", lab: "Lab", radar: "Radar" } as const;
  const out: string[] = [];
  for (const kind of ["writing", "lab", "radar"] as const) {
    const entriesOfKind = entries.filter((e) => e.kind === kind);
    if (entriesOfKind.length === 0) continue;
    out.push(
      [`## ${labels[kind]}`, "", ...entriesOfKind.map((e) => `- [${e.title}](${new URL(e.url, SITE.url).href}): ${e.summary}`)].join(
        "\n",
      ),
    );
  }
  return out;
}

export async function GET() {
  const entries = await feedEntries();
  const file = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    `Base URL: ${SITE.url}`,
    "",
    siteSection(),
    "",
    ...sections(entries),
    "",
  ].join("\n");
  return new Response(file, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
