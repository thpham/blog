/**
 * Pure helpers that turn content-collection file paths into stable entry
 * ids, public URLs, and normalized topic slugs. Kept free of Astro imports
 * so they work both inside `content.config.ts` loaders and in plain
 * Vitest unit tests.
 */

export type Collection = "writing" | "lab" | "radar";

const DEMO_PREFIX = "demo/";
const CONTENT_EXTENSION = /\.(md|mdx)$/;
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/**
 * Derives a collection entry id from a file path relative to the
 * collection's content directory: strips a leading `demo/` segment and the
 * markdown extension.
 *
 * `idFromPath('demo/welcome.md')` -> `'welcome'`
 * `idFromPath('nixos/index.mdx')` -> `'nixos/index'`
 */
export function idFromPath(path: string): string {
  const withoutDemo = path.startsWith(DEMO_PREFIX) ? path.slice(DEMO_PREFIX.length) : path;
  return withoutDemo.replace(CONTENT_EXTENSION, "");
}

/** Builds the public URL for a collection entry. */
export function entryUrl(collection: Collection, id: string): string {
  return `/${collection}/${id}`;
}

/**
 * Normalizes a free-form topic label into a URL-safe slug: strips
 * diacritics, lowercases, collapses runs of non-alphanumeric characters
 * into single hyphens, and trims leading/trailing hyphens.
 *
 * `topicSlug('Agents IA & Éthique')` -> `'agents-ia-ethique'`
 * `topicSlug('  NixOS ')` -> `'nixos'`
 */
export function topicSlug(t: string): string {
  return t
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
