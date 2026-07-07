import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getCollection } from "astro:content";
import { getSerifFont } from "../../lib/og";

const GROUP_LABEL: Record<string, string> = {
  hub: "owenparks.com",
  interest: "Interest",
  hobby: "Life",
  category: "Topic",
  blog: "Writing",
  meta: "Meta",
  book: "Bookshelf",
};

export async function getStaticPaths() {
  const notes = (await getCollection("notes")).filter((n) => !n.data.draft);
  const books = await getCollection("books");
  return [
    ...notes.map((n) => ({
      params: { slug: n.id === "home" ? "home" : n.id },
      props: { title: n.data.title, kind: GROUP_LABEL[n.data.group] ?? "Note" },
    })),
    ...books.map((b) => ({
      params: { slug: b.id },
      props: { title: b.data.title, kind: `Bookshelf · ${b.data.author}` },
    })),
  ];
}

export const GET: APIRoute = async ({ props }) => {
  const { title, kind } = props as { title: string; kind: string };
  const font = await getSerifFont();

  const dot = (color: string) => ({
    type: "div",
    props: { style: { width: 16, height: 16, borderRadius: 16, backgroundColor: color, marginRight: 10 } },
  });

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#e9e6dd",
          color: "#1c1b19",
          fontFamily: "Newsreader",
          border: "2px solid #c6c2b6",
        },
        children: [
          {
            type: "div",
            props: {
              style: { display: "flex", fontSize: 28, letterSpacing: 3, color: "#57544c", textTransform: "uppercase" },
              children: kind,
            },
          },
          {
            type: "div",
            props: { style: { display: "flex", fontSize: 92, lineHeight: 1.05, maxWidth: 1000 }, children: title },
          },
          {
            type: "div",
            props: {
              style: { display: "flex", alignItems: "center", fontSize: 30, color: "#57544c" },
              children: [dot("#4b2e83"), dot("#6f6c63"), dot("#c6c2b6"), { type: "div", props: { style: { marginLeft: 8 }, children: "owenparks.com" } }],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Newsreader", data: font, weight: 400, style: "normal" }],
    },
  );

  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
};
