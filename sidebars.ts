import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  baseSidebar: [
    {
      type: "category",
      label: "Documentation",
      collapsed: false,
      items: [
        "introduction",
        "installation",
        "administration",
        "gaming",
        "ai",
        "bluefin-dx",
        "command-line"
      ],
    },
    {
      type: "category",
      label: "Project Information",
      collapsed: false,
      items: [
        "analytics",
        "FAQ",
        "press-kit",
        "tips",
        "downloads"
      ],
    },
    {
      type: "category",
      label: "Contributing",
      collapsed: true,
      items: ["contributing", "local"],
    },
    {
      type: "category",
      label: "Framework Laptops",
      collapsed: true,
      items: ["framework", "framework-13", "framework-16"],
    },
    {
      type: "category",
      label: "Other Hardware",
      collapsed: true,
      items: ["t2-mac"],
    },
    "donations",
  ],
};

export default sidebars;
