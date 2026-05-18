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
    .map((f: { key: string; type: string; label: string }) => `${f.key} (${f.type}): ${f.label}`)
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
