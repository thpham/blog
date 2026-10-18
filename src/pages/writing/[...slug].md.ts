/**
 * Raw markdown for every published, non-demo article (`writing/<id>.md`,
 * spec §9): the source the article was written in, for tools and LLMs that
 * prefer the markup over the rendered page. The demo content has no purpose
 * beyond the screen, so the endpoint generates nothing for it — and nothing
 * for a draft in any build.
 */
import type { APIContext, GetStaticPaths } from "astro";
import { visibleWriting } from "../../lib/queries";

export const getStaticPaths = (async () => {
  const entries = await visibleWriting();
  // Demo entries serve the screen; a draft ships in no build at all. Both
  // exclusions hold even on the dev server, so a stray draft can never leak
  // into static output under any mode.
  return entries
    .filter((e) => !e.data.demo && e.data.status !== "draft")
    .map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

/** Frontmatter rebuilds itself from the entry's parsed data, in schema order. */
function frontmatter(d: {
  title: string;
  description: string;
  date: Date;
  updated?: Date;
  lang: "en" | "fr";
  topics: { label: string }[];
  horizon: boolean;
  tested?: { name: string; version: string }[];
  verified?: Date;
  sources?: { title: string; url: string }[];
  poc?: { repo?: string; demo?: string; slides?: string };
  related?: { lab?: { id: string }[]; radar?: { id: string }[] };
  translationOf?: { id: string };
}): string {
  const q = (v: string) => JSON.stringify(v);
  const iso = (v: Date) => v.toISOString().slice(0, 10);
  const lines = [
    "---",
    `title: ${q(d.title)}`,
    `description: ${q(d.description)}`,
    `date: ${iso(d.date)}`,
  ];
  if (d.updated) lines.push(`updated: ${iso(d.updated)}`);
  lines.push(`lang: ${d.lang}`);
  if (d.topics.length > 0) lines.push("topics:", ...d.topics.map((t) => `  - ${q(t.label)}`));
  lines.push(`horizon: ${d.horizon}`);
  if (d.tested) {
    lines.push("tested:");
    for (const t of d.tested) {
      lines.push(`  - name: ${q(t.name)}`, `    version: ${q(t.version)}`);
    }
  }
  if (d.verified) lines.push(`verified: ${iso(d.verified)}`);
  if (d.sources) {
    lines.push("sources:");
    for (const s of d.sources) lines.push(`  - title: ${q(s.title)}`, `    url: ${s.url}`);
  }
  if (d.poc) {
    lines.push("poc:");
    if (d.poc.repo) lines.push(`  repo: ${q(d.poc.repo)}`);
    if (d.poc.demo) lines.push(`  demo: ${d.poc.demo}`);
    if (d.poc.slides) lines.push(`  slides: ${d.poc.slides}`);
  }
  // One `related:` key carrying both sub-lists — YAML, like the schema,
  // has a single mapping entry per name.
  const lab = d.related?.lab ?? [];
  const radar = d.related?.radar ?? [];
  if (lab.length > 0 || radar.length > 0) {
    lines.push("related:");
    if (lab.length > 0) lines.push("  lab:", ...lab.map((r) => `    - ${r.id}`));
    if (radar.length > 0) lines.push("  radar:", ...radar.map((r) => `    - ${r.id}`));
  }
  if (d.translationOf) lines.push(`translationOf: ${d.translationOf.id}`);
  lines.push("---", "");
  return lines.join("\n");
}

export function GET({ props }: APIContext) {
  const entry = props.entry as { body?: string; data: Parameters<typeof frontmatter>[0] };
  // `entry.body` is the raw markdown without frontmatter; a leading block is
  // stripped all the same, so the served file can never carry two of them.
  const body = (entry.body ?? "").replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^\n/, "");
  return new Response(`${frontmatter(entry.data)}${body}`, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
