import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Bluefin",
  tagline: "Bluefin Documentation",
  favicon: "img/logo.svg",

  url: "https://docs.projectbluefin.io",
  baseUrl: "/",

  future: {
    experimental_faster: true,
    v4: {
      removeLegacyPostBuildHeadAttribute: true,
    },
  },

  // GitHub pages deployment config.
  organizationName: "ublue-os",
  projectName: "bluefin",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
  },

  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Disables the landing page
          routeBasePath: "/",
          editUrl: "https://github.com/ublue-os/bluefin-docs/tree/main",
        },
        blog: {
          blogTitle: "Bluefin's Blog",
          blogDescription: "Official Blog and Announcements",
          blogSidebarCount: "ALL",
          blogSidebarTitle: "Raptor News",
          editUrl: "https://github.com/ublue-os/bluefin-docs/edit/main/",
          authorsMapPath: "authors.yaml",
          truncateMarker: /(?!.*)/,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
            title: "Bluefin Blog",
            description: "Official Blog and Announcements",
          },
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      "@1password/docusaurus-plugin-stored-data",
      {
        data: {
          bluefinReleases: "https://github.com/ublue-os/bluefin/releases.atom",
          bluefinLtsReleases:
            "https://github.com/ublue-os/bluefin-lts/releases.atom",
          bluefinDiscussions:
            "https://github.com/ublue-os/bluefin/discussions.atom",
          bluefinAnnouncements:
            "https://github.com/ublue-os/bluefin/discussions.atom?discussions_q=is%3Aopen+label%3Aannouncements",
        },
      },
    ],
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        docsRouteBasePath: "/",
        indexBlog: true,
        indexDocs: true,
      },
    ],
    [
      "@docusaurus/plugin-content-blog",
      {
        id: "reports",
        routeBasePath: "reports",
        path: "./reports",
        blogTitle: "Monthly Reports",
        blogDescription:
          "Automated project activity reports from GitHub Project Board",
        blogSidebarTitle: "Recent Reports",
        blogSidebarCount: 10,
        postsPerPage: 20,
        showReadingTime: false, // System-generated content
        authorsMapPath: "authors.yaml",
        feedOptions: {
          type: "all",
          title: "Project Bluefin - Monthly Reports",
          description: "Automated monthly activity reports from project board",
          copyright: `Copyright © ${new Date().getFullYear()} Project Bluefin`,
        },
        // Enable table of contents in right sidebar
        blogPostComponent: "@theme/BlogPostPage",
        showLastUpdateTime: false,
      },
    ],
  ],

  themeConfig: {
    announcementBar: {
      id: "announcement",
      content:
        'Reminder: Bluefin GTS will merge into Bluefin on 1 March 2026. Check the <a href="https://docs.projectbluefin.io/blog/bluefin-2025/">State of the Raptor</a> for more information.',
      backgroundColor: "#fafbfc",
      textColor: "#091E42",
      isCloseable: true,
    },
    metadata: [
      {
        name: "keywords",
        content:
          "documentation, bluefin, universalblue, linux, gnome, podman, docker, cloudnative",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],

    // Social card that shows up on discord when you share it
    image: "img/meta.png",
    navbar: {
      title: "Bluefin",
      logo: {
        alt: "Bluefin",
        src: "img/logo.svg",
        href: "https://projectbluefin.io",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "baseSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://ask.projectbluefin.io",
          label: "Ask Bluefin",
          position: "left",
        },
        {
          to: "blog",
          label: "Blog",
          position: "right",
        },
        {
          to: "changelogs",
          label: "Changelogs",
          position: "right",
        },
        {
          to: "reports",
          label: "Reports",
          position: "right",
        },
        {
          href: "https://github.com/ublue-os/bluefin/discussions",
          label: "Discussions",
          position: "right",
        },
        {
          href: "https://feedback.projectbluefin.io/",
          label: "Feedback",
          position: "right",
        },
        {
          href: "https://store.projectbluefin.io",
          label: "Store (US Only)",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Universal Blue",
          items: [
            {
              label: "Aurora",
              href: "https://getaurora.dev",
            },
            {
              label: "Bazzite",
              href: "https://bazzite.gg/",
            },
            {
              label: "uCore",
              href: "https://github.com/ublue-os/ucore",
            },
            {
              label: "Universal Blue",
              href: "https://universal-blue.org",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Blog and Announcements",
              href: "https://blog.projectbluefin.io/",
            },
            {
              label: "Discussions",
              href: "https://github.com/ublue-os/bluefin/discussions",
            },
            {
              label: "Discord",
              href: "https://discord.gg/XUC8cANVHy",
            },
            {
              label: "Ask Bluefin",
              href: "https://ask.projectbluefin.io",
            },
            {
              label: "Feedback",
              href: "https://feedback.projectbluefin.io/",
            },
            {
              label: "Changelogs",
              href: "https://changelogs.projectbluefin.io",
            },
          ],
        },
        {
          title: "RSS Feeds",
          items: [
            {
              label: "Blog and Announcements Feed",
              href: "https://docs.projectbluefin.io/blog/atom.xml",
            },
            {
              label: "Releases Feed",
              href: "https://github.com/ublue-os/bluefin/releases.atom",
            },
            {
              label: "LTS Releases Feed",
              href: "https://github.com/ublue-os/bluefin-lts/releases.atom",
            },
            {
              label: "Discussions Feed",
              href: "https://github.com/ublue-os/bluefin/discussions.atom",
            },
          ],
        },
        {
          title: "Contribute",
          items: [
            {
              label: "Open Issues",
              href: "https://issues.projectbluefin.io",
            },
            {
              label: "Open Pull Requests",
              href: "https://pullrequests.projectbluefin.io",
            },
            {
              label: "Contributor's Guide",
              href: "https://contribute.projectbluefin.io",
            },
          ],
        },
        {
          title: "GitHub",
          items: [
            {
              label: "Main Bluefin Repository",
              href: "https://github.com/projectbluefin",
            },
            {
              label: "Bluefin",
              href: "https://github.com/ublue-os/bluefin",
            },
            {
              label: "Bluefin LTS",
              href: "https://github.com/ublue-os/bluefin-lts",
            },
            {
              label: "Documentation",
              href: "https://github.com/projectbluefin/documentation",
            },
            {
              label: "Website",
              href: "https://github.com/projectbluefin/website",
            },
            {
              label: "Report Issue",
              href: "https://github.com/ublue-os/bluefin/issues/new/choose",
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
    colorMode: {
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
