import mdx from "@astrojs/mdx";
import { defineConfig, fontProviders } from "astro/config";
import expressiveCode from "astro-expressive-code";
import { fileURLToPath } from "node:url";
import { demoUrls } from "./src/lib/demo";
import { diagrams } from "./src/plugins/diagrams";

const fontsource = fontProviders.fontsource();
const sitemap = (await import("@astrojs/sitemap")).default;

// The demo entries are invisible to machines (spec §9): never in the
// sitemap. The filter reads the on-disk demo convention, the same source
// the exclusions of the feeds and llms.txt use.
const demo = demoUrls(fileURLToPath(new URL("./src/content", import.meta.url)));

export default defineConfig({
  site: "https://blog.ithings.ch",
  trailingSlash: "never",
  outDir: process.env.ITHINGS_NO_DEMO ? "dist-nodemo" : "dist",
  build: {
    format: "file",
  },
  // Expressive Code must come before MDX so it also handles code in .mdx
  // files. Its options live in ec.config.mjs. `diagrams` renders Mermaid
  // and resolves Excalidraw sources at build time, ahead of Expressive Code
  // (src/plugins/diagrams.ts).
  integrations: [diagrams(), expressiveCode(), mdx(), sitemap({ filter: (page) => !demo.has(new URL(page).pathname) })],
  // Self-hosted at build time: files are downloaded from Fontsource and
  // served from /_astro/fonts, nothing is requested from a font CDN at runtime.
  fonts: [
    // Newsreader ships as a variable font with an optical-size axis: thin
    // display titles use the display cut, list titles the text cut, as in
    // the approved mockup. The file covers weights 300, 400 and 500.
    {
      provider: fontsource,
      name: "Newsreader",
      cssVariable: "--font-serif",
      weights: ["300 500"],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["Georgia", "serif"],
    },
    {
      provider: fontsource,
      name: "Instrument Sans",
      cssVariable: "--font-sans",
      weights: [400, 500, 600],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      provider: fontsource,
      name: "IBM Plex Mono",
      cssVariable: "--font-mono",
      weights: [400, 500],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["ui-monospace", "monospace"],
    },
  ],
});
