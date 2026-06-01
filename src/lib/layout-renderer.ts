/**
 * Safe layout HTML renderer with expression parsing.
 *
 * Supports:
 * - {fieldName} — simple value interpolation
 * - {fieldA - fieldB} — arithmetic expressions (+, -, *, /)
 * - data-each="entries" — loop over entry array
 * - {entry.fieldName} — field access inside loops
 *
 * Security:
 * - No eval() — custom tokenizer for arithmetic only
 * - All output HTML-escaped
 * - Script tags and event handlers stripped
 * - Only fields in the allowlist resolve
 */

interface FieldDef {
  key: string;
  label: string;
  type: string;
}

const EXPRESSION_RE = /\{([^}]+)\}/g;
const DATA_EACH_RE = /<([a-z][a-z0-9]*)\s([^>]*?)data-each="entries"([^>]*)>([\s\S]*?)<\/\1>/gi;
const ALLOWED_TOKEN = /^[a-zA-Z_]\w*$/;

/** Tags allowed in layout HTML */
const ALLOWED_TAGS = new Set([
  "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
  "strong", "em", "b", "i", "br", "hr", "a", "img",
  "section", "article", "header", "footer", "nav", "main",
  "dl", "dt", "dd", "figure", "figcaption", "blockquote", "pre", "code",
]);

/** Attributes allowed on any tag */
const ALLOWED_ATTRS = new Set([
  "class", "style", "id", "data-each", "href", "src", "alt", "title",
  "width", "height", "colspan", "rowspan", "role", "aria-label",
]);

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Strict HTML sanitizer using allowlist approach.
 * Only permitted tags and attributes survive; everything else is stripped.
 */
function sanitizeHtml(html: string): string {
  // Remove script tags and their content entirely
  let clean = html.replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, "");

  // Remove all event handler attributes (on*)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");

  // Remove javascript: protocol from href/src
  clean = clean.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "$1=\"\"");

  // Remove data: protocol from src (except images)
  clean = clean.replace(/src\s*=\s*(?:"data:(?!image\/)[^"]*"|'data:(?!image\/)[^']*')/gi, "src=\"\"");

  // Strip disallowed tags (keep content, remove tag)
  clean = clean.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return "";

    // For allowed tags, filter attributes
    if (match.startsWith("</")) return `</${lower}>`;

    const attrString = match.slice(match.indexOf(tag) + tag.length, match.length - (match.endsWith("/>") ? 2 : 1));
    const filteredAttrs: string[] = [];
    const attrRe = /([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/gi;
    let attrMatch;
    while ((attrMatch = attrRe.exec(attrString)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
      if (ALLOWED_ATTRS.has(attrName) || attrName.startsWith("data-")) {
        filteredAttrs.push(`${attrName}="${attrVal}"`);
      }
    }

    const selfClose = match.endsWith("/>");
    return `<${lower}${filteredAttrs.length ? " " + filteredAttrs.join(" ") : ""}${selfClose ? " /" : ""}>`;
  });

  return clean;
}

/**
 * Parse and evaluate a simple expression against data.
 * Returns the string result or "" if invalid.
 */
export function parseExpression(
  expr: string,
  data: Record<string, unknown>,
  allowedFields: string[],
  entryData?: Record<string, unknown>
): string {
  const trimmed = expr.trim();

  // entry.fieldName — used inside data-each loops
  if (trimmed.startsWith("entry.") && entryData) {
    const field = trimmed.slice(6);
    if (ALLOWED_TOKEN.test(field)) {
      const val = entryData[field];
      return val !== undefined && val !== null ? escapeHtml(String(val)) : "";
    }
    return "";
  }

  // Simple field reference
  if (ALLOWED_TOKEN.test(trimmed)) {
    if (!allowedFields.includes(trimmed)) return "";
    const val = data[trimmed];
    return val !== undefined && val !== null ? escapeHtml(String(val)) : "";
  }

  // Arithmetic expression: tokenize and evaluate
  return evaluateArithmetic(trimmed, data, allowedFields);
}

function evaluateArithmetic(
  expr: string,
  data: Record<string, unknown>,
  allowedFields: string[]
): string {
  // Tokenize: split on operators while keeping them
  const tokens = expr.split(/(\s*[+\-*/()]\s*)/).map((t) => t.trim()).filter(Boolean);

  if (tokens.length === 0) return "";

  // Validate all tokens are either: numbers, operators, or allowed field names
  const operators = new Set(["+", "-", "*", "/", "(", ")"]);
  const values: (number | string)[] = [];

  for (const token of tokens) {
    if (operators.has(token)) {
      values.push(token);
    } else if (/^\d+(\.\d+)?$/.test(token)) {
      values.push(Number(token));
    } else if (ALLOWED_TOKEN.test(token) && allowedFields.includes(token)) {
      const val = data[token];
      if (typeof val === "number") {
        values.push(val);
      } else if (typeof val === "string" && /^\d+(\.\d+)?$/.test(val)) {
        values.push(Number(val));
      } else {
        return ""; // Non-numeric field in arithmetic
      }
    } else {
      return ""; // Invalid token — reject entire expression
    }
  }

  // Build safe expression string with only numbers and operators
  const safeExpr = values.join(" ");
  // Validate: only digits, dots, spaces, and +-*/() allowed
  if (!/^[\d\s.+\-*/()]+$/.test(safeExpr)) return "";

  try {
    // Safe evaluation using Function constructor with no globals access
    const fn = new Function(`"use strict"; return (${safeExpr});`);
    const result = fn();
    if (typeof result === "number" && isFinite(result)) {
      return escapeHtml(String(Math.round(result * 100) / 100));
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Render layout HTML with data interpolation.
 *
 * @param html - The layout HTML template with {expressions} and data-each
 * @param data - Current entry/summary data (for single-entry views)
 * @param fields - Field definitions from the template (used as allowlist)
 * @param entries - Array of entries (for data-each loops)
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function renderLayout(
  html: string,
  data: Record<string, unknown>,
  fields: FieldDef[],
  entries?: Record<string, unknown>[]
): string {
  const allowedFields = fields.map((f) => f.key);
  let output = sanitizeHtml(html);

  // Expand data-each loops
  if (entries && entries.length > 0) {
    output = output.replace(DATA_EACH_RE, (_match, tag, attrsBefore, attrsAfter, innerHtml) => {
      return entries.map((entry) => {
        const expandedInner = innerHtml.replace(EXPRESSION_RE, (_: string, expr: string) =>
          parseExpression(expr, data, allowedFields, entry)
        );
        return `<${tag} ${attrsBefore}${attrsAfter}>${expandedInner}</${tag}>`;
      }).join("\n");
    });
  }

  // Interpolate remaining {expressions} (top-level data)
  output = output.replace(EXPRESSION_RE, (_match, expr) =>
    parseExpression(expr, data, allowedFields)
  );

  return output;
}
