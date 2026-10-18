/** Site-wide identity. Single source for names, handles and URLs. */
export const SITE = {
  name: "ithings",
  author: "Thomas Pham",
  url: "https://blog.ithings.ch",
  city: "Lausanne",
  /**
   * The site's one positioning sentence, as Thomas wrote it verbatim.
   * Anything that describes the site — meta description, feed channels,
   * llms.txt — reads from here instead of re-wording it.
   */
  description:
    "Field notes by Thomas Pham on platforms, from cloud infrastructure to the AI software factory and pervasive computing. Articles in English or French, written from Lausanne, Switzerland.",
  socials: { github: "thpham", linkedin: "thpham", x: "ithingsch" },
  GOATCOUNTER_CODE: "",
} as const;

/** Profile URLs derived from `SITE.socials`. */
export const SOCIAL_URLS = {
  github: `https://github.com/${SITE.socials.github}`,
  linkedin: `https://www.linkedin.com/in/${SITE.socials.linkedin}`,
  x: `https://x.com/${SITE.socials.x}`,
} as const;
