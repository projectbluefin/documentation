import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  baseSidebar: [
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: [
        "index",
        "introduction",
        "downloads",
        "installation",
        "FAQ",
      ],
    },
    {
      type: "category",
      label: "Using Bluefin",
      collapsed: false,
      items: [
        "administration",
        "tips",
        "ai",
        "command-line",
        "images",
        "driver-versions",
        "troubleshooting",
      ],
    },
    {
      type: "category",
      label: "Developer Experience",
      collapsed: true,
      items: [
        "bluefin-dx",
        "bluefin-gdx",
      ],
    },
    {
      type: "category",
      label: "Specialized Editions & Hardware",
      collapsed: true,
      items: [
        "lts",
        "t2-mac",
        "knuckle",
      ],
    },
    {
      type: "category",
      label: "Community",
      collapsed: true,
      items: [
        "contributing",
        "agentic-contributing",
        "downloads-testing",
        {
          type: "category",
          label: "Donations",
          collapsed: true,
          link: {
            type: "doc",
            id: "donations/index",
          },
          items: ["donations/contributors", "donations/projects"],
        },
        {
          type: "category",
          label: "About the Project",
          collapsed: true,
          items: [
            "mission",
            "values",
            "code-of-conduct",
            "supply-chain",
            "analytics",
            "reports",
            "dinosaurs",
            "artwork",
            "music",
            "press-kit",
          ],
        },
      ],
    },
  ],
};

export default sidebars;
