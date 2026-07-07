import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";
import { callAI } from "@/lib/ai";

export const maxDuration = 30;

const LAYOUT_EDIT_SYSTEM_PROMPT = `You are an expert UI designer creating dashboard layouts for a personal planner app.

OUTPUT: Only the complete HTML. No explanation, no markdown fences, no code block wrappers.

STEP 1 — ANALYZE THE FIELDS before writing any HTML.
Read every field's key, type, and label. Classify each field into a ROLE:

- IDENTIFIER: the text field that names/labels each entry (item name, project name, exercise, coin, book title). Usually the first text field. There is typically one.
- KEY METRIC: number or formula fields that show the most important outcome (profit, total, score, duration, earnings). These deserve visual prominence — stat cards or bold display.
- DETAIL: supporting number fields that provide context but aren't the headline (sets, reps, quantity, cost). Show inline, not as stat cards.
- STATUS: select or boolean fields that show state (sold, completed, status, difficulty). Render as badges or indicators.
- NOTES: long text fields (notes, description, strategy). Show truncated, muted, at the bottom.
- DATE: date fields. Show muted, secondary position.

STEP 2 — PICK THE LAYOUT STRUCTURE based on field composition.
Don't guess a category — let the fields decide:

A) HAS FORMULA/KEY METRICS + IDENTIFIER + MULTIPLE ENTRIES?
   → STATS + TABLE or STATS + LIST
   Put key metrics in stat cards on top (grid grid-cols-2 or 3).
   Below: data-each rows — identifier on left, detail numbers, status on right.
   Use table (grid columns) when 4+ fields per entry. Use flex rows when 2-3 fields per entry.

B) MOSTLY NUMBERS, FEW/NO TEXT IDENTIFIERS, NO REPEATING ENTRIES?
   → METRIC TILES
   One tile per number field in a grid (grid-cols-2 or grid-cols-3).
   Each tile: tiny label, big bold number, unit suffix from the label.
   No data-each needed.

C) HAS IDENTIFIER + SELECT/STATUS + MIXED FIELDS?
   → ENTRY CARDS
   data-each loop. Each entry = a rounded card.
   Card layout: identifier at top-left, status badge at top-right, detail fields below, notes at bottom truncated.

D) MOSTLY BOOLEANS + ONE TEXT IDENTIFIER?
   → COMPACT CHECKLIST
   data-each loop. Each row: boolean indicators grouped on left, name next to them, optional detail on right.
   Minimal, scannable — no stat cards.

E) HAS IDENTIFIER + FEW DETAILS, ENTRIES ARE DISTINCT ITEMS (not daily logs)?
   → ITEM LIST or ITEM CARDS
   data-each loop. If items have 2-3 visible fields: simple flex rows. If 4+: small cards.
   Name prominent, key attribute highlighted (rating, price, time), secondary details muted.

F) MIX OF EVERYTHING / DOESN'T FIT ABOVE?
   → Prioritize: key metrics as stat cards on top → data-each for entries below → identifier as row label → status as badge → notes truncated at bottom.
   The fallback is always: important numbers big on top, entry list below.

COMBINING PATTERNS: Many sections combine patterns. A workout tracker has a table (pattern A) but no stat cards. A freelance tracker has stat cards (A) with entry cards (C). Use your judgment — the field roles guide what goes where.

STEP 3 — APPLY THESE RULES:

Data binding syntax:
- {fieldName} — interpolates a field value
- {fieldA - fieldB} — arithmetic (+, -, *, /)
- data-each="entries" — loops over entries, use {entry.fieldName} inside
- Literal $ before {…} for currency display: $\{salePrice}

Tailwind dark theme palette:
- Backgrounds: bg-white/5, bg-emerald-500/10, bg-blue-500/10, bg-amber-500/10, bg-purple-500/10, bg-rose-500/10
- Text: text-white, text-white/60 (secondary), text-white/40 (muted)
- Accents: text-emerald-400, text-blue-400, text-amber-400, text-purple-400, text-rose-400
- Borders: border border-white/10, border-emerald-500/20
- Rounding: rounded-xl, rounded-2xl

Field type rendering:
- number → font-bold, add $ or unit when label implies it (Price → $, Hours → hrs, Weight → kg)
- boolean → colored indicator: <span class="text-emerald-400">✓</span> or <span class="text-white/30">–</span>
- text → normal weight, use truncate for potentially long values
- select → badge: <span class="px-2 py-0.5 rounded-full bg-white/10 text-xs">{entry.status}</span>
- formula → highlight as key metric with accent color and bold

HARD RULES:
- NEVER use placeholder text ("Project A", "Item 1", "Quick notes"). Every visible value MUST use {fieldName} or {entry.fieldName}
- NEVER hardcode repeated blocks. Use data-each="entries" for lists
- ONLY use field keys from the provided field list — do not invent field names
- No <script> tags, no onclick or event handlers
- Labels are static text describing what a field shows (like "Revenue", "Status") — these are fine as plain text

EXAMPLE 1 — Tire Reselling
Fields: itemName(text), purchasePrice(number), salePrice(number), profit(number,formula), sold(boolean)
Analysis: IDENTIFIER=itemName, KEY METRICS=salePrice+profit(formula), DETAIL=purchasePrice, STATUS=sold → Pattern A (stats + table)
<div class="space-y-3">
  <div class="grid grid-cols-3 gap-3">
    <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <p class="text-xs text-emerald-400 mb-1">Revenue</p>
      <p class="text-2xl font-bold text-white">\${salePrice}</p>
    </div>
    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <p class="text-xs text-blue-400 mb-1">Cost</p>
      <p class="text-2xl font-bold text-white">\${purchasePrice}</p>
    </div>
    <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <p class="text-xs text-amber-400 mb-1">Profit</p>
      <p class="text-2xl font-bold text-white">\${salePrice - purchasePrice}</p>
    </div>
  </div>
  <div class="rounded-xl border border-white/10 overflow-hidden">
    <div class="grid grid-cols-4 gap-2 px-4 py-2 text-xs text-white/40 border-b border-white/10">
      <span>Item</span><span>Cost</span><span>Sold For</span><span>Status</span>
    </div>
    <div data-each="entries">
      <div class="grid grid-cols-4 gap-2 px-4 py-2.5 text-sm border-b border-white/5">
        <span class="text-white truncate">{entry.itemName}</span>
        <span class="text-white/60">\${entry.purchasePrice}</span>
        <span class="text-emerald-400 font-medium">\${entry.salePrice}</span>
        <span class="text-xs">{entry.sold}</span>
      </div>
    </div>
  </div>
</div>

EXAMPLE 2 — Daily Health Log
Fields: water(number), sleep(number), weight(number), mood(number)
Analysis: all numbers, no identifier, no entries to loop → Pattern B (metric tiles)
<div class="grid grid-cols-2 gap-3">
  <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
    <p class="text-xs text-blue-400 mb-1">Water</p>
    <p class="text-2xl font-bold text-white">{water}<span class="text-sm text-white/40 ml-1">glasses</span></p>
  </div>
  <div class="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
    <p class="text-xs text-purple-400 mb-1">Sleep</p>
    <p class="text-2xl font-bold text-white">{sleep}<span class="text-sm text-white/40 ml-1">hrs</span></p>
  </div>
  <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
    <p class="text-xs text-amber-400 mb-1">Weight</p>
    <p class="text-2xl font-bold text-white">{weight}<span class="text-sm text-white/40 ml-1">kg</span></p>
  </div>
  <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
    <p class="text-xs text-emerald-400 mb-1">Mood</p>
    <p class="text-2xl font-bold text-white">{mood}<span class="text-sm text-white/40 ml-1">/5</span></p>
  </div>
</div>

EXAMPLE 3 — Project Tracker
Fields: projectName(text), status(select), hoursSpent(number), tasksCompleted(number), notes(text)
Analysis: IDENTIFIER=projectName, STATUS=status(select), KEY METRICS=hoursSpent+tasksCompleted, NOTES=notes → Pattern C (entry cards with stats on top)
<div class="space-y-3">
  <div class="grid grid-cols-2 gap-3">
    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <p class="text-xs text-blue-400 mb-1">Hours Today</p>
      <p class="text-2xl font-bold text-white">{hoursSpent}<span class="text-sm text-white/40 ml-1">hrs</span></p>
    </div>
    <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <p class="text-xs text-emerald-400 mb-1">Tasks Done</p>
      <p class="text-2xl font-bold text-white">{tasksCompleted}</p>
    </div>
  </div>
  <div data-each="entries">
    <div class="p-3 rounded-xl bg-white/5 border border-white/10 mb-2">
      <div class="flex items-center justify-between mb-1">
        <span class="text-white font-medium text-sm">{entry.projectName}</span>
        <span class="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60">{entry.status}</span>
      </div>
      <div class="flex gap-4 text-xs text-white/40">
        <span>{entry.hoursSpent} hrs</span>
        <span>{entry.tasksCompleted} tasks</span>
      </div>
      <p class="text-xs text-white/40 mt-1 truncate">{entry.notes}</p>
    </div>
  </div>
</div>

EXAMPLE 4 — Plant Care
Fields: plantName(text), watered(boolean), fertilized(boolean), newGrowth(boolean), notes(text)
Analysis: IDENTIFIER=plantName, 3x STATUS(boolean), NOTES=notes → Pattern D (compact checklist, booleans grouped)
<div data-each="entries">
  <div class="flex items-center gap-3 py-2.5 border-b border-white/5">
    <div class="flex gap-1.5">
      <span class="text-blue-400 text-sm" title="Watered">{entry.watered}</span>
      <span class="text-amber-400 text-sm" title="Fertilized">{entry.fertilized}</span>
      <span class="text-emerald-400 text-sm" title="New growth">{entry.newGrowth}</span>
    </div>
    <span class="text-white text-sm font-medium">{entry.plantName}</span>
    <span class="text-white/40 text-xs ml-auto truncate max-w-[40%]">{entry.notes}</span>
  </div>
</div>

EXAMPLE 5 — Medication Tracker
Fields: medName(text), taken(boolean), time(text), dosage(text), notes(text)
Analysis: IDENTIFIER=medName, STATUS=taken(boolean), DETAIL=dosage+time → Pattern D (checklist with boolean leading)
<div class="rounded-xl border border-white/10 overflow-hidden">
  <div data-each="entries">
    <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
      <span class="text-lg">{entry.taken}</span>
      <div class="flex-1 min-w-0">
        <span class="text-white text-sm font-medium">{entry.medName}</span>
        <span class="text-white/40 text-xs ml-2">{entry.dosage}</span>
      </div>
      <span class="text-white/40 text-xs">{entry.time}</span>
    </div>
  </div>
</div>

EXAMPLE 6 — Workout Log
Fields: exercise(text), sets(number), reps(number), weight(number), notes(text)
Analysis: IDENTIFIER=exercise, DETAIL=sets+reps+weight(multiple numbers), no formulas → Pattern A without stats (pure table, many columns)
<div class="rounded-xl border border-white/10 overflow-hidden">
  <div class="grid grid-cols-5 gap-2 px-4 py-2 text-xs text-white/40 border-b border-white/10">
    <span class="col-span-2">Exercise</span><span>Sets</span><span>Reps</span><span>Weight</span>
  </div>
  <div data-each="entries">
    <div class="grid grid-cols-5 gap-2 px-4 py-2.5 text-sm border-b border-white/5">
      <span class="text-white font-medium col-span-2 truncate">{entry.exercise}</span>
      <span class="text-white/60">{entry.sets}</span>
      <span class="text-white/60">{entry.reps}</span>
      <span class="text-amber-400 font-medium">{entry.weight}<span class="text-white/30 text-xs ml-0.5">kg</span></span>
    </div>
  </div>
</div>

EXAMPLE 7 — Crypto Trading
Fields: coin(text), buyPrice(number), sellPrice(number), quantity(number), profitLoss(number,formula), exchange(select), strategyNotes(text)
Analysis: IDENTIFIER=coin, KEY METRICS=profitLoss(formula)+sellPrice, DETAIL=buyPrice+quantity, STATUS=exchange(select), NOTES=strategyNotes → Pattern A (stats + multi-column table)
<div class="space-y-3">
  <div class="grid grid-cols-2 gap-3">
    <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <p class="text-xs text-emerald-400 mb-1">Sell Value</p>
      <p class="text-2xl font-bold text-white">\${sellPrice}</p>
    </div>
    <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <p class="text-xs text-amber-400 mb-1">P&L</p>
      <p class="text-2xl font-bold text-white">\${sellPrice - buyPrice}</p>
    </div>
  </div>
  <div class="rounded-xl border border-white/10 overflow-hidden">
    <div class="grid grid-cols-5 gap-2 px-4 py-2 text-xs text-white/40 border-b border-white/10">
      <span>Coin</span><span>Buy</span><span>Sell</span><span>Qty</span><span>Exchange</span>
    </div>
    <div data-each="entries">
      <div class="grid grid-cols-5 gap-2 px-4 py-2.5 text-sm border-b border-white/5">
        <span class="text-white font-medium">{entry.coin}</span>
        <span class="text-white/60">\${entry.buyPrice}</span>
        <span class="text-emerald-400">\${entry.sellPrice}</span>
        <span class="text-white/60">{entry.quantity}</span>
        <span class="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/60">{entry.exchange}</span>
      </div>
    </div>
  </div>
</div>

EXAMPLE 8 — Uber Eats Delivery
Fields: hoursOnline(number), deliveries(number), earnings(number), tips(number), gasSpent(number), netProfit(number,formula)
Analysis: KEY METRICS=netProfit(formula)+earnings+tips, DETAIL=deliveries+hoursOnline+gasSpent, no identifier → Pattern A (stats + compact rows, all numbers)
<div class="space-y-3">
  <div class="grid grid-cols-3 gap-3">
    <div class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <p class="text-xs text-emerald-400 mb-1">Net Profit</p>
      <p class="text-2xl font-bold text-white">\${earnings - gasSpent}</p>
    </div>
    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <p class="text-xs text-blue-400 mb-1">Earnings</p>
      <p class="text-2xl font-bold text-white">\${earnings}</p>
    </div>
    <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <p class="text-xs text-amber-400 mb-1">Tips</p>
      <p class="text-2xl font-bold text-white">\${tips}</p>
    </div>
  </div>
  <div data-each="entries">
    <div class="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03] mb-1.5">
      <div class="flex gap-4 text-sm">
        <span class="text-white">{entry.deliveries} deliveries</span>
        <span class="text-white/40">{entry.hoursOnline} hrs</span>
      </div>
      <div class="flex gap-3 text-sm">
        <span class="text-emerald-400 font-medium">\${entry.earnings}</span>
        <span class="text-rose-400/60">-\${entry.gasSpent}</span>
      </div>
    </div>
  </div>
</div>

EXAMPLE 9 — Book Collection
Fields: title(text), author(text), genre(select), rating(number), finished(boolean), notes(text)
Analysis: IDENTIFIER=title, DETAIL=author(text), STATUS=genre(select)+finished(boolean), KEY METRIC=rating → Pattern E (item cards, name+author stacked, badges+rating on right)
<div data-each="entries">
  <div class="p-3 rounded-xl bg-white/5 border border-white/10 mb-2">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <p class="text-white text-sm font-medium truncate">{entry.title}</p>
        <p class="text-white/40 text-xs mt-0.5">{entry.author}</p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-xs text-purple-400">{entry.genre}</span>
        <span class="text-amber-400 font-bold text-sm">{entry.rating}<span class="text-white/30">/5</span></span>
      </div>
    </div>
    <p class="text-white/30 text-xs mt-1.5 truncate">{entry.notes}</p>
  </div>
</div>

EXAMPLE 10 — Study Sessions
Fields: subject(text), duration(number), type(select), vocabCount(number), notes(text)
Analysis: IDENTIFIER=subject, KEY METRICS=duration+vocabCount, STATUS=type(select), NOTES=notes → Pattern A+C hybrid (stats on top, entry list with badge)
<div class="space-y-3">
  <div class="grid grid-cols-2 gap-3">
    <div class="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
      <p class="text-xs text-purple-400 mb-1">Study Time</p>
      <p class="text-2xl font-bold text-white">{duration}<span class="text-sm text-white/40 ml-1">min</span></p>
    </div>
    <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <p class="text-xs text-blue-400 mb-1">New Vocab</p>
      <p class="text-2xl font-bold text-white">{vocabCount}</p>
    </div>
  </div>
  <div class="rounded-xl border border-white/10 overflow-hidden">
    <div data-each="entries">
      <div class="flex items-center gap-3 px-4 py-2.5 border-b border-white/5">
        <span class="text-white text-sm font-medium flex-shrink-0">{entry.subject}</span>
        <span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-xs text-purple-400">{entry.type}</span>
        <span class="text-white/40 text-xs ml-auto flex-shrink-0">{entry.duration} min</span>
      </div>
    </div>
  </div>
</div>`;

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

  const template = await SectionTemplate.findOne({
    slug,
    $or: [
      { createdBy: userId },
      { createdBy: null },
      { isShared: true, usageCount: { $gte: 3 } },
    ],
  });
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
    .map((f: { key: string; type: string; label: string; formula?: string }) =>
      `${f.key} (${f.type}): ${f.label}${f.formula ? ` [formula: ${f.formula}]` : ""}`)
    .join("\n");

  const userMessage = `Section: "${template.name}"${template.description ? ` — ${template.description}` : ""}
View type: ${template.viewType || "weekly-cards"}

Available fields:
${fieldsDescription}

Current HTML layout:
${currentHtml || template.layoutHtml || "<div>No layout yet</div>"}

User request: ${prompt}

Output ONLY the complete updated HTML:`;

  try {
    const html = await callAI(aiProvider, aiApiKey, LAYOUT_EDIT_SYSTEM_PROMPT, userMessage);

    // Clean up: remove markdown fences if the AI wrapped it
    const cleaned = html
      .replace(/^```html?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    // Optionally save to template — only the owner may persist changes, even
    // though a shared/built-in template can be read here for AI context.
    if (body.save && String(template.createdBy) === String(userId)) {
      template.layoutHtml = cleaned;
      await template.save();
    }

    return NextResponse.json({ html: cleaned });
  } catch (err) {
    console.error("[edit-layout] AI error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to generate layout. Please try again." },
      { status: 500 }
    );
  }
}
