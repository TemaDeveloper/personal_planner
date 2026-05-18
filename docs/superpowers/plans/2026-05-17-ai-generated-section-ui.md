# AI-Generated Section UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI generates unique Tailwind HTML layouts for each custom section. Users modify layouts via an AI chat editor with live preview. Layouts render safely in production using a custom expression parser.

**Architecture:** A layout expression parser (`layout-renderer.ts`) handles `{field}` interpolation and `data-each` loops with a strict allowlist. Templates store `layoutHtml` alongside fields. An AI chat editor lets users refine the layout with a sandboxed iframe preview. Section pages and the dashboard day-detail use a `RenderedLayout` component when `layoutHtml` is available.

**Tech Stack:** Next.js 16, MongoDB/Mongoose, Tailwind CSS 4 (CDN for iframe), Framer Motion, AI providers (Anthropic/OpenAI/Google/Mistral via existing `src/lib/ai.ts` patterns)

**Spec:** `docs/superpowers/specs/2026-05-17-ai-generated-section-ui-design.md`

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/lib/layout-renderer.ts` | Expression parser + safe HTML renderer — `parseExpression()`, `renderLayout()` |
| `src/lib/__tests__/layout-renderer.test.ts` | Unit tests for the expression parser and renderer |
| `src/components/sections/rendered-layout.tsx` | React component that renders parsed `layoutHtml` with data |
| `src/components/sections/layout-editor.tsx` | AI chat editor: split view with chat panel + iframe preview + code toggle |
| `src/components/sections/layout-preview-frame.tsx` | Sandboxed iframe wrapper that receives data via postMessage |
| `src/app/api/sections/templates/[slug]/edit-layout/route.ts` | API endpoint for AI chat layout editing |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/models/section-template.ts` | Add `layoutHtml: String` field to schema + ISectionTemplate interface |
| `src/lib/ai.ts` | Add `layoutHtml` to SYSTEM_PROMPT, PlannerConfigSchema, and generation output |
| `src/app/(app)/sections/[slug]/page.tsx` | Use `RenderedLayout` when template has `layoutHtml` |
| `src/app/(app)/settings/page.tsx` | Add "Edit Layout" button for custom sections |
| `src/components/dashboard/dashboard-day-detail.tsx` | Use `RenderedLayout` for custom sections in day breakdown |

---

## Task 1: Expression parser and safe HTML renderer

**Files:**
- Create: `src/lib/layout-renderer.ts`
- Create: `src/lib/__tests__/layout-renderer.test.ts`

- [ ] **Step 1: Write tests for expression parsing**

Create `src/lib/__tests__/layout-renderer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseExpression, renderLayout } from "../layout-renderer";

describe("parseExpression", () => {
  const data = { salePrice: 100, purchasePrice: 60, itemName: "Monitor" };
  const fields = ["salePrice", "purchasePrice", "itemName"];

  it("resolves a simple field reference", () => {
    expect(parseExpression("salePrice", data, fields)).toBe("100");
  });

  it("resolves a text field", () => {
    expect(parseExpression("itemName", data, fields)).toBe("Monitor");
  });

  it("evaluates arithmetic: subtraction", () => {
    expect(parseExpression("salePrice - purchasePrice", data, fields)).toBe("40");
  });

  it("evaluates arithmetic: addition", () => {
    expect(parseExpression("salePrice + purchasePrice", data, fields)).toBe("160");
  });

  it("evaluates arithmetic: multiplication", () => {
    expect(parseExpression("salePrice * 2", data, fields)).toBe("200");
  });

  it("returns empty string for unknown field", () => {
    expect(parseExpression("unknownField", data, fields)).toBe("");
  });

  it("rejects function calls", () => {
    expect(parseExpression("alert(1)", data, fields)).toBe("");
  });

  it("rejects property chains beyond entry.x", () => {
    expect(parseExpression("window.location", data, fields)).toBe("");
  });
});

describe("renderLayout", () => {
  const fields = [
    { key: "salePrice", label: "Sale Price", type: "number" as const },
    { key: "itemName", label: "Item", type: "text" as const },
    { key: "purchasePrice", label: "Purchase Price", type: "number" as const },
  ];

  it("interpolates simple field values", () => {
    const html = '<div>{salePrice}</div>';
    const data = { salePrice: 250 };
    const result = renderLayout(html, data, fields);
    expect(result).toContain("250");
    expect(result).not.toContain("{salePrice}");
  });

  it("interpolates arithmetic expressions", () => {
    const html = '<div>{salePrice - purchasePrice}</div>';
    const data = { salePrice: 250, purchasePrice: 100 };
    const result = renderLayout(html, data, fields);
    expect(result).toContain("150");
  });

  it("expands data-each loops", () => {
    const html = '<div data-each="entries"><span>{entry.itemName}</span></div>';
    const entries = [
      { itemName: "Monitor A", salePrice: 200 },
      { itemName: "Monitor B", salePrice: 300 },
    ];
    const result = renderLayout(html, {}, fields, entries);
    expect(result).toContain("Monitor A");
    expect(result).toContain("Monitor B");
    expect(result).not.toContain("data-each");
  });

  it("escapes HTML in values to prevent XSS", () => {
    const html = '<div>{itemName}</div>';
    const data = { itemName: '<script>alert("xss")</script>' };
    const result = renderLayout(html, data, fields);
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("strips event handler attributes", () => {
    const html = '<div onclick="alert(1)">{salePrice}</div>';
    const data = { salePrice: 100 };
    const result = renderLayout(html, data, fields);
    expect(result).not.toContain("onclick");
  });

  it("strips script tags", () => {
    const html = '<script>alert(1)</script><div>{salePrice}</div>';
    const data = { salePrice: 100 };
    const result = renderLayout(html, data, fields);
    expect(result).not.toContain("<script>");
    expect(result).toContain("100");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/__tests__/layout-renderer.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the layout renderer**

Create `src/lib/layout-renderer.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/__tests__/layout-renderer.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/layout-renderer.ts src/lib/__tests__/layout-renderer.test.ts
git commit -m "feat: add layout expression parser with safe HTML rendering"
```

---

## Task 2: Add layoutHtml to SectionTemplate model

**Files:**
- Modify: `src/lib/models/section-template.ts`

- [ ] **Step 1: Add layoutHtml to the interface**

In `src/lib/models/section-template.ts`, add to the `ISectionTemplate` interface after `viewType`:

```typescript
layoutHtml: string;
```

- [ ] **Step 2: Add layoutHtml to the schema**

In the `SectionTemplateSchema` definition, add after the `viewType` field:

```typescript
layoutHtml: { type: String, default: "" },
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/section-template.ts
git commit -m "feat: add layoutHtml field to SectionTemplate model"
```

---

## Task 3: Add layoutHtml to AI generation

**Files:**
- Modify: `src/lib/ai.ts`

- [ ] **Step 1: Add layoutHtml to PlannerConfigSchema**

In `src/lib/ai.ts`, find the `customSections` array inside `PlannerConfigSchema` (around line 94-106). Add `layoutHtml` to each custom section object:

```typescript
customSections: z.array(z.object({
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  viewType: z.enum(["weekly-cards", "table", "grid"]).default("weekly-cards"),
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["boolean", "number", "text", "select", "date"]),
    options: z.array(z.string()).optional(),
    formula: z.string().optional(),
  })),
  layoutHtml: z.string().optional(),
})).optional(),
```

- [ ] **Step 2: Add layout instructions to SYSTEM_PROMPT**

In the `SYSTEM_PROMPT` string (around line 111), add these instructions after the custom sections field specification (after line 172 where it says `Formula: optional string expression...`):

```
layoutHtml: REQUIRED for custom sections. Generate a Tailwind CSS HTML layout that renders beautifully in dark mode.
  Rules for layoutHtml:
  - Use {fieldName} syntax for data binding (e.g., {salePrice}, {itemName})
  - Use {fieldA - fieldB} for arithmetic (e.g., {salePrice - purchasePrice})
  - Use data-each="entries" attribute for looping: <div data-each="entries"><span>{entry.fieldName}</span></div>
  - Use Tailwind CSS classes (dark theme: bg-white/5, text-white, text-white/60, etc.)
  - Use rounded corners (rounded-xl, rounded-2xl), subtle borders (border border-white/10)
  - Make it visually unique and beautiful — each section should feel custom-designed
  - No <script> tags, no onclick/onevent attributes
  - Keep it concise — dashboard card style, not a full page

EXAMPLE layoutHtml for a tire reselling section:
<div class="space-y-3">
  <div class="grid grid-cols-2 gap-3">
    <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <p class="text-xs text-emerald-400 mb-1">Revenue</p>
      <p class="text-2xl font-bold text-white">${salePrice}</p>
    </div>
    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <p class="text-xs text-blue-400 mb-1">Profit</p>
      <p class="text-2xl font-bold text-white">${salePrice - purchasePrice}</p>
    </div>
  </div>
  <div data-each="entries">
    <div class="flex items-center justify-between py-2 border-b border-white/5 text-sm">
      <span class="text-white">{entry.itemName}</span>
      <span class="text-emerald-400 font-medium">${entry.salePrice}</span>
    </div>
  </div>
</div>
```

Note: In the example, the literal dollar signs `$` before expressions are just visual currency symbols — the `{...}` part is what gets interpolated.

- [ ] **Step 3: Also add layoutHtml to the example JSON**

In the `SYSTEM_PROMPT` example (around line 177-197), add `layoutHtml` to the tire reselling example:

After `"fields": [...]`, add:

```json
"layoutHtml": "<div class=\"space-y-3\"><div class=\"grid grid-cols-2 gap-3\"><div class=\"p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20\"><p class=\"text-xs text-emerald-400 mb-1\">Revenue</p><p class=\"text-2xl font-bold text-white\">${salePrice}</p></div><div class=\"p-4 rounded-xl bg-blue-500/10 border border-blue-500/20\"><p class=\"text-xs text-blue-400 mb-1\">Profit</p><p class=\"text-2xl font-bold text-white\">${salePrice - purchasePrice}</p></div></div><div data-each=\"entries\"><div class=\"flex items-center justify-between py-2 border-b border-white/5 text-sm\"><span class=\"text-white\">{entry.itemName}</span><span class=\"text-emerald-400 font-medium\">${entry.salePrice}</span></div></div></div>"
```

- [ ] **Step 4: Store layoutHtml when saving templates**

Search for where custom sections from the AI response are saved to the database. This is in the onboarding flow or wherever `SectionTemplate.create()` is called with AI output. Ensure `layoutHtml` from the AI response is passed through to the model.

Look in `src/lib/ai.ts` for where `customSections` output is processed, and in `src/app/onboarding/page.tsx` or wherever templates are created from the AI config. Add `layoutHtml: section.layoutHtml || ""` to the create call.

- [ ] **Step 5: Verify build**

Run: `pnpm build`

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat: generate layoutHtml in AI onboarding for custom sections"
```

---

## Task 4: Create RenderedLayout component

**Files:**
- Create: `src/components/sections/rendered-layout.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useMemo } from "react";
import { renderLayout } from "@/lib/layout-renderer";

interface FieldDef {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
}

interface RenderedLayoutProps {
  layoutHtml: string;
  data: Record<string, unknown>;
  fields: FieldDef[];
  entries?: Record<string, unknown>[];
  className?: string;
}

export function RenderedLayout({
  layoutHtml,
  data,
  fields,
  entries,
  className,
}: RenderedLayoutProps) {
  const html = useMemo(
    () => renderLayout(layoutHtml, data, fields, entries),
    [layoutHtml, data, fields, entries]
  );

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sections/rendered-layout.tsx
git commit -m "feat: add RenderedLayout component for safe custom section rendering"
```

---

## Task 5: Use RenderedLayout on custom section pages

**Files:**
- Modify: `src/app/(app)/sections/[slug]/page.tsx`

- [ ] **Step 1: Import RenderedLayout**

Add at the top of `src/app/(app)/sections/[slug]/page.tsx`:

```tsx
import { RenderedLayout } from "@/components/sections/rendered-layout";
```

- [ ] **Step 2: Add layoutHtml to Template interface**

In the `Template` interface (around line 23-31), add:

```typescript
layoutHtml?: string;
```

- [ ] **Step 3: Render with RenderedLayout when layoutHtml exists**

Inside the page's return statement, before the existing `{template.viewType === "table" ? (...)` conditional (around line 112), add a check for `layoutHtml`:

```tsx
{/* AI-generated layout */}
{template.layoutHtml ? (
  <>
    {/* Week navigation (reuse existing) */}
    <div className="flex items-center justify-between mb-6">
      <Button variant="outline" size="icon" onClick={() => setWeekOffset((p) => p - 1)} aria-label="Previous week">
        <ChevronLeft size={16} />
      </Button>
      <span className="text-sm font-medium">{weekLabel}</span>
      <Button variant="outline" size="icon" onClick={() => setWeekOffset((p) => p + 1)} aria-label="Next week">
        <ChevronRight size={16} />
      </Button>
    </div>

    <RenderedLayout
      layoutHtml={template.layoutHtml}
      data={entries.length > 0 ? entries[entries.length - 1].data : {}}
      fields={template.fields}
      entries={entries.map((e) => e.data)}
    />
  </>
) : template.viewType === "table" ? (
  // ... existing table view
```

This keeps all existing views working. `layoutHtml` takes priority when present.

- [ ] **Step 4: Verify build**

Run: `pnpm build`

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/sections/\[slug\]/page.tsx
git commit -m "feat: render AI-generated layout on custom section pages"
```

---

## Task 6: Use RenderedLayout in dashboard day-detail

**Files:**
- Modify: `src/components/dashboard/dashboard-day-detail.tsx`

- [ ] **Step 1: Import RenderedLayout**

Add import at the top:

```tsx
import { RenderedLayout } from "@/components/sections/rendered-layout";
```

- [ ] **Step 2: Update CustomSectionData interface**

Add `layoutHtml` to the template object inside `CustomSectionData`:

```typescript
interface CustomSectionData {
  template: { name: string; slug: string; icon: string; fields: CustomField[]; layoutHtml?: string };
  entries: { _id: string; date: string; data: Record<string, unknown> }[];
}
```

- [ ] **Step 3: Update CustomSectionRenderer to use RenderedLayout**

Replace the `CustomSectionRenderer` function. If `layoutHtml` exists, use `RenderedLayout`; otherwise fall back to the existing generic field renderer:

```tsx
function CustomSectionRenderer({ data, date, onRefresh }: {
  data: CustomSectionData; date: string; onRefresh: () => void;
}) {
  const { template, entries } = data;

  if (template.layoutHtml) {
    const summaryData: Record<string, unknown> = {};
    // Aggregate number fields across entries for summary
    for (const field of template.fields) {
      if (field.type === "number") {
        summaryData[field.key] = entries.reduce(
          (sum, e) => sum + (Number(e.data[field.key]) || 0), 0
        );
      } else if (entries.length > 0) {
        summaryData[field.key] = entries[entries.length - 1].data[field.key];
      }
    }

    return (
      <RenderedLayout
        layoutHtml={template.layoutHtml}
        data={summaryData}
        fields={template.fields}
        entries={entries.map((e) => e.data)}
      />
    );
  }

  // Fallback: generic field display (existing code)
  const displayFields = template.fields.filter((f) => f.type !== "boolean");
  const booleanFields = template.fields.filter((f) => f.type === "boolean");

  const formatValue = (field: CustomField, value: unknown): string => {
    if (value === undefined || value === null) return "—";
    if (field.type === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div key={entry._id} className="flex items-center justify-between text-sm group">
          <div className="flex flex-wrap gap-2 items-center">
            {displayFields.map((f) => (
              <span key={f.key}>
                <span className="text-[var(--text-muted)] text-xs">{f.label}:</span>{" "}
                <span className="font-medium">{formatValue(f, entry.data[f.key])}</span>
              </span>
            ))}
            {booleanFields.map((f) =>
              entry.data[f.key] ? (
                <span key={f.key} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: "var(--accent-glow)", color: "var(--accent-color)" }}>
                  {f.label}
                </span>
              ) : null
            )}
          </div>
          <button
            onClick={async () => {
              await fetch(`/api/sections/${template.slug}/entries/${entry._id}`, { method: "DELETE" });
              toast.success("Deleted");
              onRefresh();
            }}
            className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete entry"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Update the API to include layoutHtml**

In `src/app/api/dashboard/day-detail/route.ts`, find where custom section results are built (inside the `for (const template of templates)` loop). The template data already includes fields — add `layoutHtml`:

```typescript
template: {
  name: template.name,
  slug: template.slug,
  icon: template.icon,
  fields: template.fields,
  layoutHtml: template.layoutHtml || "",
},
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/dashboard-day-detail.tsx src/app/api/dashboard/day-detail/route.ts
git commit -m "feat: use AI-generated layout in dashboard day breakdown"
```

---

## Task 7: Create the AI chat layout editor API

**Files:**
- Create: `src/app/api/sections/templates/[slug]/edit-layout/route.ts`

- [ ] **Step 1: Create the edit-layout API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";
import { callAI } from "@/lib/ai";

export const maxDuration = 30;

const LAYOUT_EDIT_SYSTEM_PROMPT = `You are a UI designer that modifies HTML layouts for a personal planner app.

You receive:
1. The current HTML layout (Tailwind CSS)
2. The available data fields
3. A user request to modify the layout

Rules:
- Output ONLY the complete updated HTML. No explanation, no markdown fences.
- Use Tailwind CSS classes. Dark theme: bg-white/5, text-white, text-white/60, border-white/10, etc.
- Use {fieldName} for data binding. Use {fieldA - fieldB} for arithmetic.
- Use data-each="entries" for loops with {entry.fieldName} inside.
- No <script> tags. No onclick or event handler attributes.
- Make it beautiful: rounded corners, subtle gradients, spacing, visual hierarchy.
- Keep the layout concise — card/dashboard style.`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { slug } = await params;

  const template = await SectionTemplate.findOne({ slug });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await req.json();
  const { prompt, currentHtml } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const user = await User.findById(userId).lean();
  const aiProvider = user?.aiConfig?.provider || "mistral";
  const aiApiKey = user?.aiConfig?.apiKey || "";

  const fieldsDescription = template.fields
    .map((f) => `${f.key} (${f.type}): ${f.label}`)
    .join("\n");

  const userMessage = `Current HTML layout:
\`\`\`html
${currentHtml || template.layoutHtml || "<div>No layout yet</div>"}
\`\`\`

Available fields:
${fieldsDescription}

User request: ${prompt}

Return ONLY the updated HTML:`;

  try {
    const html = await callAI(aiProvider, aiApiKey, LAYOUT_EDIT_SYSTEM_PROMPT, userMessage);

    // Clean up: remove markdown fences if the AI wrapped it
    const cleaned = html
      .replace(/^```html?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    // Optionally save to template
    if (body.save) {
      template.layoutHtml = cleaned;
      await template.save();
    }

    return NextResponse.json({ html: cleaned });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message.slice(0, 200) }, { status: 500 });
  }
}
```

Note: This uses a `callAI` function. Check if `src/lib/ai.ts` already exports a generic AI call function. If not, you'll need to add one that takes `(provider, apiKey, systemPrompt, userMessage)` and returns the text response. Look at how `generateWithDefaultAI` works and extract a reusable function.

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sections/templates/\[slug\]/edit-layout/route.ts
git commit -m "feat: add AI chat endpoint for layout editing"
```

---

## Task 8: Create the layout editor UI

**Files:**
- Create: `src/components/sections/layout-editor.tsx`

- [ ] **Step 1: Create the layout editor component**

This is the main editor: split view with AI chat on left, sandboxed iframe preview on right, toggle to code view.

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Send, Code, MessageSquare, Save } from "lucide-react";

interface FieldDef {
  key: string;
  label: string;
  type: string;
}

interface LayoutEditorProps {
  slug: string;
  fields: FieldDef[];
  initialHtml: string;
  open: boolean;
  onClose: () => void;
  onSave: (html: string) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function LayoutEditor({ slug, fields, initialHtml, open, onClose, onSave }: LayoutEditorProps) {
  const [html, setHtml] = useState(initialHtml);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Send data to iframe preview
  const updatePreview = useCallback((layoutHtml: string) => {
    if (!iframeRef.current?.contentWindow) return;
    const sampleData: Record<string, unknown> = {};
    const sampleEntries: Record<string, unknown>[] = [];

    // Generate sample data from fields
    for (const f of fields) {
      if (f.type === "number") sampleData[f.key] = Math.floor(Math.random() * 500) + 50;
      else if (f.type === "text") sampleData[f.key] = `Sample ${f.label}`;
      else if (f.type === "boolean") sampleData[f.key] = true;
      else if (f.type === "date") sampleData[f.key] = new Date().toISOString().split("T")[0];
      else if (f.type === "select") sampleData[f.key] = "Option A";
    }

    // Generate 3 sample entries
    for (let i = 0; i < 3; i++) {
      const entry: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.type === "number") entry[f.key] = Math.floor(Math.random() * 500) + 50;
        else if (f.type === "text") entry[f.key] = `Item ${i + 1}`;
        else if (f.type === "boolean") entry[f.key] = i % 2 === 0;
        else entry[f.key] = sampleData[f.key];
      }
      sampleEntries.push(entry);
    }

    iframeRef.current.contentWindow.postMessage({
      type: "render",
      html: layoutHtml,
      data: sampleData,
      entries: sampleEntries,
      fields: fields.map((f) => f.key),
    }, "*");
  }, [fields]);

  useEffect(() => {
    if (open) updatePreview(html);
  }, [open, html, updatePreview]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/sections/templates/${slug}/edit-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg.content, currentHtml: html }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setHtml(data.html);
      setMessages((prev) => [...prev, { role: "assistant", content: "Done! Preview updated." }]);
      updatePreview(data.html);
    } catch {
      toast.error("Failed to update layout");
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    }

    setLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSave = async () => {
    try {
      await fetch(`/api/sections/templates/${slug}/edit-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "save", currentHtml: html, save: true }),
      });
      toast.success("Layout saved");
      onSave(html);
      onClose();
    } catch {
      toast.error("Failed to save");
    }
  };

  const previewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"></script>
<style>body{background:#0a0a0a;color:#fff;font-family:system-ui;padding:16px;margin:0;}</style>
</head><body>
<div id="root"></div>
<script>
window.addEventListener("message", (e) => {
  if (e.data?.type !== "render") return;
  const { html, data, entries, fields } = e.data;
  let output = html;
  // Expand data-each
  const eachRe = /<([a-z][a-z0-9]*)\\s([^>]*?)data-each="entries"([^>]*)>([\\s\\S]*?)<\\/\\1>/gi;
  if (entries?.length) {
    output = output.replace(eachRe, (_, tag, a1, a2, inner) =>
      entries.map(entry => {
        let r = inner.replace(/\\{entry\\.([^}]+)\\}/g, (_, k) => entry[k] ?? "");
        return "<"+tag+" "+a1+a2+">"+r+"</"+tag+">";
      }).join("")
    );
  }
  // Interpolate {expressions}
  output = output.replace(/\\{([^}]+)\\}/g, (_, expr) => {
    expr = expr.trim();
    if (data[expr] !== undefined) return String(data[expr]);
    // Try arithmetic
    const tokens = expr.split(/([+\\-*/])/).map(t => t.trim()).filter(Boolean);
    if (tokens.length > 1) {
      try {
        const safe = tokens.map(t => {
          if (/^\\d+(\\.\\d+)?$/.test(t)) return t;
          if ("+-*/".includes(t)) return t;
          if (data[t] !== undefined) return Number(data[t]);
          return 0;
        }).join(" ");
        return String(Math.round(eval(safe) * 100) / 100);
      } catch { return ""; }
    }
    return "";
  });
  document.getElementById("root").innerHTML = output;
});
</script>
</body></html>`)}`;

  return (
    <Modal open={open} onClose={onClose} title="Edit Layout" maxWidth="max-w-4xl">
      <div className="flex gap-0 -mx-6 -mb-6 h-[70vh]">
        {/* Left panel: chat or code */}
        <div className="flex-1 flex flex-col border-r border-[var(--border-subtle)]">
          {/* Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)]">
            <Button
              size="sm"
              variant={showCode ? "ghost" : "secondary"}
              onClick={() => setShowCode(false)}
            >
              <MessageSquare size={14} /> Chat
            </Button>
            <Button
              size="sm"
              variant={showCode ? "secondary" : "ghost"}
              onClick={() => setShowCode(true)}
            >
              <Code size={14} /> Code
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="primary" onClick={handleSave}>
              <Save size={14} /> Save
            </Button>
          </div>

          {showCode ? (
            <textarea
              value={html}
              onChange={(e) => {
                setHtml(e.target.value);
                updatePreview(e.target.value);
              }}
              className="flex-1 bg-transparent p-4 font-mono text-xs resize-none outline-none"
              style={{ color: "var(--text-primary)" }}
              spellCheck={false}
            />
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center mt-8">
                    Describe how you want your section to look. The AI will update the layout.
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-xs p-3 rounded-xl max-w-[85%] ${
                      msg.role === "user"
                        ? "ml-auto surface-inset"
                        : "mr-auto"
                    }`}
                    style={{
                      background: msg.role === "assistant" ? "var(--accent-glow)" : undefined,
                      color: msg.role === "assistant" ? "var(--accent-color)" : "var(--text-primary)",
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
                {loading && (
                  <div className="text-xs text-[var(--text-muted)] animate-pulse">Thinking...</div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-[var(--border-subtle)]">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Describe changes..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: iframe preview */}
        <div className="flex-1 bg-black">
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts"
            src={previewSrc}
            className="w-full h-full border-0"
            title="Layout preview"
            onLoad={() => updatePreview(html)}
          />
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/layout-editor.tsx
git commit -m "feat: add AI chat layout editor with live iframe preview"
```

---

## Task 9: Add "Edit Layout" button to settings

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Read the settings page to find where custom sections are displayed**

Read `src/app/(app)/settings/page.tsx` and find the section that renders custom section toggles/management. Add an "Edit Layout" button next to each custom section.

- [ ] **Step 2: Import and integrate LayoutEditor**

Add the import:
```tsx
import { LayoutEditor } from "@/components/sections/layout-editor";
```

Add state for the editor:
```tsx
const [editingLayout, setEditingLayout] = useState<{ slug: string; fields: FieldDef[]; layoutHtml: string } | null>(null);
```

For each custom section in the settings UI, add an "Edit Layout" button that opens the editor:
```tsx
<Button
  size="sm"
  variant="ghost"
  onClick={() => setEditingLayout({
    slug: cs.slug,
    fields: cs.fields || [],
    layoutHtml: cs.layoutHtml || "",
  })}
>
  <Pencil size={14} /> Edit Layout
</Button>
```

Render the editor modal at the bottom of the page:
```tsx
{editingLayout && (
  <LayoutEditor
    slug={editingLayout.slug}
    fields={editingLayout.fields}
    initialHtml={editingLayout.layoutHtml}
    open={!!editingLayout}
    onClose={() => setEditingLayout(null)}
    onSave={() => setEditingLayout(null)}
  />
)}
```

Note: The settings page may need to fetch template details (including fields and layoutHtml) for each custom section. Check how custom sections are currently rendered and whether template data is already available.

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/settings/page.tsx
git commit -m "feat: add Edit Layout button for custom sections in settings"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run tests**

Run: `pnpm test`

Expected: All tests pass including the new layout-renderer tests.

- [ ] **Step 2: Run lint**

Run: `pnpm lint 2>&1 | grep -E "layout-renderer|rendered-layout|layout-editor|edit-layout" | head -10`

Fix any lint errors in new files.

- [ ] **Step 3: Production build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 4: Push**

```bash
git push origin main
```
