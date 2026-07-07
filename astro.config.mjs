// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import { remarkWikilinks } from "./src/lib/remark-wikilinks.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://owenparks.com",
  output: "static",
  trailingSlash: "ignore",
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkWikilinks],
    // e-ink look: no syntax-highlight color; keep it grayscale-friendly
    shikiConfig: { theme: "github-light", wrap: true },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
