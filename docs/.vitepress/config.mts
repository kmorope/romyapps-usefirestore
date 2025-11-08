import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@romyapps/usefirestore",
  description: "Headless Firestore hooks powered by TanStack Query",
  base: "/romyapps-usefirestore/",
  themeConfig: {
    logo: "🔥",
    nav: [
      { text: "Home", link: "/" },
      {
        text: "npm",
        link: "https://www.npmjs.com/package/@romyapps/usefirestore",
      },
      {
        text: "GitHub",
        link: "https://github.com/kmorope/romyapps-usefirestore",
      },
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Introduction", link: "/#romy-usefirestore" },
          { text: "Installation", link: "/#installation" },
          { text: "Quick Start", link: "/#quick-start" },
        ],
      },
      {
        text: "API Reference",
        items: [
          {
            text: "useCollection",
            link: "/#usecollection-t-collectionname-options-behavior",
          },
          {
            text: "useDocument",
            link: "/#usedocument-t-collectionname-documentid-behavior",
          },
          {
            text: "useAddDocument",
            link: "/#useadddocument-t-collectionname-options",
          },
          {
            text: "useUpdateDocument",
            link: "/#useupdatedocument-t-collectionname-options",
          },
          {
            text: "useDeleteDocument",
            link: "/#usedeletedocument-collectionname-options",
          },
          {
            text: "useCollectionFilters",
            link: "/#usecollectionfilters-t-initial",
          },
          { text: "Statistics Functions", link: "/#statistics-functions" },
        ],
      },
      {
        text: "Advanced",
        items: [
          { text: "Configuration", link: "/#advanced-configuration" },
          { text: "Custom Logger", link: "/#custom-logger" },
          { text: "Audit Logging", link: "/#audit-logging" },
          { text: "Custom Storage", link: "/#custom-storage" },
          { text: "Cache Strategies", link: "/#cache-strategies" },
          { text: "TypeScript", link: "/#typescript-support" },
        ],
      },
      {
        text: "Examples",
        items: [
          { text: "CRUD Example", link: "/#complete-crud-example" },
          { text: "Real-time Polling", link: "/#real-time-polling" },
        ],
      },
      {
        text: "Publishing",
        items: [
          { text: "Setup", link: "/#setup" },
          { text: "Publishing Methods", link: "/#publishing-methods" },
          { text: "CI/CD", link: "/#ci-cd" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/kmorope/romyapps-usefirestore",
      },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2025 Camilo Romero",
    },
    search: {
      provider: "local",
    },
  },
});
