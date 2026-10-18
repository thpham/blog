import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://blog.ithings.ch",
  trailingSlash: "never",
  outDir: process.env.ITHINGS_NO_DEMO ? "dist-nodemo" : "dist",
  build: {
    format: "file",
  },
});
