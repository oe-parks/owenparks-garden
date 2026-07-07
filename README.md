# owenparks.com

A personal digital garden built with [Astro](https://astro.build) — an e-ink
aesthetic, interlinked `[[wikilink]]` notes with automatic backlinks, and an
ambient force-directed graph that lives in the background and morphs as you
navigate.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
```

`predev`/`prebuild` run `scripts/dither.mjs`, which Floyd–Steinberg-dithers the
images in `src/assets/covers/` into `public/covers/` for the e-ink look.

## Build

```bash
npm run build    # static output in ./dist
npm run preview  # serve the built site locally
```

## Structure

| Path | What |
| --- | --- |
| `src/content/notes/` | The notes (hubs, interests, hobbies, categories, blog). Link with `[[slug]]` or `[[slug\|Label]]`. |
| `src/content/books/` | The bookshelf. Covers reference a dithered PNG basename in `public/covers/`. |
| `src/lib/graph.ts` | Builds the graph nodes/edges + backlinks from wikilinks & book categories. |
| `src/lib/remark-wikilinks.mjs` | Resolves `[[wikilinks]]` at build. |
| `src/components/BackgroundGraph.astro` | The ambient + full-screen graph (canvas + d3-force). |
| `src/pages/og/[...slug].png.ts` | Auto-generated e-ink OpenGraph share cards. |

## Add a note

Create `src/content/notes/my-topic.md`:

```md
---
title: My Topic
description: One line for SEO / share cards.
group: interest   # hub | interest | hobby | category | blog | meta
---

Body text, linking to [[machine-learning]] and other notes.
```

It automatically becomes a node in the graph, gains backlinks, and appears in the
⌘K switcher.

## Deploy (Cloudflare Pages)

- Framework preset: **Astro**
- Build command: `npm run build`
- Output directory: `dist`
- Optional: set `PUBLIC_CF_BEACON_TOKEN` to enable Cloudflare Web Analytics
  (see `.env.example`).
