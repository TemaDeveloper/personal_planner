/** Flatten BlockNote document JSON to plain text for searching/snippets.
 * Walks each block's inline `content` (text runs, links, mentions) and recurses
 * into `children`. Resilient to unknown shapes — only collects string `text`. */
export function blocksToText(content: unknown): string {
  const out: string[] = [];
  collect(content, out);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function collect(node: unknown, out: string[]): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const n of node) collect(n, out);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  if (typeof obj.text === "string") out.push(obj.text);
  // mention/link labels and the like
  if (typeof obj.label === "string") out.push(obj.label);

  if ("content" in obj) collect(obj.content, out);
  if ("children" in obj) collect(obj.children, out);
}

/** A short snippet of text around the first case-insensitive match of `query`. */
export function snippetAround(text: string, query: string, radius = 40): string {
  const q = query.trim().toLowerCase();
  if (!q) return text.slice(0, radius * 2);
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}
