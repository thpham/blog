import { describe, expect, it } from "vitest";
import { renderOgImage } from "../../src/lib/og";

/** PNG header check: the 8-byte signature plus the IHDR width/height. */
function readPngSize(png: Uint8Array): [number, number] {
  expect([...png.slice(0, 4)]).toEqual([137, 80, 78, 71]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}

describe("renderOgImage", () => {
  it("renders a 1200×630 PNG", async () => {
    const png = await renderOgImage({
      title: "Field notes from a build",
      lang: "en",
      seedKey: "writing/welcome",
    });
    expect(readPngSize(png)).toEqual([1200, 630]);
  });

  it("deterministically varies the relief with the seed key", async () => {
    const a = await renderOgImage({ title: "Same title", lang: "en", seedKey: "writing/welcome" });
    const b = await renderOgImage({ title: "Same title", lang: "en", seedKey: "lab/nixos" });
    expect([...a]).not.toEqual([...b]);
    const again = await renderOgImage({ title: "Same title", lang: "en", seedKey: "writing/welcome" });
    expect([...again]).toEqual([...a]);
  });

  it("renders accented titles in the serif face", async () => {
    const png = await renderOgImage({
      title: "Territoire de l'IoT — notes d'école",
      lang: "fr",
      seedKey: "writing/horizon-notes",
    });
    expect(readPngSize(png)).toEqual([1200, 630]);
  });
});