/**
 * The home page's sharing image (`/og/home.png`, spec §9): the same card
 * shape as the entries', with the hero of the home page as its title and
 * its own terrain (`home` seed).
 */
import type { APIContext } from "astro";
import { renderOgImage } from "../../lib/og";

/** The home hero's title, plain — it also feeds the OG card. */
export const HERO_TITLE = "Field notes on the systems that quietly run everything.";

export async function GET(_: APIContext) {
  const png = await renderOgImage({
    title: HERO_TITLE,
    lang: "en",
    seedKey: "home",
  });
  return new Response(png as unknown as BodyInit, { headers: { "Content-Type": "image/png" } });
}
