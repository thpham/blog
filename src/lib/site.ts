/** Site-wide identity. Single source for names, handles and URLs. */
export const SITE = {
  name: "ithings",
  author: "Thomas Pham",
  url: "https://blog.ithings.ch",
  city: "Lausanne",
  socials: { github: "thpham", linkedin: "thpham", x: "ithingsch" },
  GOATCOUNTER_CODE: "",
} as const;

/** Profile URLs derived from `SITE.socials`. */
export const SOCIAL_URLS = {
  github: `https://github.com/${SITE.socials.github}`,
  linkedin: `https://www.linkedin.com/in/${SITE.socials.linkedin}`,
  x: `https://x.com/${SITE.socials.x}`,
} as const;
