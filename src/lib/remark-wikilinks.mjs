import { visit } from "unist-util-visit";
import GithubSlugger from "github-slugger";

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Turn "Machine Learning" or "machine-learning" into a stable slug. */
export function toSlug(target) {
  const slugger = new GithubSlugger();
  return slugger.slug(target.trim());
}

/** Resolve a wikilink target to its site URL. Flat namespace: /<slug> (home = /). */
export function targetToHref(target) {
  const slug = toSlug(target);
  return slug === "home" ? "/" : `/${slug}`;
}

/** Default display text for an unlabeled [[wikilink]]: slug -> Title Case. */
function prettify(target) {
  return target
    .trim()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\p{L}[\p{L}']*/gu, (w) => w[0].toUpperCase() + w.slice(1));
}

/**
 * remark plugin: rewrites [[target]] and [[target|label]] into links.
 * Rendering only — backlinks and the graph are computed separately in graph.ts
 * so they have global knowledge of every note.
 */
export function remarkWikilinks() {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === null) return;
      const value = node.value;
      if (!value.includes("[[")) return;

      const children = [];
      let lastIndex = 0;
      let match;
      WIKILINK_RE.lastIndex = 0;

      while ((match = WIKILINK_RE.exec(value)) !== null) {
        const [full, target, label] = match;
        if (match.index > lastIndex) {
          children.push({ type: "text", value: value.slice(lastIndex, match.index) });
        }
        const display = label ? label.trim() : prettify(target);
        const href = targetToHref(target);
        children.push({
          type: "link",
          url: href,
          data: {
            hProperties: {
              className: ["wikilink"],
              "data-note": toSlug(target),
            },
          },
          children: [{ type: "text", value: display }],
        });
        lastIndex = match.index + full.length;
      }

      if (children.length === 0) return;
      if (lastIndex < value.length) {
        children.push({ type: "text", value: value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}
