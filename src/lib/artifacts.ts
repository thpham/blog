/**
 * Links to the artifacts around an article: PoC repositories, demos and
 * slide decks. Pure, so the URL rules are unit-tested.
 */

export interface Link {
  href: string;
  label: string;
}

/** `https://www.example.com/a/` -> `example.com/a`. */
export function displayUrl(url: string): string {
  return url
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

/**
 * A `poc.repo` value is either `owner/name` (on GitHub) or a full URL.
 * GitHub repositories are labelled `owner/name`, anything else by its URL
 * without the scheme.
 */
export function repoLink(repo: string): Link {
  const value = repo.trim();
  if (/^[\w.-]+\/[\w.-]+$/.test(value)) {
    return { href: `https://github.com/${value}`, label: value };
  }
  const shown = displayUrl(value);
  const gh = /^github\.com\/([\w.-]+\/[\w.-]+)/.exec(shown);
  return { href: value, label: gh ? gh[1] : shown };
}

/**
 * The iframe URL of a slide deck, or null when the platform cannot be
 * embedded from its URL alone (the caller then shows a link card).
 *
 * - Speaker Deck: only player URLs (`/player/<id>`). A talk page URL does
 *   not contain the player id, and guessing it would need a network call.
 * - Google Slides: any `/presentation/d/<id>/…` or published
 *   `/presentation/d/e/<id>/pub` URL becomes `…/embed`.
 * - slides.com: `/<user>/<deck>` becomes `/<user>/<deck>/embed`.
 */
export function slidesEmbed(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "speakerdeck.com") {
    return parts[0] === "player" && parts[1] ? `https://speakerdeck.com/player/${parts[1]}` : null;
  }
  if (host === "docs.google.com" && parts[0] === "presentation" && parts[1] === "d") {
    const id = parts[2] === "e" ? `e/${parts[3] ?? ""}` : parts[2];
    return id && !id.endsWith("/") ? `https://docs.google.com/presentation/d/${id}/embed` : null;
  }
  if (host === "slides.com" && parts.length >= 2) {
    return `https://slides.com/${parts[0]}/${parts[1]}/embed`;
  }
  return null;
}
