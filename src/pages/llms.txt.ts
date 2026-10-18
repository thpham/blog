/**
 * `llms.txt` (llmstxt.org): the site header — a title line, a summary line
 * and the base URL of every section — followed by the published, non-demo
 * articles as a link list (`- [title](url): description`).
 */
import { feedEntries, type FeedEntry } from "../lib/feeds";
import { SITE } from "../lib/site";

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
    `> Field notes by Thomas Pham on platforms, connected things and the AI woven through both. Articles are written in English or in French, from Lausanne.`,
    "",
    `Base URL: ${SITE.url}`,
    "",
    ...sections(entries),
    "",
  ].join("\n");
  return new Response(file, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
