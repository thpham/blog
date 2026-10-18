import { describe, expect, it } from "vitest";
import { personJsonLd, postingJsonLd } from "../../src/lib/seo";
import { SOCIAL_URLS, SITE } from "../../src/lib/site";

describe("personJsonLd", () => {
  const person = personJsonLd() as Record<string, unknown>;

  it("types a schema.org Person with the exact canonical name", () => {
    expect(person["@type"]).toBe("Person");
    expect(person["name"]).toBe("Thomas Pham");
  });

  it("places the person in Lausanne", () => {
    expect(person["address"]).toEqual({ addressLocality: "Lausanne" });
  });

  it("lists the three profiles in sameAs", () => {
    expect(person["sameAs"]).toEqual([SOCIAL_URLS.github, SOCIAL_URLS.linkedin, SOCIAL_URLS.x]);
  });

  it("asserts fields of real knowledge, never a claimed title (user-mandated)", () => {
    expect(person["jobTitle"]).toBeUndefined();
    expect(person["worksFor"]).toBeUndefined();
    const knowsAbout = person["knowsAbout"] as unknown[];
    expect(Array.isArray(knowsAbout)).toBe(true);
    expect(knowsAbout.length).toBeGreaterThan(0);
    expect(knowsAbout.every((k) => typeof k === "string")).toBe(true);
  });

  it("carries the schema.org context and the site url", () => {
    expect(person["@context"]).toBe("https://schema.org");
    expect(person["url"]).toBe(SITE.url);
  });
});

describe("postingJsonLd", () => {
  const posting = postingJsonLd({
    id: "horizon-notes",
    data: {
      title: "Notes depuis l'horizon",
      description: "Une note de test.",
      date: new Date("2026-01-15T00:00:00Z"),
      updated: new Date("2026-02-01T00:00:00Z"),
      lang: "fr",
    },
  }) as Record<string, unknown>;

  it("types a BlogPosting with the headline and the description", () => {
    expect(posting["@type"]).toBe("BlogPosting");
    expect(posting["headline"]).toBe("Notes depuis l'horizon");
    expect(posting["description"]).toBe("Une note de test.");
  });

  it("dates publication and modification in ISO", () => {
    expect(posting["datePublished"]).toBe("2026-01-15");
    expect(posting["dateModified"]).toBe("2026-02-01");
  });

  it("declares the entry language", () => {
    expect(posting["inLanguage"]).toBe("fr");
  });

  it("names the author and states no employer (user-mandated)", () => {
    const author = posting["author"] as Record<string, unknown>;
    expect(author["name"]).toBe("Thomas Pham");
    expect(author["worksFor"]).toBeUndefined();
  });

  it("points to the entry's OG image and its page", () => {
    expect(posting["image"]).toBe(`${SITE.url}/og/writing/horizon-notes.png`);
    expect(posting["mainEntityOfPage"]).toBe(`${SITE.url}/writing/horizon-notes`);
  });
});
