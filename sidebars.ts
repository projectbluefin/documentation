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
        "gaming",
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
      items: ["bluefin-dx"],
    },
    {
      type: "category",
      label: "Bluefin LTS",
      collapsed: true,
      items: ["lts", "bluefin-gdx"],
    },
    {
      type: "category",
      label: "Hardware",
      collapsed: true,
      items: ["t2-mac"],
    },
    {
      type: "category",
      label: "Knuckle",
      collapsed: true,
      items: ["knuckle"],
    },
    {
      type: "category",
      label: "Contributing",
      collapsed: true,
      items: ["contributing", "agentic-contributing", "downloads-testing"],
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
    {
      type: "category",
      label: "Donations",
      collapsed: false,
      link: {
        type: "doc",
        id: "donations/index",
      },
      items: ["donations/contributors", "donations/projects"],
    },
  ],
};

export default sidebars;
