import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import {
  SEARCH_LANGUAGES,
  dropStaticCopy,
  englishOnlyRoutes,
  remarkEnglishOnlyUrls,
  translatedLocales,
} from "./scripts/lib/translated-locales.mjs";

// Translation locales go live once they hold a translated docs page, and carry
// the core docs only; see docs/skills/translations.md. Docusaurus loads this
// config once per locale and sets DOCUSAURUS_CURRENT_LOCALE before each load.
const siteUrl = "https://docs.projectbluefin.io";
const liveLocales = translatedLocales(`${__dirname}/i18n`);
const isTranslation = (process.env.DOCUSAURUS_CURRENT_LOCALE ?? "en") !== "en";

// Static images come from the English site in a translated build, which ships
// no copy of static/. English-only navbar links go there too.
const staticAsset = (path: string) =>
  isTranslation ? `${siteUrl}/${path}` : path;

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Bluefin",
  tagline: "Documentation",
  favicon: staticAsset("img/favicon.svg"),

  url: siteUrl,
  baseUrl: "/",
  trailingSlash: true,

  future: {
    faster: true,
    v4: {
      removeLegacyPostBuildHeadAttribute: true,
      useCssCascadeLayers: true,
    },
  },

  // GitHub pages deployment config.
  organizationName: "projectbluefin",
  projectName: "documentation",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en", ...liveLocales],
    // Pinned rather than inferred: `docusaurus build --locale <l>` (one locale
    // per process, as scripts/build-site.mjs runs them in parallel) otherwise
    // drops the /<l>/ segment and publishes every link against the English
    // root. Same value Docusaurus infers for a multi-locale build.
    localeConfigs: Object.fromEntries(
      liveLocales.map((locale) => [locale, { baseUrl: `/${locale}/` }]),
    ),
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
          exclude: ["skills/**", "SKILL.md", "superpowers/**"],
          editUrl: "https://github.com/projectbluefin/documentation/tree/main",
          // Before the defaults, which turn root images into bundled imports.
          beforeDefaultRemarkPlugins: isTranslation
            ? [
                [
                  remarkEnglishOnlyUrls,
                  { siteUrl, routes: englishOnlyRoutes(__dirname) },
                ],
              ]
            : [],
        },
        pages: isTranslation ? false : undefined,
        blog: isTranslation
          ? false
          : {
              blogTitle: "Bluefin's Blog",
              blogDescription: "Official Blog and Announcements",
              blogSidebarCount: "ALL",
              blogSidebarTitle: "Raptor News",
              editUrl:
                "https://github.com/projectbluefin/documentation/edit/main/",
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
    ...(isTranslation ? [dropStaticCopy] : []),
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        docsRouteBasePath: "/",
        // One list for every locale: the plugin sets up lunr once per build
        // process and reuses it for each locale that follows. English stays
        // first; untranslated pages fall back to it.
        language: [
          "en",
          ...new Set(
            liveLocales.flatMap((locale) => SEARCH_LANGUAGES[locale] ?? []),
          ),
        ],
      },
    ],
    // Legacy URL redirects are English-only; several target the blog.
    ...(isTranslation
      ? []
      : [
          [
            "@docusaurus/plugin-client-redirects",
            {
              redirects: [
                {
                  to: "/",
                  from: "/introduction",
                },
                {
                  to: "/troubleshooting",
                  from: ["/FAQ", "/faq"],
                },
                {
                  to: "/server",
                  from: "/knuckle",
                },
                {
                  to: "/command-line",
                  from: "/tips",
                },
                {
                  to: "/contributors",
                  from: "/donations/contributors",
                },
                {
                  to: "/blog/tags/monthly-report",
                  from: ["/reports", "/reports/about-monthly-reports"],
                },
                {
                  to: "/blog/nodosaurus-november-2025",
                  from: "/reports/2025/11",
                },
                {
                  to: "/blog/deinonychus-december-2025",
                  from: "/reports/2025/12",
                },
                {
                  to: "/blog/jurassic-january-2026",
                  from: "/reports/2026/01",
                },
                {
                  to: "/blog/fossil-february-2026",
                  from: "/reports/2026/02",
                },
                {
                  to: "/blog/mesozoic-march-2026",
                  from: "/reports/2026/03",
                },
                {
                  to: "/blog/allosaurus-april-2026",
                  from: "/reports/2026/04",
                },
                {
                  to: "/blog/megalosaurus-may-2026",
                  from: "/reports/2026/05",
                },
                {
                  to: "/blog/juravenator-june-2026",
                  from: "/reports/2026/06",
                },
                {
                  to: "/blog/jovial-july-2026",
                  from: "/reports/2026/07",
                },
                {
                  to: "/blog/archaeopteryx-august-2026",
                  from: "/reports/2026/08",
                },
              ],
            },
          ],
        ]),
  ],

  headTags: [
    {
      tagName: "meta",
      attributes: {
        "http-equiv": "Content-Security-Policy",
        content: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://giscus.app https://formulae.brew.sh https://projectbluefin.github.io https://hosted-projectbluefin-knuckle-gjvq.hive.hivecommons.dev https://hive.kubestellar.io https://countme.projectbluefin.io",
          "frame-src https://giscus.app https://www.youtube.com https://youtube.com https://insights.linuxfoundation.org",
        ].join("; "),
      },
    },
  ],

  themeConfig: {
    announcementBar: {
      id: "docs_major_update_oct_2026",
      content:
        "The documentation is going through a major update, expected completion October 2026",
      backgroundColor: "#2c4075",
      textColor: "#ffffff",
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
    image: staticAsset("img/meta.png"),
    navbar: {
      title: "",
      logo: {
        alt: "Bluefin",
        src: staticAsset("img/bluefin-wordmark-light.svg"),
        srcDark: staticAsset("img/bluefin-wordmark-dark.svg"),
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
          ...(isTranslation ? { href: `${siteUrl}/blog/` } : { to: "/blog/" }),
          label: "Blog",
          position: "right",
        },
        {
          href: "https://docs.projectbluefin.io/reports",
          label: "Reports",
          position: "right",
        },
        {
          ...(isTranslation
            ? { href: `${siteUrl}/leaderboards/` }
            : { to: "/leaderboards/" }),
          label: "Leaderboards",
          position: "right",
        },
        {
          href: "https://hosted-projectbluefin-knuckle-gjvq.hive.hivecommons.dev",
          label: "Hive",
          position: "right",
        },
        {
          href: "https://github.com/ublue-os/bluefin/discussions",
          label: "Discussions",
          position: "right",
        },
        {
          to: "/analytics",
          label: "Analytics",
          position: "right",
        },
        {
          href: "https://store.projectbluefin.io",
          label: "Store",
          position: "right",
        },
        ...(liveLocales.length > 0
          ? [{ type: "localeDropdown" as const, position: "right" as const }]
          : []),
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
              href: "https://github.com/projectbluefin/dakota/releases.atom",
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
          title: "Media & Lore",
          items: [
            {
              label: "Dinosaurs",
              to: "/dinosaurs",
            },
            {
              label: "Artwork",
              to: "/artwork",
            },
            {
              label: "Music",
              to: "/music",
            },
            {
              label: "Press Kit",
              to: "/press-kit",
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
              href: "https://github.com/projectbluefin/dakota",
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
              href: "https://github.com/projectbluefin/bluefin/issues/new/choose",
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
