# AI-Generated Section UI

**Date:** 2026-05-17  
**Scope:** AI generates unique Tailwind HTML per custom section, users edit via AI chat, safe rendering in production

---

## Overview

Each custom section gets a unique AI-generated UI layout stored as Tailwind HTML. Users can modify it via an AI chat editor with live preview. The system uses a hybrid security model: sandboxed iframe for editing/preview, safe parsed rendering for production.

## Security Model — Hybrid

### Editor (sandboxed iframe)
- Live preview renders in `<iframe sandbox="allow-scripts">` — no access to parent page, cookies, localStorage, or APIs
- Data injected via `postMessage` from parent → iframe
- User can write any HTML/CSS/Tailwind freely in the editor
- AI generates and modifies HTML in response to chat prompts

### Production (safe parsed rendering)
- At save time, HTML is parsed and sanitized
- A safe renderer interpolates data values and renders as React
- No `dangerouslySetInnerHTML` with raw user input — all expressions are parsed and values are text-escaped
- Expression parser only allows: field name references, arithmetic operators (`+ - * /`), number literals, and `entry.fieldName` inside loops
- No function calls, no arbitrary JS, no event handlers in output

## Data Binding Syntax

JSX-style curly braces parsed by a custom expression evaluator (not `eval`):

```html
<!-- Single value -->
<div class="text-2xl font-bold">{salePrice}</div>

<!-- Simple arithmetic expression -->
<div class="text-green-400">Profit: {salePrice - purchasePrice}</div>

<!-- Loop over entries -->
<div data-each="entries">
  <div class="flex justify-between py-2 border-b border-white/10">
    <span>{entry.itemName}</span>
    <span>${entry.salePrice}</span>
  </div>
</div>
```

### Expression Parser Rules
- Allowed tokens: field names (alphanumeric + underscore), numbers, `+ - * / ( )`, `entry.` prefix
- All field names validated against the template's `fields` array at parse time
- Output is always `String()` coerced — never raw HTML injection
- Unknown field names render as empty string

## Storage

### SectionTemplate model changes

Add one new field:

```typescript
layoutHtml: { type: String, default: "" }
```

- Generated during onboarding alongside `fields`, `viewType`, etc.
- Updated via the AI chat editor
- Empty string means "use default table/card view" (backwards compatible)

## AI Chat Editor

### Access
Settings → Custom Section → "Edit Layout" button

### UI Layout
- Split view: AI chat panel (left), live iframe preview (right)
- Chat panel: message history + text input
- Preview panel: sandboxed iframe rendering current `layoutHtml` with sample data
- Toggle button: switch between chat view and raw code editor (CodeMirror or textarea)
- "Save" button commits the current HTML to the template

### Chat Flow
1. User types: "Make the profit card green and bigger"
2. Frontend sends to API: `{ prompt: "...", currentHtml: "...", fields: [...] }`
3. API calls AI (using user's configured AI provider) to modify the HTML
4. API returns updated HTML
5. Frontend updates iframe preview via `postMessage`
6. User can keep chatting or save

### API Endpoint

`POST /api/sections/templates/[slug]/edit-layout`

**Request:**
```json
{
  "prompt": "Make the profit card green and bigger",
  "currentHtml": "<div class=\"grid grid-cols-2...\">...</div>",
  "fields": [{ "key": "salePrice", "label": "Sale Price", "type": "number" }, ...]
}
```

**Response:**
```json
{
  "html": "<div class=\"grid grid-cols-2...\">...updated...</div>"
}
```

The AI system prompt instructs the model to:
- Only output valid HTML with Tailwind classes
- Use `{fieldName}` syntax for data binding
- Use `data-each="entries"` for loops with `{entry.fieldName}`
- Use dark theme styling (matches the app)
- Never include `<script>` tags or event handler attributes

## Initial Generation

During onboarding, when the AI generates a custom section's fields, it also generates `layoutHtml` in the same call. The system prompt includes instructions for the data binding syntax.

### Changes to onboarding generation
- Add `layoutHtml` to the AI generation prompt and response schema
- Store it on the SectionTemplate alongside fields

## Rendering Pipeline

### Editor Preview (iframe)
1. Load `layoutHtml` from template
2. Build a preview HTML document: Tailwind CDN + layout HTML + helper script
3. Parent sends sample data via `postMessage`
4. Iframe helper script receives data, evaluates `{expressions}` and `data-each` loops, updates DOM
5. Result shown in sandboxed iframe

### Production Rendering (React)
1. Load `layoutHtml` from template
2. `parseLayoutHtml(html, fields)` → validates all expressions against field allowlist
3. `renderLayout(parsedHtml, data)` → interpolates values, expands loops, returns sanitized HTML string
4. Render via `dangerouslySetInnerHTML` on a contained div (safe because all expressions are pre-validated and values are escaped)

### Fallback
If `layoutHtml` is empty or fails to parse, fall back to the existing table/card view (`TableView` / weekly cards).

## Files

### New Files
| File | Purpose |
|------|---------|
| `src/lib/layout-renderer.ts` | Expression parser + safe HTML renderer |
| `src/components/sections/layout-editor.tsx` | AI chat editor with split preview |
| `src/components/sections/layout-preview-frame.tsx` | Sandboxed iframe wrapper |
| `src/components/sections/rendered-layout.tsx` | Production layout renderer component |
| `src/app/api/sections/templates/[slug]/edit-layout/route.ts` | AI chat endpoint for layout editing |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/models/section-template.ts` | Add `layoutHtml` field |
| `src/app/api/onboarding/generate/route.ts` | Generate `layoutHtml` alongside fields |
| `src/app/(app)/sections/[slug]/page.tsx` | Use `RenderedLayout` when `layoutHtml` exists |
| `src/app/(app)/settings/page.tsx` | Add "Edit Layout" button for custom sections |
| `src/components/dashboard/dashboard-day-detail.tsx` | Use `RenderedLayout` for custom sections in day breakdown |
