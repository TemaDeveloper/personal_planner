/** Helpers for deep-duplicating a notes page's BlockNote content: find the
 * databases and sub-pages it references, and rewrite those ids onto copies.
 * Pure + dependency-free so it can be unit-tested. */

type Block = {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: Block[];
};

/** Collect every database block id referenced in a content tree. */
export function collectDatabaseIds(content: unknown): string[] {
  const ids = new Set<string>();
  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes as Block[]) {
      if (n?.type === "database" && n.props?.databaseId) ids.add(String(n.props.databaseId));
      if (Array.isArray(n?.children)) walk(n.children);
    }
  };
  walk(content);
  return [...ids];
}

/** Return a deep copy of `content` with database/subPage/mention ids remapped.
 * `dbMap` maps old databaseId → new; `pageMap` maps old pageId → new. Ids with
 * no mapping are left unchanged. */
export function rewriteContentIds(
  content: unknown,
  dbMap: Record<string, string>,
  pageMap: Record<string, string>
): unknown {
  const rewriteNode = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(rewriteNode);
    if (!node || typeof node !== "object") return node;
    const n = { ...(node as Block) } as Block;

    if (n.props) {
      const props = { ...n.props };
      if (n.type === "database" && typeof props.databaseId === "string" && dbMap[props.databaseId]) {
        props.databaseId = dbMap[props.databaseId];
      }
      if (n.type === "subPage" && typeof props.pageId === "string" && pageMap[props.pageId]) {
        props.pageId = pageMap[props.pageId];
      }
      // inline mention props (mention inline content carries pageId too)
      if (n.type === "mention" && typeof props.pageId === "string" && pageMap[props.pageId]) {
        props.pageId = pageMap[props.pageId];
      }
      n.props = props;
    }
    if (n.content !== undefined) n.content = rewriteNode(n.content);
    if (Array.isArray(n.children)) n.children = n.children.map((c) => rewriteNode(c) as Block);
    return n;
  };
  return rewriteNode(content);
}
