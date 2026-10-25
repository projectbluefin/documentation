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
      items: ["dakota", "classic", "utah"],
    },
    {
      type: "category",
      label: "Desktop Guide",
      collapsed: false,
      items: [
        "administration",
        "sync-folder",
        "command-line",
        "troubleshooting",
      ],
    },
    {
      type: "category",
      label: "Developer Guide",
      collapsed: false,
      items: ["bluefin-dx", "ai"],
    },
    {
      type: "category",
      label: "Server Guide",
      collapsed: true,
      link: {
        type: "doc",
        id: "server",
      },
      items: [
        "server/ddi-installer",
        "server/usb-installer",
        "server/booty-integration",
        "server/diskless-troubleshooting",
        "server/systemd-sysext-extensions",
        "server/enabling-extensions",
        "server/system-containers",
        "server/kubeadm-sysext",
        "server/k0s-sysext-ops",
        "server/homelab-profile",
        "server/nvidia-sysext",
        "server/systemd-sysupdate-verification",
        "server/secure-boot-keys",
      ],
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
