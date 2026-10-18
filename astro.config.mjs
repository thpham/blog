import { defineConfig, fontProviders } from "astro/config";

const fontsource = fontProviders.fontsource();

export default defineConfig({
  site: "https://blog.ithings.ch",
  trailingSlash: "never",
  outDir: process.env.ITHINGS_NO_DEMO ? "dist-nodemo" : "dist",
  build: {
    format: "file",
  },
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
