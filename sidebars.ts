import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  baseSidebar: [
    {
      type: "category",
      label: "Get Bluefin",
      collapsed: false,
      items: [
        "index",
        "downloads",
        "installation",
        "t2-mac",
        "driver-versions",
      ],
    },
    {
      type: "category",
      label: "Images",
      collapsed: false,
      link: {
        type: "doc",
        id: "images",
      },
      items: ["dakota", "server", "classic", "utah", "lts"],
    },
    {
      type: "category",
      label: "User Guide",
      collapsed: false,
      items: ["administration", "command-line", "troubleshooting"],
    },
    {
      type: "category",
      label: "Developer Guide",
      collapsed: false,
      items: ["bluefin-dx", "ai"],
    },
    {
      type: "category",
      label: "Community & Project",
      collapsed: true,
      items: [
        "contributing",
        "agentic-contributing",
        "contributors",
        "downloads-testing",
        {
          type: "category",
          label: "Donations",
          collapsed: true,
          link: {
            type: "doc",
            id: "donations/index",
          },
          items: ["donations/projects"],
        },
        "mission",
        "values",
        "code-of-conduct",
        "supply-chain",
      ],
    },
    {
      type: "category",
      label: "Lore",
      collapsed: true,
      items: ["dinosaurs", "artwork", "music", "press-kit"],
    },
  ],
};

export default sidebars;
