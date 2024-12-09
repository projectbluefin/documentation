import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Bluefin Docs',
  tagline: 'Bluefin Documentation Resources',
  favicon: 'img/favicon.ico',

  url: 'https://docs.projectbluefin.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'ublue-os',
  projectName: 'bluefin',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Disables the landing page
          routeBasePath: '/',
          // FIXME: Change this into the proper URL
          editUrl:
            'https://github.com/ublue-os/bluefin-docs/tree/main/packages/create-docusaurus/templates/shared/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    algolia: {
      // FIXME: put the info here
      // The application ID provided by Algolia
      appId: 'YOUR_APP_ID',
      // Public API key: it is safe to commit it
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'YOUR_INDEX_NAME',
      contextualSearch: true,
      searchPagePath: 'search',
    },
    
    // Social card that shows up on discord when you share it
    image: 'img/meta.png',
    navbar: {
      title: 'Bluefin Docs',
      logo: {
        alt: 'Bluefin Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://projectbluefin.io/',
          label: 'Introduction',
          position: 'right',
        },
        {
          href: 'https://community.projectbluefin.io/',
          label: 'Community',
          position: 'right',
        },
        {
          href: 'https://feedback.projectbluefin.io/',
          label: 'Feedback',
          position: 'right',
        },
        {
          href: 'https://github.com/ublue-os/bluefin',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Answer Overflow',
              href: 'https://stackoverflow.com/questions/tagged/docusaurus',
            },
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/docusaurus',
            },
            {
              label: 'X',
              href: 'https://x.com/docusaurus',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/ublue-os/bluefin',
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
