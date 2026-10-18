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

const INDEX_LEAF = /\/index$/;

/**
 * Derives a collection entry id from a file path relative to the
 * collection's content directory: strips a leading `demo/` segment, the
 * markdown extension, then a trailing `/index` — a folder-entry
 * (`demo/building-this-site/index.mdx` next to its images) talks about the
 * same article as its `demo/building-this-site.mdx` flat form, and the two
 * shapes are interchangeable. A bare `index.md` at the collection root
 * keeps the id `index` (nothing left to strip).
 *
 * `idFromPath('demo/welcome.md')` -> `'welcome'`
 * `idFromPath('nixos/index.mdx')` -> `'nixos'`
 * `idFromPath('nixos/post.md')` -> `'nixos/post'`
 */
export function idFromPath(path: string): string {
  const withoutDemo = path.startsWith(DEMO_PREFIX) ? path.slice(DEMO_PREFIX.length) : path;
  return withoutDemo.replace(CONTENT_EXTENSION, "").replace(INDEX_LEAF, "");
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
