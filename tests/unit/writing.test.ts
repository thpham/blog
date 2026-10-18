import { describe, expect, it } from "vitest";
import { isoDate, monthYear } from "../../src/lib/format";
import { displayUrl, repoLink, slidesEmbed } from "../../src/lib/artifacts";
import { byDateDesc, topicIndex } from "../../src/lib/writing";

describe("isoDate", () => {
  it("formats as YYYY-MM-DD in UTC, as content dates are parsed", () => {
    expect(isoDate(new Date("2024-12-18"))).toBe("2024-12-18");
    expect(isoDate(new Date("2026-01-05T23:30:00Z"))).toBe("2026-01-05");
  });
});

describe("monthYear", () => {
  it("formats as 'Mon YYYY' in English, in UTC", () => {
    expect(monthYear(new Date("2026-10-01"))).toBe("Oct 2026");
    expect(monthYear(new Date("2026-01-31T23:59:00Z"))).toBe("Jan 2026");
  });
});

describe("repoLink", () => {
  it("expands owner/name to GitHub", () => {
    expect(repoLink("thpham/blog")).toEqual({ href: "https://github.com/thpham/blog", label: "thpham/blog" });
  });

  it("keeps a full GitHub URL and labels it owner/name", () => {
    expect(repoLink("https://github.com/thpham/blog/")).toEqual({
      href: "https://github.com/thpham/blog/",
      label: "thpham/blog",
    });
  });

  it("keeps any other URL and labels it without the scheme", () => {
    expect(repoLink("https://codeberg.org/thpham/x")).toEqual({
      href: "https://codeberg.org/thpham/x",
      label: "codeberg.org/thpham/x",
    });
  });
});

describe("displayUrl", () => {
  it("drops the scheme, www and a trailing slash", () => {
    expect(displayUrl("https://www.example.com/a/b/")).toBe("example.com/a/b");
    expect(displayUrl("https://example.com")).toBe("example.com");
  });
});

describe("slidesEmbed", () => {
  it("embeds a Speaker Deck player URL as is", () => {
    expect(slidesEmbed("https://speakerdeck.com/player/0123abcd")).toBe(
      "https://speakerdeck.com/player/0123abcd",
    );
  });

  it("does not guess the player id of a Speaker Deck talk page", () => {
    expect(slidesEmbed("https://speakerdeck.com/thpham/some-talk")).toBeNull();
  });

  it("turns any Google Slides URL into its /embed URL", () => {
    expect(slidesEmbed("https://docs.google.com/presentation/d/AbC_1-x/edit#slide=id.p")).toBe(
      "https://docs.google.com/presentation/d/AbC_1-x/embed",
    );
    expect(slidesEmbed("https://docs.google.com/presentation/d/e/2PACX-1v/pub?start=false")).toBe(
      "https://docs.google.com/presentation/d/e/2PACX-1v/embed",
    );
  });

  it("turns a slides.com deck into its /embed URL", () => {
    expect(slidesEmbed("https://slides.com/thpham/deck")).toBe("https://slides.com/thpham/deck/embed");
    expect(slidesEmbed("https://slides.com/thpham/deck/embed")).toBe("https://slides.com/thpham/deck/embed");
  });

  it("returns null for anything else", () => {
    expect(slidesEmbed("https://example.com/talk.pdf")).toBeNull();
    expect(slidesEmbed("not a url")).toBeNull();
  });
});

const entry = (id: string, date: string, topics: string[]) => ({
  id,
  data: { date: new Date(date), topics: topics.map((t) => ({ label: t, slug: t.toLowerCase() })) },
});

describe("byDateDesc", () => {
  it("sorts newest first and breaks ties by id", () => {
    const sorted = [entry("b", "2025-01-01", []), entry("c", "2026-01-01", []), entry("a", "2025-01-01", [])]
      .sort(byDateDesc)
      .map((e) => e.id);
    expect(sorted).toEqual(["c", "a", "b"]);
  });
});

describe("topicIndex", () => {
  it("counts entries per slug, most used first, then by label", () => {
    const index = topicIndex([
      entry("a", "2025-01-01", ["NixOS", "Cloud"]),
      entry("b", "2025-01-02", ["Cloud"]),
      entry("c", "2025-01-03", ["Agents"]),
    ]);
    expect(index).toEqual([
      { slug: "cloud", label: "Cloud", count: 2 },
      { slug: "agents", label: "Agents", count: 1 },
      { slug: "nixos", label: "NixOS", count: 1 },
    ]);
  });

  it("is empty without entries", () => {
    expect(topicIndex([])).toEqual([]);
  });
});
