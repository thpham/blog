import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "iThings Blog",
  tagline: "Cloud of many Things",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://blog.ithings.ch",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "thpham", // Usually your GitHub org/user name.
  projectName: "blog", // Usually your repo name.
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  onBrokenLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        // Docs/Notes section disabled until content is ready
        // docs: {
        //   path: "docs/notes",
        //   routeBasePath: "/notes",
        //   sidebarPath: "./sidebars.ts",
        // },
        docs: false,
        pages: {
          routeBasePath: "/",
          include: ["**/*.md", "**/*.mdx", "**/*.tsx"],
        },
        blog: {
          routeBasePath: "/blog",
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
        gtag: {
          trackingID: "G-XC40J3CMRB",
          anonymizeIP: false,
        },
        googleTagManager: {
          containerId: "GTM-WNKR52MW",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "iThings Blog",
      logo: {
        alt: "iThings Blog",
        src: "img/logo.png",
      },
      items: [
        { to: "/blog", label: "Posts", position: "left" },
        // Notes section hidden until content is ready
        // {
        //   type: "docSidebar",
        //   sidebarId: "notesSidebar",
        //   position: "left",
        //   label: "Notes",
        // },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Resources",
          items: [
            {
              label: "About",
              to: "/about",
            },
          ],
        },
        {
          title: "Connect",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/thpham",
            },
            {
              label: "LinkedIn",
              href: "https://www.linkedin.com/in/thpham/",
            },
            {
              label: "X",
              href: "https://x.com/ithingsch",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} iThings.ch - All rights reserved.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ["bash", "hcl", "yaml"],
    },
    liveCodeBlock: {
      /**
       * The position of the live playground, above or under the editor
       * Possible values: "top" | "bottom"
       */
      playgroundPosition: "bottom",
    },
  } satisfies Preset.ThemeConfig,

  headTags: [
    {
      tagName: "meta",
      attributes: {
        name: "description",
        content:
          "Welcome to iThings.ch Blog - Your go-to source for tech tutorials and insights.",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "keywords",
        content:
          "tech tutorials insights, programming, software development, cloud computing, architecture, iot, iThings.ch",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "author",
        content: "Thomas-Kim Pham",
      },
    },
    {
      tagName: "meta",
      attributes: {
        name: "robots",
        content: "index, follow",
      },
    },
  ],

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  themes: [
    "@docusaurus/theme-mermaid",
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        indexBlog: false,
        indexDocs: false, // Disabled until docs content is ready
        // docsRouteBasePath: "/notes",
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        language: ["en"],
      },
    ],
  ],
};

export default config;
