/**
 * The sharing image of an entry (`/og/<collection>/<id>.png`, spec §9):
 * rendered at build time from the entry's own terrain. OG images serve
 * sharing, so unlike everything else in the demo-exclusion list they are
 * generated for the demo content too — but never for a draft, which ships
 * in no build.
 */
import type { APIContext, GetStaticPaths } from "astro";
import { isVisible } from "../../lib/content";
import { renderOgImage } from "../../lib/og";
import { visibleLab, visibleRadar, visibleWriting } from "../../lib/queries";

export const getStaticPaths = (async () => {
  const prod = import.meta.env.PROD;
  const [writing, lab, radar] = await Promise.all([visibleWriting(), visibleLab(), visibleRadar()]);
  const paths: Array<{ params: { slug: string }; props: { title: string; lang: "en" | "fr"; seedKey: string } }> = [];
  // Writing drafts are skipped everywhere; the other collections carry no
  // draft status today.
  for (const entry of writing) {
    if (!isVisible(entry.data, prod)) continue;
    paths.push({
      params: { slug: `writing/${entry.id}` },
      props: { title: entry.data.title, lang: entry.data.lang, seedKey: `writing/${entry.id}` },
    });
  }
  for (const entry of lab) {
    paths.push({
      params: { slug: `lab/${entry.id}` },
      props: { title: entry.data.title, lang: entry.data.lang, seedKey: `lab/${entry.id}` },
    });
  }
  for (const entry of radar) {
    paths.push({
      params: { slug: `radar/${entry.id}` },
      props: { title: entry.data.name, lang: entry.data.lang, seedKey: `radar/${entry.id}` },
    });
  }
  return paths;
}) satisfies GetStaticPaths;

interface Props {
  title: string;
  lang: "en" | "fr";
  seedKey: string;
}

export async function GET({ props }: APIContext) {
  const { title, lang, seedKey } = props as Props;
  const png = await renderOgImage({ title, lang, seedKey });
  return new Response(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
}