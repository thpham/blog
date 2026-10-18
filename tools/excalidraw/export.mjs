#!/usr/bin/env node
/**
 * Exports every Excalidraw scene of the site to two SVGs, light and dark.
 *
 *   node tools/excalidraw/export.mjs [--force]
 *
 * For each src/content/**\/<name>.excalidraw it writes, beside the source,
 * <name>.excalidraw.light.svg and <name>.excalidraw.dark.svg (ignored by
 * Git, rebuilt by `yarn dev` and `yarn build`). Exports newer than their
 * scene, the tokens and this tooling are kept, unless --force.
 *
 * Method (spec §13 leaves it open): Excalidraw's own exporter,
 * `exportToSvg` from @excalidraw/utils, run in a headless Chromium driven by
 * Playwright, so the drawing comes out exactly as in the editor (rough.js
 * strokes, the Excalifont hand-drawn face, text layout). Two choices on top:
 *
 * - Colours. Excalidraw's dark mode is a CSS `invert() hue-rotate()` filter
 *   that lands off-palette. Instead each element is recoloured per theme to
 *   the site tokens (src/lib/palette.ts, `sceneColor`) and exported in light
 *   mode on the theme's --bg.
 * - Network. The page and the exporter bundle are served from memory to a
 *   reserved origin; any other request is refused and fails the export. The
 *   fonts ship inside the bundle and Excalidraw inlines the subset it uses
 *   as a data: URL, so the SVGs reference nothing external at page load
 *   either (checked below).
 *
 * Chromium: Playwright's own, or the binary named by ITHINGS_CHROMIUM (for
 * hosts where Playwright's build cannot run, such as NixOS; CI uses
 * Playwright's own browser).
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { readThemePalettes, sceneColor } from "../../src/lib/palette.ts";

const root = new URL("../../", import.meta.url);
const rootPath = fileURLToPath(root);
const contentDir = fileURLToPath(new URL("src/content/", root));
const THEMES = /** @type {const} */ (["light", "dark"]);
const ORIGIN = "http://excalidraw.invalid";
const PADDING = 24;

/** Files whose change makes every export stale. */
const TOOLING = [
  fileURLToPath(import.meta.url),
  fileURLToPath(new URL("src/lib/palette.ts", root)),
  fileURLToPath(new URL("src/styles/tokens.css", root)),
];

/** @param {string} dir @returns {Promise<string[]>} */
async function findScenes(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".excalidraw"))
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

/** @param {string} file */
const outputs = (file) => THEMES.map((t) => `${file}.${t}.svg`);

/** @param {string} file */
async function mtime(file) {
  try {
    return (await stat(file)).mtimeMs;
  } catch {
    return -1;
  }
}

/** @param {string} file @param {number} toolingTime */
async function isFresh(file, toolingTime) {
  const newest = Math.max(await mtime(file), toolingTime);
  const times = await Promise.all(outputs(file).map(mtime));
  return times.every((t) => t >= newest);
}

/**
 * The scene's elements recoloured to one palette.
 * @param {{ elements?: any[] }} scene
 * @param {import("../../src/lib/palette.ts").Palette} palette
 */
export function themedElements(scene, palette) {
  return (scene.elements ?? [])
    .filter((el) => !el.isDeleted)
    .map((el) => ({
      ...el,
      strokeColor: sceneColor(el.strokeColor ?? "#1e1e1e", "stroke", palette),
      backgroundColor: sceneColor(el.backgroundColor ?? "transparent", "fill", palette),
    }));
}

/**
 * URLs a browser would fetch or follow from SVG markup (XML namespace
 * declarations are names, not fetched).
 * @param {string} svg
 */
export function externalRefs(svg) {
  return [...svg.matchAll(/(?:href|src)\s*=\s*["']\s*(https?:[^"']*)|url\(\s*["']?(https?:[^)"']*)/gi)].map(
    (m) => m[1] ?? m[2],
  );
}

/** @param {import("playwright").BrowserContext} context @param {Buffer} bundle */
async function serveExporter(context, bundle) {
  /** @type {string[]} */
  const refused = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url === `${ORIGIN}/`) {
      return route.fulfill({ contentType: "text/html", body: "<!doctype html><meta charset=utf-8><title>export</title>" });
    }
    if (url === `${ORIGIN}/excalidraw-utils.js`) {
      return route.fulfill({ contentType: "text/javascript", body: bundle });
    }
    refused.push(url);
    return route.abort("blockedbyclient");
  });
  return refused;
}

/**
 * @param {import("playwright").Page} page
 * @param {any[]} elements
 * @param {any} files
 * @param {string} background
 * @returns {Promise<string>}
 */
function exportSvg(page, elements, files, background) {
  return page.evaluate(
    async ({ elements, files, background, padding, origin }) => {
      /** @type {any} */
      const utils = await import(`${origin}/excalidraw-utils.js`);
      const svg = await utils.exportToSvg({
        data: {
          elements,
          files,
          appState: { exportBackground: true, viewBackgroundColor: background, exportWithDarkMode: false },
        },
        config: { padding },
      });
      return svg.outerHTML;
    },
    { elements, files, background, padding: PADDING, origin: ORIGIN },
  );
}

async function main() {
  const force = process.argv.includes("--force");
  const scenes = await findScenes(contentDir);
  const toolingTime = Math.max(...(await Promise.all(TOOLING.map(mtime))));
  const stale = [];
  for (const file of scenes) if (force || !(await isFresh(file, toolingTime))) stale.push(file);
  if (stale.length === 0) {
    if (scenes.length) console.log(`excalidraw: ${scenes.length} scene(s) up to date`);
    return;
  }

  const palettes = readThemePalettes(root);
  const bundle = await readFile(createRequire(import.meta.url).resolve("@excalidraw/utils"));
  // ITHINGS_CHROMIUM overrides the browser path (NixOS dev machines; CI uses
  // Playwright's own browser). Unset, this is the default launch.
  const executablePath = process.env.ITHINGS_CHROMIUM || undefined;
  const browser = await chromium.launch({ executablePath });
  try {
    const context = await browser.newContext();
    const refused = await serveExporter(context, bundle);
    const page = await context.newPage();
    /** @type {Error[]} */
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e));
    await page.goto(`${ORIGIN}/`);

    for (const file of stale) {
      const name = relative(rootPath, file);
      let scene;
      try {
        scene = JSON.parse(await readFile(file, "utf-8"));
      } catch (e) {
        throw new Error(`${name}: not a valid Excalidraw JSON file (${/** @type {Error} */ (e).message})`);
      }
      if (scene.type !== "excalidraw") throw new Error(`${name}: not an Excalidraw scene (type: ${scene.type})`);

      for (const theme of THEMES) {
        const palette = palettes[theme];
        const svg = await exportSvg(page, themedElements(scene, palette), scene.files ?? {}, palette.bg);
        if (pageErrors.length) throw new Error(`${name} (${theme}): ${pageErrors[0].message}`);
        if (refused.length) throw new Error(`${name} (${theme}): the exporter tried to fetch ${refused.join(", ")}`);
        const external = externalRefs(svg);
        if (external.length) throw new Error(`${name} (${theme}): the SVG references ${external.join(", ")}`);
        await writeFile(`${file}.${theme}.svg`, `${svg}\n`);
      }
    }
  } finally {
    await browser.close();
  }
  const fresh = scenes.length - stale.length;
  console.log(`excalidraw: exported ${stale.length} scene(s) to light and dark SVG${fresh ? `, ${fresh} up to date` : ""}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`excalidraw: ${e.message}`);
    process.exitCode = 1;
  });
}
