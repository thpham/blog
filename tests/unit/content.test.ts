import { describe, expect, it } from "vitest";
import { entryUrl, idFromPath, topicSlug } from "../../src/lib/ids";
import { isVisible, latestFeed, navItems, readingTime } from "../../src/lib/content";

describe("idFromPath", () => {
  it("strips the demo/ prefix and the extension", () => {
    expect(idFromPath("demo/welcome.md")).toBe("welcome");
  });

  it("keeps nested segments outside demo/", () => {
    expect(idFromPath("nixos/index.mdx")).toBe("nixos/index");
  });
});

describe("entryUrl", () => {
  it("builds a collection url", () => {
    expect(entryUrl("writing", "welcome")).toBe("/writing/welcome");
    expect(entryUrl("lab", "foo")).toBe("/lab/foo");
    expect(entryUrl("radar", "bar")).toBe("/radar/bar");
  });
});

describe("isVisible", () => {
  it("hides drafts in production", () => {
    expect(isVisible({ status: "draft" }, true)).toBe(false);
  });

  it("shows drafts outside production", () => {
    expect(isVisible({ status: "draft" }, false)).toBe(true);
  });

  it("always shows published entries", () => {
    expect(isVisible({ status: "published" }, true)).toBe(true);
    expect(isVisible({}, true)).toBe(true);
  });
});

describe("readingTime", () => {
  it("rounds up to the nearest minute, minimum 1", () => {
    expect(readingTime("mot ".repeat(441))).toBe(3);
    expect(readingTime("one two three")).toBe(1);
  });
});

describe("topicSlug", () => {
  it("slugifies accents and punctuation", () => {
    expect(topicSlug("Agents IA & Éthique")).toBe("agents-ia-ethique");
  });

  it("trims and lowercases", () => {
    expect(topicSlug("  NixOS ")).toBe("nixos");
  });
});

describe("latestFeed", () => {
  it("merges writing and lab entries, sorted by date descending with the correct kind", () => {
    const writing = [
      {
        id: "older",
        data: {
          title: "Older",
          description: "d1",
          date: new Date("2024-01-01"),
          lang: "en" as const,
        },
        body: "word ".repeat(10),
      },
      {
        id: "newest",
        data: {
          title: "Newest",
          description: "d2",
          date: new Date("2024-06-01"),
          lang: "en" as const,
        },
        body: "word ".repeat(10),
      },
    ];
    const lab = [
      {
        id: "exploring-thing",
        data: {
          title: "Exploring",
          intent: "why",
          lang: "en" as const,
          status: "exploring",
          lastTouched: new Date("2024-03-01"),
        },
      },
    ];

    const feed = latestFeed(writing, lab);
    expect(feed.map((item) => item.id)).toEqual(["newest", "exploring-thing", "older"]);
    expect(feed.map((item) => item.kind)).toEqual(["writing", "lab", "writing"]);
    expect(feed[0].readingTime).toBeGreaterThanOrEqual(1);
    expect(feed[1].readingTime).toBeUndefined();
  });

  it("limits the number of returned items", () => {
    const writing = Array.from({ length: 10 }, (_, i) => ({
      id: `post-${i}`,
      data: {
        title: `Post ${i}`,
        description: "d",
        date: new Date(2024, 0, i + 1),
        lang: "en" as const,
      },
      body: "word",
    }));
    expect(latestFeed(writing, [], 3)).toHaveLength(3);
  });
});

describe("navItems", () => {
  it("hides lab when empty and keeps the fixed order", () => {
    expect(navItems({ writing: 1, lab: 0, radar: 2 }).map((i) => i.label)).toEqual([
      "Writing",
      "Radar",
      "About",
    ]);
  });

  it("keeps writing and about when everything else is empty", () => {
    expect(navItems({ writing: 0, lab: 0, radar: 0 }).map((i) => i.label)).toEqual([
      "Writing",
      "About",
    ]);
  });

  it("shows all sections when all counts are positive", () => {
    expect(navItems({ writing: 1, lab: 1, radar: 1 }).map((i) => i.label)).toEqual([
      "Writing",
      "Lab",
      "Radar",
      "About",
    ]);
    expect(navItems({ writing: 1, lab: 1, radar: 1 }).map((i) => i.href)).toEqual([
      "/writing",
      "/lab",
      "/radar",
      "/about",
    ]);
  });
});
