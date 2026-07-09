import { getCollection, type CollectionEntry } from "astro:content";
import GithubSlugger from "github-slugger";

export type NodeGroup = "hub" | "interest" | "hobby" | "category" | "blog" | "meta" | "book";

export interface GraphNode {
  id: string; // slug
  title: string;
  url: string;
  group: NodeGroup;
  degree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface Backlink {
  id: string;
  title: string;
  url: string;
  group: NodeGroup;
}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function slugify(s: string): string {
  return new GithubSlugger().slug(s.trim());
}

export function slugToHref(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

const isProd = import.meta.env.PROD;

/** Extract the wikilink target slugs referenced in a body of markdown. */
function extractLinks(body: string | undefined): string[] {
  if (!body) return [];
  const out: string[] = [];
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    out.push(slugify(m[1]));
  }
  return out;
}

let cache: Awaited<ReturnType<typeof build>> | null = null;

async function build() {
  const notes = (await getCollection("notes")).filter(
    (n) => !(isProd && n.data.draft),
  );
  const books = await getCollection("books");

  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const adjacency = new Map<string, Set<string>>();

  const addNode = (id: string, title: string, group: NodeGroup, url: string) => {
    if (!nodeMap.has(id)) nodeMap.set(id, { id, title, url, group, degree: 0 });
  };

  // 1) notes (skip hidden ones like 404 from the graph, but they stay routable)
  for (const note of notes) {
    if (note.data.hidden) continue;
    addNode(note.id, note.data.title, note.data.group, slugToHref(note.id));
  }

  // 2) books as nodes
  for (const book of books) {
    addNode(book.id, book.data.title, "book", slugToHref(book.id));
  }

  const seenEdges = new Set<string>();
  const link = (from: string, to: string) => {
    // only draw edges between real nodes; broken wikilinks are ignored in the graph
    if (!nodeMap.has(from) || !nodeMap.has(to) || from === to) return;
    const key = from < to ? `${from}|${to}` : `${to}|${from}`;
    if (seenEdges.has(key)) return; // no duplicate edges (e.g. book<->bookshelf twice)
    seenEdges.add(key);
    edges.push({ source: from, target: to });
    if (!adjacency.has(from)) adjacency.set(from, new Set());
    if (!adjacency.has(to)) adjacency.set(to, new Set());
    adjacency.get(from)!.add(to);
    adjacency.get(to)!.add(from);
  };

  // 3) edges from note wikilinks
  const backlinkMap = new Map<string, Set<string>>(); // target -> sources
  const registerBacklink = (target: string, source: string) => {
    if (target === source) return;
    if (!backlinkMap.has(target)) backlinkMap.set(target, new Set());
    backlinkMap.get(target)!.add(source);
  };

  for (const note of notes) {
    if (note.data.hidden) continue;
    for (const target of extractLinks(note.body)) {
      link(note.id, target);
      registerBacklink(target, note.id);
    }
  }

  // 4) every book hangs off the bookshelf hub (a tidy constellation, no genre nodes),
  //    plus any explicit wikilinks in the book note (e.g. trilogy cross-links)
  const BOOKSHELF = "bookshelf";
  for (const book of books) {
    link(book.id, BOOKSHELF); // structural edge only — not a textual backlink
    for (const target of extractLinks(book.body)) {
      link(book.id, target);
      registerBacklink(target, book.id);
    }
  }

  // degree = number of unique neighbours (drives node radius in the graph)
  for (const [id, neighbours] of adjacency) {
    const node = nodeMap.get(id);
    if (node) node.degree = neighbours.size;
  }

  const nodes = [...nodeMap.values()];

  const backlinksFor = (slug: string): Backlink[] => {
    const sources = backlinkMap.get(slug);
    if (!sources) return [];
    return [...sources]
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => Boolean(n))
      .map((n) => ({ id: n.id, title: n.title, url: n.url, group: n.group }))
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  const neighboursOf = (slug: string): string[] => [...(adjacency.get(slug) ?? [])];

  return { nodes, edges, nodeMap, backlinksFor, neighboursOf };
}

export async function getGraph() {
  if (!cache) cache = await build();
  return cache;
}

/** Flat list of everything for the quick-switcher. */
export async function getSearchIndex() {
  const { nodes } = await getGraph();
  const order: Record<NodeGroup, number> = {
    hub: 0,
    interest: 1,
    hobby: 2,
    book: 3,
    category: 4,
    blog: 5,
    meta: 6,
  };
  return [...nodes].sort(
    (a, b) => order[a.group] - order[b.group] || a.title.localeCompare(b.title),
  );
}

export type NoteEntry = CollectionEntry<"notes">;
export type BookEntry = CollectionEntry<"books">;
