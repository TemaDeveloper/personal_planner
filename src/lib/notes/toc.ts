export interface TocItem {
  id: string;
  level: number;
  text: string;
}

/** Plain text of a BlockNote inline-content value (array of inline nodes, or a string). */
function inlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((n) => (n && typeof n === "object" && "text" in n ? String((n as { text?: unknown }).text ?? "") : ""))
      .join("");
  }
  return "";
}

/** Extract heading entries (id, level, text) from a BlockNote document, in order.
 * Headings with no text are skipped. */
export function collectHeadings(blocks: readonly unknown[]): TocItem[] {
  const out: TocItem[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const block = b as { id?: unknown; type?: unknown; props?: { level?: unknown }; content?: unknown };
    if (block.type !== "heading" || typeof block.id !== "string") continue;
    const level = typeof block.props?.level === "number" ? block.props.level : 1;
    const text = inlineText(block.content).trim();
    if (text.length > 0) out.push({ id: block.id, level, text });
  }
  return out;
}
