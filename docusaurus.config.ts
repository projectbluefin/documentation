import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Bluefin Docs",
  tagline: "Bluefin Documentation Resources",
  favicon: "img/favicon.ico",

  url: "https://docs.projectbluefin.io/",
  baseUrl: "/",

  // GitHub pages deployment config.
  organizationName: "ublue-os",
  projectName: "bluefin",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Disables the landing page
          routeBasePath: "/",
          // FIXME: Change this into the proper URL
          editUrl:
            "https://github.com/ublue-os/bluefin-docs/tree/main/packages/create-docusaurus/templates/shared/",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    algolia: {
      // FIXME: put the info here
      // The application ID provided by Algolia
      appId: "YOUR_APP_ID",
      // Public API key: it is safe to commit it
      apiKey: "YOUR_SEARCH_API_KEY",
      indexName: "YOUR_INDEX_NAME",
      contextualSearch: true,
      searchPagePath: "search",
    },

    metadata: [
      { name: "keywords", content: "documentation,bluefin,universalblue" },
      { name: "twitter:card", content: "summary_large_image" },
    ],

    // Social card that shows up on discord when you share it
    image: "img/meta.png",
    navbar: {
      title: "Bluefin Docs",
      logo: {
        alt: "Bluefin Logo",
        src: "img/logo.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://projectbluefin.io/",
          label: "Introduction",
          position: "right",
        },
        {
          href: "https://community.projectbluefin.io/",
          label: "Community",
          position: "right",
        },
        {
          href: "https://feedback.projectbluefin.io/",
          label: "Feedback",
          position: "right",
        },
        {
          href: "https://github.com/ublue-os/bluefin",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Jorge Castro",
          items: [
            {
              label: "Bluesky",
              href: "https://bsky.app/profile/did:plc:2nh77jxvrbsyetftt2vjy7ab",
            },
            {
              label: "Blog",
              href: "https://ypsidanger.com/",
            },
            {
              label: "Linkedin",
              href: "https://linkedin.com/in/jorge-castro2112",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Answer Overflow",
              href: "https://www.answeroverflow.com/c/1072614816579063828",
            },
            {
              label: "Discord",
              href: "https://discord.gg/WEu6BdFEtp",
            },
            {
              label: "Forum",
              href: "https://community.projectbluefin.io/",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/ublue-os/bluefin",
            },
            {
              label: "This website on GitHub",
              href: "https://github.com/ublue-os/bluefin-docs",
            },
            {
              label: "Universal Blue on Mastodon",
              href: "https://fosstodon.org/@UniversalBlue",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Project Bluefin and Universal Blue`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
