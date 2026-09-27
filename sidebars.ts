import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  baseSidebar: [
    {
      type: "category",
      label: "Get Bluefin",
      collapsed: false,
      items: ["index", "downloads", "installation", "driver-versions"],
    },
    {
      type: "category",
      label: "Images",
      collapsed: false,
      link: {
        type: "doc",
        id: "images",
      },
      items: ["dakota", "server", "classic", "utah"],
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
        "donations/index",
        "mission",
        "values",
        "code-of-conduct",
        "supply-chain",
      ],
    },
  ],
};

export default sidebars;
