import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// A "note" is any interlinked page in the garden: hubs, interests, hobbies,
// category nodes, blog posts, cv. Flat namespace — slug drives the URL.
const notes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // controls the graph node's group/color and how it's grouped in the switcher
    group: z
      .enum(["hub", "interest", "hobby", "category", "blog", "meta", "book"])
      .default("interest"),
    date: z.coerce.date().optional(), // blog posts
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    // hide from the graph/switcher (e.g. 404) but still routable
    hidden: z.boolean().default(false),
  }),
});

const books = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/books" }),
  schema: () =>
    z.object({
      title: z.string(),
      author: z.string(),
      // basename of a dithered cover in public/covers (e.g. "thepoppywar")
      cover: z.string().optional(),
      status: z.enum(["Reading", "Finished", "To Read"]).default("Reading"),
      stars: z.number().min(0).max(5).optional(),
      started: z.coerce.date().optional(),
      finished: z.coerce.date().optional(),
      released: z.union([z.string(), z.number()]).optional(),
      categories: z.array(z.string()).default([]),
      buy_link: z.string().url().optional(),
    }),
});

export const collections = { notes, books };
