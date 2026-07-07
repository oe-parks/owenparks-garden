import type { APIRoute } from "astro";
import { getGraph } from "../lib/graph";

// Static JSON consumed by the background-graph client once, then reused
// across view transitions.
export const GET: APIRoute = async () => {
  const { nodes, edges } = await getGraph();
  const payload = {
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      group: n.group,
      degree: n.degree,
    })),
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  };
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });
};
