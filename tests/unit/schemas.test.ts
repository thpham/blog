import { describe, expect, it } from "vitest";
import { labSchema, radarSchema, writingSchema } from "../../src/content/schemas";

describe("writingSchema", () => {
  it("rejects an invalid lang", () => {
    const result = writingSchema.safeParse({
      title: "Title",
      description: "Description",
      date: "2024-01-01",
      lang: "de",
      topics: [],
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults to a minimal valid entry", () => {
    const result = writingSchema.parse({
      title: "Title",
      description: "Description",
      date: "2024-01-01",
      lang: "en",
      topics: [],
    });
    expect(result.status).toBe("published");
    expect(result.demo).toBe(false);
  });

  it("normalizes topics into label/slug pairs", () => {
    const result = writingSchema.parse({
      title: "Title",
      description: "Description",
      date: "2024-01-01",
      lang: "en",
      topics: ["NixOS", "Agents IA & Éthique"],
    });
    expect(result.topics).toEqual([
      { label: "NixOS", slug: "nixos" },
      { label: "Agents IA & Éthique", slug: "agents-ia-ethique" },
    ]);
  });
});

describe("labSchema", () => {
  it("rejects an invalid status", () => {
    const result = labSchema.safeParse({
      title: "Title",
      intent: "Intent",
      lang: "en",
      topics: [],
      status: "done",
      started: "2024-01-01",
      lastTouched: "2024-01-02",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid entry and defaults demo to false", () => {
    const result = labSchema.parse({
      title: "Title",
      intent: "Intent",
      lang: "en",
      topics: [],
      status: "exploring",
      started: "2024-01-01",
      lastTouched: "2024-01-02",
    });
    expect(result.demo).toBe(false);
  });
});

describe("radarSchema", () => {
  const baseEntry = {
    name: "NixOS",
    lang: "en" as const,
    quadrant: "platform-cloud" as const,
    ring: "trial" as const,
    history: [{ date: "2024-01-01", ring: "trial" as const }],
  };

  it("rejects an empty history", () => {
    const result = radarSchema.safeParse({ ...baseEntry, history: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a ring that does not match the most recent history entry", () => {
    const result = radarSchema.safeParse({
      ...baseEntry,
      ring: "adopt",
      history: [
        { date: "2024-01-01", ring: "assess" },
        { date: "2024-03-01", ring: "trial" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a ring that matches the most recent history entry", () => {
    const result = radarSchema.safeParse({
      ...baseEntry,
      ring: "trial",
      history: [
        { date: "2024-01-01", ring: "assess" },
        { date: "2024-03-01", ring: "trial" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
