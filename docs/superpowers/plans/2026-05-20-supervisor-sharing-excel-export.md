# Supervisor Sharing & Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add view-only section sharing via magic links and account-based invitations (with Resend emails), plus Excel export for all sections.

**Architecture:** A `ShareToken` MongoDB model stores both magic link and account-based shares. A public `/shared/[token]` page renders read-only data. A `GET /api/export/[section]` endpoint generates `.xlsx` files via `exceljs`. Email invitations are sent via Resend.

**Tech Stack:** Next.js 16, MongoDB/Mongoose, NextAuth, Resend, exceljs, Zod

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/models/share-token.ts` | ShareToken Mongoose model |
| `src/lib/email.ts` | Resend email utility |
| `src/lib/excel.ts` | Excel file generation utility |
| `src/app/api/shares/route.ts` | POST (create share), GET (list my shares) |
| `src/app/api/shares/[token]/route.ts` | PATCH (update/revoke), DELETE (hard delete) |
| `src/app/api/shared/[token]/route.ts` | GET shared section data (public) |
| `src/app/api/shared/me/route.ts` | GET shares for logged-in user |
| `src/app/api/export/[section]/route.ts` | GET Excel download |
| `src/app/shared/[token]/page.tsx` | Public share viewer page |
| `src/app/(app)/shared/page.tsx` | "Shared with me" page |
| `src/lib/__tests__/share-token.test.ts` | ShareToken validation tests |
| `src/lib/__tests__/excel.test.ts` | Excel generation tests |

### Modified Files
| File | Change |
|------|--------|
| `package.json` | Add `resend`, `exceljs` |
| `middleware.ts` | Remove `/shared/:path*` from protected routes (it's public) |
| `src/components/layout/app-sidebar.tsx` | Add "Shared with me" nav item |
| `src/app/(app)/settings/page.tsx` | Add "Sharing" section |
| `src/components/layout/page-header.tsx` | No changes needed (already has `action` prop) |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install resend and exceljs**

```bash
pnpm add resend exceljs
```

- [ ] **Step 2: Verify installation**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add resend and exceljs dependencies"
```

---

### Task 2: ShareToken Model

**Files:**
- Create: `src/lib/models/share-token.ts`
- Test: `src/lib/__tests__/share-token.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/share-token.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { shareTokenCreateSchema } from "@/lib/models/share-token";

describe("shareTokenCreateSchema", () => {
  it("accepts valid share with all fields", () => {
    const result = shareTokenCreateSchema.safeParse({
      sectionType: "work",
      scopeFilter: "Advapay",
      inviteeEmail: "boss@example.com",
      label: "For my manager",
      expiresAt: "2026-12-31T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal share (magic link, no email)", () => {
    const result = shareTokenCreateSchema.safeParse({
      sectionType: "gym",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sectionType", () => {
    const result = shareTokenCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = shareTokenCreateSchema.safeParse({
      sectionType: "work",
      inviteeEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts custom section type", () => {
    const result = shareTokenCreateSchema.safeParse({
      sectionType: "custom:tire-reselling",
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/__tests__/share-token.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the model and schema**

Create `src/lib/models/share-token.ts`:

```typescript
import mongoose, { Schema, type Document } from "mongoose";
import { z } from "zod/v4";

export interface IShareToken extends Document {
  token: string;
  ownerId: mongoose.Types.ObjectId;
  sectionType: string;
  scopeFilter: string | null;
  inviteeEmail: string | null;
  permission: "view";
  expiresAt: Date | null;
  revokedAt: Date | null;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShareTokenSchema = new Schema<IShareToken>(
  {
    token: { type: String, required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sectionType: { type: String, required: true },
    scopeFilter: { type: String, default: null },
    inviteeEmail: { type: String, default: null },
    permission: { type: String, enum: ["view"], default: "view" },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    label: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: true }
);

ShareTokenSchema.index({ token: 1 }, { unique: true });
ShareTokenSchema.index({ ownerId: 1 });
ShareTokenSchema.index({ inviteeEmail: 1 });

if (mongoose.models.ShareToken) mongoose.deleteModel("ShareToken");
export default mongoose.model<IShareToken>("ShareToken", ShareTokenSchema);

export const shareTokenCreateSchema = z.object({
  sectionType: z.string().min(1),
  scopeFilter: z.string().optional(),
  inviteeEmail: z.email().optional(),
  label: z.string().max(200).optional(),
  expiresAt: z.string().datetime().optional(),
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/lib/__tests__/share-token.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models/share-token.ts src/lib/__tests__/share-token.test.ts
git commit -m "feat: add ShareToken model and validation schema"
```

---

### Task 3: Email Utility (Resend)

**Files:**
- Create: `src/lib/email.ts`

- [ ] **Step 1: Create the email utility**

Create `src/lib/email.ts`:

```typescript
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendShareInvite(
  ownerName: string,
  inviteeEmail: string,
  sectionName: string,
  magicLinkUrl: string
): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured, skipping email");
    return false;
  }

  try {
    await resend.emails.send({
      from: "Planner <noreply@resend.dev>",
      to: inviteeEmail,
      subject: `${ownerName} shared their ${sectionName} with you`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">
            ${ownerName} shared their ${sectionName} data with you
          </h2>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
            You have view-only access. Click the link below to see their data.
          </p>
          <a href="${magicLinkUrl}"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
            View Shared Data
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Or copy this link: ${magicLinkUrl}
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send invite:", err);
    return false;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add Resend email utility for share invitations"
```

---

### Task 4: Excel Export Utility

**Files:**
- Create: `src/lib/excel.ts`
- Test: `src/lib/__tests__/excel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/excel.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateExcel, type ExcelColumn } from "@/lib/excel";

describe("generateExcel", () => {
  it("generates a buffer from columns and rows", async () => {
    const columns: ExcelColumn[] = [
      { header: "Date", key: "date" },
      { header: "Hours", key: "hours" },
      { header: "Note", key: "note" },
    ];
    const rows = [
      { date: "2026-05-20", hours: 8, note: "Productive day" },
      { date: "2026-05-21", hours: 6, note: "" },
    ];

    const buffer = await generateExcel("Work Sessions", columns, rows);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("handles empty rows", async () => {
    const columns: ExcelColumn[] = [
      { header: "Name", key: "name" },
    ];

    const buffer = await generateExcel("Empty", columns, []);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/__tests__/excel.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the Excel utility**

Create `src/lib/excel.ts`:

```typescript
import ExcelJS from "exceljs";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export async function generateExcel(
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, unknown>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? 18,
  }));

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E1E2E" },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const row of rows) {
    sheet.addRow(row);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/lib/__tests__/excel.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/excel.ts src/lib/__tests__/excel.test.ts
git commit -m "feat: add Excel export utility with exceljs"
```

---

### Task 5: Share Management API (create + list)

**Files:**
- Create: `src/app/api/shares/route.ts`

- [ ] **Step 1: Create the shares API endpoint**

Create `src/app/api/shares/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import ShareToken, { shareTokenCreateSchema } from "@/lib/models/share-token";
import User from "@/lib/models/user";
import { sendShareInvite } from "@/lib/email";
import { SECTIONS, SECTION_META, type SectionId } from "@/lib/constants";

function sectionLabel(sectionType: string): string {
  if (sectionType.startsWith("custom:")) return sectionType.slice(7);
  if ((SECTIONS as readonly string[]).includes(sectionType)) {
    return SECTION_META[sectionType as SectionId].label;
  }
  return sectionType;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = shareTokenCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { sectionType, scopeFilter, inviteeEmail, label, expiresAt } = parsed.data;

  const token = randomUUID();
  await ShareToken.create({
    token,
    ownerId: userId,
    sectionType,
    scopeFilter: scopeFilter ?? null,
    inviteeEmail: inviteeEmail ?? null,
    permission: "view",
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    label: label ?? "",
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = `${baseUrl}/shared/${token}`;

  // Send email if invitee provided
  if (inviteeEmail) {
    const user = await User.findById(userId).lean();
    const ownerName = (user?.name as string) || "Someone";
    await sendShareInvite(ownerName, inviteeEmail, sectionLabel(sectionType), url);
  }

  return NextResponse.json({ token, url }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const shares = await ShareToken.find({ ownerId: userId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ shares });
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/shares/route.ts"
git commit -m "feat: add share creation and listing API endpoints"
```

---

### Task 6: Share Update/Revoke/Delete API

**Files:**
- Create: `src/app/api/shares/[token]/route.ts`

- [ ] **Step 1: Create the share token management endpoint**

Create `src/app/api/shares/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import ShareToken from "@/lib/models/share-token";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { token } = await params;

  const share = await ShareToken.findOne({ token, ownerId: userId });
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  if (body.revoke === true) {
    share.revokedAt = new Date();
  }
  if (body.label !== undefined) {
    share.label = String(body.label).slice(0, 200);
  }
  if (body.expiresAt !== undefined) {
    share.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }

  await share.save();
  return NextResponse.json({ share });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { token } = await params;

  const result = await ShareToken.deleteOne({ token, ownerId: userId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/shares/[token]/route.ts"
git commit -m "feat: add share update, revoke, and delete endpoints"
```

---

### Task 7: Shared Data Viewer API (public)

**Files:**
- Create: `src/app/api/shared/[token]/route.ts`

- [ ] **Step 1: Create the public shared data endpoint**

Create `src/app/api/shared/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ShareToken from "@/lib/models/share-token";
import User from "@/lib/models/user";
import WorkSession from "@/lib/models/work-session";
import GymAttendance from "@/lib/models/gym-attendance";
import { Habit, HabitLog } from "@/lib/models/habit";
import StudySession from "@/lib/models/study-session";
import HobbySession from "@/lib/models/hobby-session";
import HouseworkLog from "@/lib/models/housework-log";
import HealthLog from "@/lib/models/health-log";
import Goal from "@/lib/models/goal";
import Book from "@/lib/models/book";
import JournalEntry from "@/lib/models/journal-entry";
import Expense from "@/lib/models/expense";
import ShoppingList from "@/lib/models/shopping-list";
import MealPlan from "@/lib/models/meal-plan";
import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";

async function fetchSectionData(
  sectionType: string,
  ownerId: string,
  scopeFilter: string | null
): Promise<{ data: unknown; meta?: unknown }> {
  switch (sectionType) {
    case "work": {
      const filter: Record<string, unknown> = { userId: ownerId };
      if (scopeFilter) filter.jobName = scopeFilter;
      const sessions = await WorkSession.find(filter).sort({ date: -1 }).lean();
      return { data: sessions };
    }
    case "gym": {
      const docs = await GymAttendance.find({ userId: ownerId }).sort({ date: -1 }).lean();
      return { data: docs };
    }
    case "habits": {
      const habits = await Habit.find({ userId: ownerId, active: true }).lean();
      const logs = await HabitLog.find({
        habitId: { $in: habits.map((h) => h._id) },
      }).sort({ date: -1 }).lean();
      return { data: logs, meta: { habits } };
    }
    case "study": {
      const docs = await StudySession.find({ userId: ownerId }).sort({ date: -1 }).lean();
      return { data: docs };
    }
    case "hobbies": {
      const docs = await HobbySession.find({ userId: ownerId }).sort({ date: -1 }).lean();
      return { data: docs };
    }
    case "housework": {
      const docs = await HouseworkLog.find({ userId: ownerId }).sort({ date: -1 }).lean();
      return { data: docs };
    }
    case "health": {
      const docs = await HealthLog.find({ userId: ownerId }).sort({ date: -1 }).lean();
      return { data: docs };
    }
    case "goals": {
      const docs = await Goal.find({ userId: ownerId }).lean();
      return { data: docs };
    }
    case "reading": {
      const docs = await Book.find({ userId: ownerId }).lean();
      return { data: docs };
    }
    case "journal": {
      const docs = await JournalEntry.find({ userId: ownerId }).sort({ date: -1 }).lean();
      return { data: docs };
    }
    case "finances": {
      const expenses = await Expense.find({ userId: ownerId }).sort({ date: -1 }).lean();
      return { data: expenses };
    }
    case "shopping": {
      const docs = await ShoppingList.find({ userId: ownerId }).sort({ updatedAt: -1 }).lean();
      return { data: docs };
    }
    case "mealprep": {
      const docs = await MealPlan.find({ userId: ownerId }).sort({ date: -1 }).lean();
      return { data: docs };
    }
    default: {
      // Custom section: "custom:<slug>"
      if (sectionType.startsWith("custom:")) {
        const slug = sectionType.slice(7);
        const template = await SectionTemplate.findOne({ slug }).lean();
        if (!template) return { data: [] };
        const entries = await CustomEntry.find({
          userId: ownerId,
          templateId: template._id,
        }).sort({ date: -1 }).lean();
        return { data: entries, meta: { template } };
      }
      return { data: [] };
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  await connectDB();
  const { token } = await params;

  const share = await ShareToken.findOne({ token }).lean();
  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  // Check validity
  if (share.revokedAt) {
    return NextResponse.json({ error: "This share has been revoked" }, { status: 410 });
  }
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This share has expired" }, { status: 410 });
  }

  const owner = await User.findById(share.ownerId).select("name email").lean();
  const { data, meta } = await fetchSectionData(
    share.sectionType,
    String(share.ownerId),
    share.scopeFilter ?? null
  );

  return NextResponse.json({
    sectionType: share.sectionType,
    scopeFilter: share.scopeFilter,
    ownerName: (owner?.name as string) || "Unknown",
    permission: share.permission,
    data,
    meta,
  });
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/shared/[token]/route.ts"
git commit -m "feat: add public shared data viewer API endpoint"
```

---

### Task 8: "Shared with me" API

**Files:**
- Create: `src/app/api/shared/me/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/shared/me/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import ShareToken from "@/lib/models/share-token";
import User from "@/lib/models/user";

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(userId).select("email").lean();
  if (!user?.email) {
    return NextResponse.json({ shares: [] });
  }

  const now = new Date();
  const shares = await ShareToken.find({
    inviteeEmail: user.email,
    revokedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  // Fetch owner names
  const ownerIds = [...new Set(shares.map((s) => String(s.ownerId)))];
  const owners = await User.find({ _id: { $in: ownerIds } })
    .select("name")
    .lean();
  const ownerMap = new Map(owners.map((o) => [String(o._id), o.name as string]));

  const enriched = shares.map((s) => ({
    token: s.token,
    sectionType: s.sectionType,
    scopeFilter: s.scopeFilter,
    ownerName: ownerMap.get(String(s.ownerId)) || "Unknown",
    label: s.label,
    createdAt: s.createdAt,
  }));

  return NextResponse.json({ shares: enriched });
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/shared/me/route.ts"
git commit -m "feat: add shared-with-me API endpoint"
```

---

### Task 9: Excel Export API

**Files:**
- Create: `src/app/api/export/[section]/route.ts`

- [ ] **Step 1: Create the export endpoint**

Create `src/app/api/export/[section]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { generateExcel, type ExcelColumn } from "@/lib/excel";
import WorkSession from "@/lib/models/work-session";
import GymAttendance from "@/lib/models/gym-attendance";
import { Habit, HabitLog } from "@/lib/models/habit";
import StudySession from "@/lib/models/study-session";
import HobbySession from "@/lib/models/hobby-session";
import HouseworkLog from "@/lib/models/housework-log";
import HealthLog from "@/lib/models/health-log";
import Goal from "@/lib/models/goal";
import Book from "@/lib/models/book";
import JournalEntry from "@/lib/models/journal-entry";
import Expense from "@/lib/models/expense";
import ShoppingList from "@/lib/models/shopping-list";
import MealPlan from "@/lib/models/meal-plan";
import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";
import { format } from "date-fns";

function fmtDate(d: unknown): string {
  if (!d) return "";
  try { return format(new Date(d as string), "yyyy-MM-dd"); } catch { return ""; }
}

async function buildExport(
  section: string,
  userId: string,
  job?: string
): Promise<{ name: string; columns: ExcelColumn[]; rows: Record<string, unknown>[] }> {
  switch (section) {
    case "work": {
      const filter: Record<string, unknown> = { userId };
      if (job) filter.jobName = job;
      const sessions = await WorkSession.find(filter).sort({ date: -1 }).lean();
      return {
        name: "Work Sessions",
        columns: [
          { header: "Date", key: "date" },
          { header: "Job", key: "job" },
          { header: "Hours", key: "hours" },
          { header: "Note", key: "note" },
        ],
        rows: sessions.map((s) => ({
          date: fmtDate(s.date),
          job: s.jobName,
          hours: s.hours,
          note: s.note || "",
        })),
      };
    }
    case "gym": {
      const docs = await GymAttendance.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Gym Attendance",
        columns: [
          { header: "Date", key: "date" },
          { header: "Attended", key: "attended" },
        ],
        rows: docs.map((d) => ({
          date: fmtDate(d.date),
          attended: "Yes",
        })),
      };
    }
    case "habits": {
      const habits = await Habit.find({ userId, active: true }).lean();
      const logs = await HabitLog.find({
        habitId: { $in: habits.map((h) => h._id) },
      }).sort({ date: -1 }).lean();
      const habitMap = new Map(habits.map((h) => [String(h._id), h.name as string]));
      return {
        name: "Habits",
        columns: [
          { header: "Date", key: "date" },
          { header: "Habit", key: "habit" },
          { header: "Completed", key: "completed" },
        ],
        rows: logs.map((l) => ({
          date: fmtDate(l.date),
          habit: habitMap.get(String(l.habitId)) || "",
          completed: "Yes",
        })),
      };
    }
    case "study": {
      const docs = await StudySession.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Study Sessions",
        columns: [
          { header: "Date", key: "date" },
          { header: "Subject", key: "subject" },
          { header: "Hours", key: "hours" },
          { header: "Notes", key: "notes" },
        ],
        rows: docs.map((d) => ({
          date: fmtDate(d.date),
          subject: (d as Record<string, unknown>).subject || "",
          hours: (d as Record<string, unknown>).hours || 0,
          notes: (d as Record<string, unknown>).notes || "",
        })),
      };
    }
    case "hobbies": {
      const docs = await HobbySession.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Hobby Sessions",
        columns: [
          { header: "Date", key: "date" },
          { header: "Hobby", key: "hobby" },
          { header: "Hours", key: "hours" },
          { header: "Notes", key: "notes" },
        ],
        rows: docs.map((d) => ({
          date: fmtDate(d.date),
          hobby: (d as Record<string, unknown>).hobbyName || "",
          hours: (d as Record<string, unknown>).hours || 0,
          notes: (d as Record<string, unknown>).notes || "",
        })),
      };
    }
    case "housework": {
      const docs = await HouseworkLog.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Housework",
        columns: [
          { header: "Date", key: "date" },
          { header: "Chore", key: "chore" },
          { header: "Completed", key: "completed" },
        ],
        rows: docs.map((d) => ({
          date: fmtDate(d.date),
          chore: (d as Record<string, unknown>).choreName || "",
          completed: "Yes",
        })),
      };
    }
    case "health": {
      const docs = await HealthLog.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Health",
        columns: [
          { header: "Date", key: "date" },
          { header: "Water", key: "water" },
          { header: "Sleep", key: "sleep" },
          { header: "Weight", key: "weight" },
          { header: "Mood", key: "mood" },
        ],
        rows: docs.map((d) => {
          const rec = d as Record<string, unknown>;
          return {
            date: fmtDate(d.date),
            water: rec.water ?? "",
            sleep: rec.sleep ?? "",
            weight: rec.weight ?? "",
            mood: rec.mood ?? "",
          };
        }),
      };
    }
    case "goals": {
      const docs = await Goal.find({ userId }).lean();
      return {
        name: "Goals",
        columns: [
          { header: "Name", key: "name" },
          { header: "Target Date", key: "targetDate" },
          { header: "Progress", key: "progress" },
          { header: "Status", key: "status" },
        ],
        rows: docs.map((d) => {
          const rec = d as Record<string, unknown>;
          return {
            name: rec.name || "",
            targetDate: fmtDate(rec.targetDate),
            progress: rec.progress ?? "",
            status: rec.status || "",
          };
        }),
      };
    }
    case "reading": {
      const docs = await Book.find({ userId }).lean();
      return {
        name: "Books",
        columns: [
          { header: "Title", key: "title" },
          { header: "Author", key: "author" },
          { header: "Pages", key: "pages" },
          { header: "Status", key: "status" },
        ],
        rows: docs.map((d) => {
          const rec = d as Record<string, unknown>;
          return {
            title: rec.title || "",
            author: rec.author || "",
            pages: rec.pages ?? "",
            status: rec.status || "",
          };
        }),
      };
    }
    case "journal": {
      const docs = await JournalEntry.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Journal",
        columns: [
          { header: "Date", key: "date" },
          { header: "Mood", key: "mood" },
          { header: "Content", key: "content" },
        ],
        rows: docs.map((d) => ({
          date: fmtDate(d.date),
          mood: d.mood ?? "",
          content: d.content || "",
        })),
      };
    }
    case "finances": {
      const docs = await Expense.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Expenses",
        columns: [
          { header: "Date", key: "date" },
          { header: "Category", key: "category" },
          { header: "Amount", key: "amount" },
          { header: "Note", key: "note" },
        ],
        rows: docs.map((d) => {
          const rec = d as Record<string, unknown>;
          return {
            date: fmtDate(d.date),
            category: rec.category || "",
            amount: rec.amount ?? 0,
            note: rec.note || "",
          };
        }),
      };
    }
    case "shopping": {
      const docs = await ShoppingList.find({ userId }).lean();
      return {
        name: "Shopping Lists",
        columns: [
          { header: "Name", key: "name" },
          { header: "Items", key: "items" },
        ],
        rows: docs.map((d) => {
          const rec = d as Record<string, unknown>;
          const items = Array.isArray(rec.items)
            ? (rec.items as { name: string }[]).map((i) => i.name).join(", ")
            : "";
          return { name: rec.name || "", items };
        }),
      };
    }
    case "mealprep": {
      const docs = await MealPlan.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Meal Plans",
        columns: [
          { header: "Date", key: "date" },
          { header: "Meals", key: "meals" },
        ],
        rows: docs.map((d) => {
          const rec = d as Record<string, unknown>;
          return {
            date: fmtDate(rec.date),
            meals: JSON.stringify(rec.meals ?? ""),
          };
        }),
      };
    }
    default: {
      // Custom section
      if (section.startsWith("custom:")) {
        const slug = section.slice(7);
        const template = await SectionTemplate.findOne({ slug }).lean();
        if (!template) return { name: section, columns: [], rows: [] };
        const entries = await CustomEntry.find({ userId, templateId: template._id })
          .sort({ date: -1 }).lean();
        const columns: ExcelColumn[] = [
          { header: "Date", key: "date" },
          ...template.fields.map((f) => ({ header: f.label, key: f.key })),
        ];
        const rows = entries.map((e) => {
          const row: Record<string, unknown> = { date: fmtDate(e.date) };
          const entryData = (e.data || {}) as Record<string, unknown>;
          for (const f of template.fields) {
            row[f.key] = entryData[f.key] ?? "";
          }
          return row;
        });
        return { name: template.name, columns, rows };
      }
      return { name: section, columns: [], rows: [] };
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { section } = await params;
  const { searchParams } = new URL(req.url);
  const job = searchParams.get("job") || undefined;

  const { name, columns, rows } = await buildExport(section, String(userId), job);

  if (columns.length === 0) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  const buffer = await generateExcel(name, columns, rows);
  const filename = `${name.toLowerCase().replace(/\s+/g, "-")}-export.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/export/[section]/route.ts"
git commit -m "feat: add Excel export endpoint for all sections"
```

---

### Task 10: Public Share Viewer Page

**Files:**
- Create: `src/app/shared/[token]/page.tsx`
- Modify: `middleware.ts`

- [ ] **Step 1: Update middleware to not protect /shared routes**

The `/shared` path is NOT in the middleware matcher, so it's already public. No change needed — verify:

```bash
grep -n "shared" middleware.ts
```

Expected: No matches (the matcher array does not include `/shared`). The page will be accessible without auth.

- [ ] **Step 2: Create the public share viewer page**

Create `src/app/shared/[token]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import ShareToken from "@/lib/models/share-token";
import User from "@/lib/models/user";
import { SECTIONS, SECTION_META, type SectionId } from "@/lib/constants";
import { SharedDataViewer } from "./shared-data-viewer";

function sectionLabel(sectionType: string): string {
  if (sectionType.startsWith("custom:")) {
    return sectionType.slice(7).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if ((SECTIONS as readonly string[]).includes(sectionType)) {
    return SECTION_META[sectionType as SectionId].label;
  }
  return sectionType;
}

export default async function SharedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  await connectDB();

  const share = await ShareToken.findOne({ token }).lean();
  if (!share) notFound();

  // Check validity
  const isRevoked = !!share.revokedAt;
  const isExpired = share.expiresAt ? new Date(share.expiresAt) < new Date() : false;

  if (isRevoked || isExpired) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-white mb-2">
            This link is no longer active
          </h1>
          <p className="text-sm text-white/60">
            {isRevoked
              ? "The owner has revoked access to this shared data."
              : "This share link has expired."}
          </p>
        </div>
      </div>
    );
  }

  const owner = await User.findById(share.ownerId).select("name").lean();
  const ownerName = (owner?.name as string) || "Someone";
  const label = sectionLabel(share.sectionType);
  const scope = share.scopeFilter ? ` — ${share.scopeFilter}` : "";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Banner */}
      <div className="border-b border-white/10 bg-white/[0.03]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{label}{scope}</h1>
            <p className="text-sm text-white/50">
              Shared by {ownerName} — View only
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold bg-indigo-500 text-white">
            P
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <SharedDataViewer token={token} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the client-side data viewer component**

Create `src/app/shared/[token]/shared-data-viewer.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface SharedData {
  sectionType: string;
  scopeFilter: string | null;
  ownerName: string;
  data: Record<string, unknown>[];
  meta?: Record<string, unknown>;
}

export function SharedDataViewer({ token }: { token: string }) {
  const [shared, setShared] = useState<SharedData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/shared/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setShared)
      .catch(() => setError("Failed to load shared data"));
  }, [token]);

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>;
  }
  if (!shared) {
    return <p className="text-white/40 text-sm animate-pulse">Loading...</p>;
  }

  const rows = Array.isArray(shared.data) ? shared.data : [];

  if (rows.length === 0) {
    return <p className="text-white/40 text-sm">No data to show yet.</p>;
  }

  // Build table columns from first row keys
  const keys = Object.keys(rows[0]).filter(
    (k) => !["_id", "__v", "userId", "createdAt", "updatedAt"].includes(k)
  );

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {keys.map((key) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider"
                >
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                {keys.map((key) => {
                  let val = (row as Record<string, unknown>)[key];
                  // Format dates
                  if (
                    typeof val === "string" &&
                    /^\d{4}-\d{2}-\d{2}/.test(val)
                  ) {
                    try {
                      val = format(new Date(val), "MMM d, yyyy");
                    } catch {
                      /* keep original */
                    }
                  }
                  return (
                    <td key={key} className="px-4 py-3 text-white/80">
                      {String(val ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "src/app/shared/[token]/page.tsx" "src/app/shared/[token]/shared-data-viewer.tsx"
git commit -m "feat: add public share viewer page with read-only data table"
```

---

### Task 11: "Shared with me" Page + Sidebar

**Files:**
- Create: `src/app/(app)/shared/page.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Create the "Shared with me" page**

Create `src/app/(app)/shared/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/ui/page-transition";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { SECTIONS, SECTION_META, type SectionId } from "@/lib/constants";

interface SharedItem {
  token: string;
  sectionType: string;
  scopeFilter: string | null;
  ownerName: string;
  label: string;
  createdAt: string;
}

function sectionLabel(sectionType: string): string {
  if (sectionType.startsWith("custom:")) {
    return sectionType.slice(7).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if ((SECTIONS as readonly string[]).includes(sectionType)) {
    return SECTION_META[sectionType as SectionId].label;
  }
  return sectionType;
}

export default function SharedWithMePage() {
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shared/me")
      .then((r) => r.json())
      .then((d) => setItems(d.shares || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <PageHeader
        title="Shared with me"
        description="Sections other people have shared with you"
      />

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] animate-pulse">Loading...</p>
      ) : items.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Users size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            Nothing shared with you yet.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Link key={item.token} href={`/shared/${item.token}`}>
              <Card padding="md" className="hover:bg-[var(--surface-1)] transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {sectionLabel(item.sectionType)}
                      {item.scopeFilter && (
                        <span className="text-[var(--text-muted)]"> — {item.scopeFilter}</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Shared by {item.ownerName}
                      {item.label && ` · ${item.label}`}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">View only</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
```

- [ ] **Step 2: Add "Shared with me" to sidebar**

In `src/components/layout/app-sidebar.tsx`, add the `Users` import and a new nav item.

Add `Users` to the import on line 11:

```typescript
import {
  LayoutDashboard,
  Settings,
  Download,
  LogOut,
  Users,
} from "lucide-react";
```

Add a new NavGroup between the Sections group (line 77) and the closing `</nav>` (line 78). Insert after line 77:

```tsx
        {/* Shared */}
        <NavGroup label="Shared">
          <NavItem href="/shared" icon={Users} label="Shared with me" active={isActive("/shared")} />
        </NavGroup>
```

- [ ] **Step 3: Add /shared to middleware protected routes**

In `middleware.ts`, add `/shared` to the matcher so the authenticated "Shared with me" page is protected. But NOTE: the public `/shared/[token]` page lives outside the `(app)` layout at `src/app/shared/[token]/page.tsx` and does NOT match this pattern because the middleware matcher is for `(app)` group routes.

Actually, looking at the middleware matcher — it uses explicit paths. `/shared/:path*` would also catch the public `/shared/[token]` page. We need the public page to work without auth.

Solution: Do NOT add `/shared` to middleware. The `(app)` layout already checks auth and redirects. The `/shared` page inside `(app)` group is protected by the layout's `resolveUserId` + redirect. The public `src/app/shared/[token]/page.tsx` stays unprotected.

No middleware change needed.

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/shared/page.tsx" src/components/layout/app-sidebar.tsx
git commit -m "feat: add Shared with me page and sidebar navigation"
```

---

### Task 12: Sharing Section in Settings

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Add sharing state and UI to settings**

This is a large file. Add the sharing section after the AI section. The changes needed:

1. Add state for shares list and share modal
2. Add fetch for shares on mount
3. Add the Sharing section UI with create/revoke functionality

At the top of the component (near other state declarations), add:

```typescript
const [shares, setShares] = useState<{
  token: string;
  sectionType: string;
  scopeFilter: string | null;
  inviteeEmail: string | null;
  label: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}[]>([]);
const [shareModal, setShareModal] = useState(false);
const [shareForm, setShareForm] = useState({
  sectionType: "work",
  scopeFilter: "",
  inviteeEmail: "",
  label: "",
  expiresAt: "",
});
const [shareUrl, setShareUrl] = useState("");
```

Add a fetch for shares in the existing useEffect or a new one:

```typescript
useEffect(() => {
  fetch("/api/shares").then((r) => r.json()).then((d) => setShares(d.shares || []));
}, []);
```

Add the create share handler:

```typescript
const handleCreateShare = async () => {
  const body: Record<string, string> = { sectionType: shareForm.sectionType };
  if (shareForm.scopeFilter) body.scopeFilter = shareForm.scopeFilter;
  if (shareForm.inviteeEmail) body.inviteeEmail = shareForm.inviteeEmail;
  if (shareForm.label) body.label = shareForm.label;
  if (shareForm.expiresAt) body.expiresAt = new Date(shareForm.expiresAt).toISOString();

  const res = await fetch("/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    const data = await res.json();
    setShareUrl(data.url);
    navigator.clipboard.writeText(data.url);
    toast.success("Share link copied to clipboard!");
    // Refresh list
    const listRes = await fetch("/api/shares");
    const listData = await listRes.json();
    setShares(listData.shares || []);
  } else {
    toast.error("Failed to create share");
  }
};

const handleRevokeShare = async (token: string) => {
  const res = await fetch(`/api/shares/${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revoke: true }),
  });
  if (res.ok) {
    setShares((prev) => prev.map((s) => s.token === token ? { ...s, revokedAt: new Date().toISOString() } : s));
    toast.success("Share revoked");
  }
};

const handleDeleteShare = async (token: string) => {
  const res = await fetch(`/api/shares/${token}`, { method: "DELETE" });
  if (res.ok) {
    setShares((prev) => prev.filter((s) => s.token !== token));
    toast.success("Share deleted");
  }
};
```

Add the Sharing section JSX (after the AI section, before the closing layout divs). Add `Share2, Link, Trash2, XCircle` to the lucide-react imports:

```tsx
<Section title="Sharing">
  <div className="space-y-3">
    {shares.filter((s) => !s.revokedAt).length === 0 && (
      <p className="text-xs text-[var(--text-muted)]">No active shares.</p>
    )}
    {shares.filter((s) => !s.revokedAt).map((s) => (
      <div key={s.token} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-1)]">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {s.sectionType}{s.scopeFilter ? ` — ${s.scopeFilter}` : ""}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {s.inviteeEmail || "Magic link"}
            {s.label ? ` · ${s.label}` : ""}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const url = `${window.location.origin}/shared/${s.token}`;
              navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }}
            aria-label="Copy link"
          >
            <Link size={14} />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleRevokeShare(s.token)} aria-label="Revoke">
            <XCircle size={14} />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleDeleteShare(s.token)} aria-label="Delete">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    ))}
  </div>

  <Button variant="secondary" size="sm" onClick={() => { setShareModal(true); setShareUrl(""); }} className="mt-3">
    <Share2 size={14} /> Create Share
  </Button>

  {shareModal && (
    <Modal open={shareModal} onClose={() => setShareModal(false)} title="Create Share">
      <div className="space-y-4">
        <Field label="Section">
          <select
            value={shareForm.sectionType}
            onChange={(e) => setShareForm((f) => ({ ...f, sectionType: e.target.value, scopeFilter: "" }))}
            className="w-full bg-[var(--surface-1)] rounded-lg px-3 py-2 text-sm outline-none border border-[var(--border-subtle)]"
          >
            {enabledSections.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
            {customSections.map((cs) => (
              <option key={cs.slug} value={`custom:${cs.slug}`}>{cs.name}</option>
            ))}
          </select>
        </Field>

        {shareForm.sectionType === "work" && jobs.length > 0 && (
          <Field label="Job (optional — leave empty for all jobs)">
            <select
              value={shareForm.scopeFilter}
              onChange={(e) => setShareForm((f) => ({ ...f, scopeFilter: e.target.value }))}
              className="w-full bg-[var(--surface-1)] rounded-lg px-3 py-2 text-sm outline-none border border-[var(--border-subtle)]"
            >
              <option value="">All jobs</option>
              {jobs.map((j: { name: string }) => (
                <option key={j.name} value={j.name}>{j.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Invitee email (optional)">
          <input
            type="email"
            value={shareForm.inviteeEmail}
            onChange={(e) => setShareForm((f) => ({ ...f, inviteeEmail: e.target.value }))}
            placeholder="supervisor@company.com"
            className="w-full bg-[var(--surface-1)] rounded-lg px-3 py-2 text-sm outline-none border border-[var(--border-subtle)]"
          />
        </Field>

        <Field label="Label (optional)">
          <input
            type="text"
            value={shareForm.label}
            onChange={(e) => setShareForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="For my manager"
            className="w-full bg-[var(--surface-1)] rounded-lg px-3 py-2 text-sm outline-none border border-[var(--border-subtle)]"
          />
        </Field>

        <Field label="Expires (optional)">
          <input
            type="date"
            value={shareForm.expiresAt}
            onChange={(e) => setShareForm((f) => ({ ...f, expiresAt: e.target.value }))}
            className="w-full bg-[var(--surface-1)] rounded-lg px-3 py-2 text-sm outline-none border border-[var(--border-subtle)]"
          />
        </Field>

        {shareUrl && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-emerald-400 mb-1">Share link (copied to clipboard):</p>
            <p className="text-xs text-white/80 break-all">{shareUrl}</p>
          </div>
        )}

        <Button onClick={handleCreateShare} variant="primary" className="w-full">
          Create & Copy Link
        </Button>
      </div>
    </Modal>
  )}
</Section>
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds. Fix any import issues (add `Share2, Link as LinkIcon, Trash2, XCircle` to lucide imports — rename `Link` to `LinkIcon` to avoid collision with Next.js `Link`).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/settings/page.tsx"
git commit -m "feat: add Sharing management section to settings page"
```

---

### Task 13: Export Button on Section Pages

**Files:**
- Modify: Multiple section pages (work, gym, etc.)

- [ ] **Step 1: Add export button to the work page as the first example**

In `src/app/(app)/work/page.tsx`, update the `PageHeader` to include an export action button. Add `Download` to the lucide-react import, then pass an `action` prop:

```tsx
<PageHeader
  title="Work"
  description="Track hours and earnings across your jobs"
  action={
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        window.location.href = "/api/export/work";
      }}
      aria-label="Export to Excel"
    >
      <Download size={14} />
    </Button>
  }
/>
```

- [ ] **Step 2: Add export button to remaining section pages**

Repeat the same pattern for each section page. The `href` changes per section:
- `src/app/(app)/gym/page.tsx` → `/api/export/gym`
- `src/app/(app)/habits/page.tsx` → `/api/export/habits`
- `src/app/(app)/study/page.tsx` → `/api/export/study`
- `src/app/(app)/hobbies/page.tsx` → `/api/export/hobbies`
- `src/app/(app)/housework/page.tsx` → `/api/export/housework`
- `src/app/(app)/health/page.tsx` → `/api/export/health`
- `src/app/(app)/goals/page.tsx` → `/api/export/goals`
- `src/app/(app)/reading/page.tsx` → `/api/export/reading`
- `src/app/(app)/journal/page.tsx` → `/api/export/journal`
- `src/app/(app)/finances/page.tsx` → `/api/export/finances`
- `src/app/(app)/shopping/page.tsx` → `/api/export/shopping`
- `src/app/(app)/mealprep/page.tsx` → `/api/export/mealprep`
- `src/app/(app)/sections/[slug]/page.tsx` → `/api/export/custom:${slug}`

Each page: import `Download` from lucide-react, add `action` prop to `PageHeader` with the download button.

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/work/page.tsx src/app/\(app\)/gym/page.tsx src/app/\(app\)/habits/page.tsx src/app/\(app\)/study/page.tsx src/app/\(app\)/hobbies/page.tsx src/app/\(app\)/housework/page.tsx src/app/\(app\)/health/page.tsx src/app/\(app\)/goals/page.tsx src/app/\(app\)/reading/page.tsx src/app/\(app\)/journal/page.tsx src/app/\(app\)/finances/page.tsx src/app/\(app\)/shopping/page.tsx src/app/\(app\)/mealprep/page.tsx "src/app/(app)/sections/[slug]/page.tsx"
git commit -m "feat: add Excel export button to all section page headers"
```

---

### Task 14: Run Full Test Suite and Final Build

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 2: Run full build**

```bash
pnpm build 2>&1 | tail -10
```

Expected: Build succeeds with no type errors.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git status
```

If clean, done. If fixes were needed, commit them:

```bash
git add -A
git commit -m "fix: resolve build/test issues for sharing and export features"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```
