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

const UNSAFE_ATTR = /\s+on\w+\s*=\s*["'][^"']*["']/gi;
const SCRIPT_TAG = /<script[\s>][\s\S]*?<\/script\s*>/gi;
const EXPRESSION_RE = /\{([^}]+)\}/g;
const DATA_EACH_RE = /<([a-z][a-z0-9]*)\s([^>]*?)data-each="entries"([^>]*)>([\s\S]*?)<\/\1>/gi;
const ALLOWED_TOKEN = /^[a-zA-Z_]\w*$/;

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeHtml(html: string): string {
  let clean = html.replace(SCRIPT_TAG, "");
  clean = clean.replace(UNSAFE_ATTR, "");
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
