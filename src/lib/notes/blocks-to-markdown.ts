type MdProperty = { id: string; name: string; type: string; options?: unknown };
type MdRow = { id: string; cells: Record<string, unknown> };
type MdDatabase = { title?: string; properties: MdProperty[]; rows: MdRow[] };

function cellMd(prop: MdProperty, value: unknown): string {
  if (value == null || value === "") return "";
  if (prop.type === "checkbox") return value ? "✓" : "";
  if (prop.type === "multi_select" || prop.type === "relation") return Array.isArray(value) ? value.join(", ") : String(value);
  if (prop.type === "date") return String(value).slice(0, 10);
  return String(value).replace(/\|/g, "\\|");
}

/** Render a database as a GitHub-flavored Markdown table (first row = headers). */
export function databaseToMarkdown(db: MdDatabase): string {
  const props = db.properties ?? [];
  if (!props.length) return "";
  const header = `| ${props.map((p) => p.name || "Untitled").join(" | ")} |`;
  const sep = `| ${props.map(() => "---").join(" | ")} |`;
  const body = (db.rows ?? []).map((r) => `| ${props.map((p) => cellMd(p, r.cells[p.id])).join(" | ")} |`);
  const title = db.title ? `**${db.title}**\n\n` : "";
  return `${title}${[header, sep, ...body].join("\n")}`;
}

/** Serialize BlockNote document JSON to Markdown. Lossy but dependency-free:
 * covers the common block types and degrades unknown blocks to their text.
 * `databases` maps a database block's id → its data so DB blocks export as tables. */

type Block = {
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: Block[];
};

function inlineText(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const run of content) {
    if (run == null || typeof run !== "object") continue;
    const r = run as Record<string, unknown>;
    if (r.type === "link") {
      const label = inlineText(r.content);
      out += `[${label}](${String(r.href ?? "")})`;
    } else if (typeof r.text === "string") {
      let t = r.text as string;
      const styles = (r.styles ?? {}) as Record<string, unknown>;
      if (styles.code) t = `\`${t}\``;
      if (styles.bold) t = `**${t}**`;
      if (styles.italic) t = `*${t}*`;
      if (styles.strike) t = `~~${t}~~`;
      out += t;
    } else if (typeof r.label === "string") {
      out += r.label;
    }
  }
  return out;
}

function blockToLines(block: Block, depth: number, databases: Record<string, MdDatabase>): string[] {
  const indent = "  ".repeat(depth);
  const props = block.props ?? {};
  const text = inlineText(block.content);
  const lines: string[] = [];

  switch (block.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(props.level) || 1));
      lines.push(`${"#".repeat(level)} ${text}`);
      break;
    }
    case "bulletListItem":
      lines.push(`${indent}- ${text}`);
      break;
    case "numberedListItem":
      lines.push(`${indent}1. ${text}`);
      break;
    case "checkListItem":
      lines.push(`${indent}- [${props.checked ? "x" : " "}] ${text}`);
      break;
    case "quote":
      lines.push(`> ${text}`);
      break;
    case "callout":
      lines.push(`> ${props.emoji ? `${props.emoji} ` : ""}${text}`);
      break;
    case "codeBlock":
      lines.push("```" + (props.language && props.language !== "text" ? String(props.language) : ""));
      lines.push(text);
      lines.push("```");
      break;
    case "divider":
      lines.push("---");
      break;
    case "image":
      lines.push(`![${String(props.caption ?? "")}](${String(props.url ?? "")})`);
      break;
    case "bookmark": {
      const url = String(props.url ?? "");
      lines.push(url ? `[${String(props.title || url)}](${url})` : text);
      break;
    }
    case "equation":
      lines.push(`$$${String(props.content ?? text)}$$`);
      break;
    case "database": {
      const db = databases[String(props.databaseId ?? "")];
      if (db) lines.push(databaseToMarkdown(db));
      break;
    }
    case "tableOfContents":
      break; // generated UI; nothing to export
    default:
      if (text) lines.push(`${indent}${text}`);
  }

  const isListItem = block.type === "bulletListItem" || block.type === "numberedListItem" || block.type === "checkListItem";
  for (const child of block.children ?? []) {
    lines.push(...blockToLines(child, isListItem ? depth + 1 : depth, databases));
  }
  return lines;
}

export function blocksToMarkdown(content: unknown, databases: Record<string, MdDatabase> = {}): string {
  if (!Array.isArray(content)) return "";
  const out: string[] = [];
  for (const block of content as Block[]) {
    out.push(...blockToLines(block, 0, databases));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** Collect all database block ids in a document (for prefetch before export). */
export function collectDatabaseIds(content: unknown): string[] {
  const ids = new Set<string>();
  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes as Block[]) {
      if (n?.type === "database" && n.props?.databaseId) ids.add(String(n.props.databaseId));
      if (n?.children) walk(n.children);
    }
  };
  walk(content);
  return [...ids];
}
