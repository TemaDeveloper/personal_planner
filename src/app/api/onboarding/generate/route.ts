import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { generateWithDefaultAI, generateWithTemplateSearch } from "@/lib/ai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = await resolveUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mistralKey = process.env.MISTRAL_API_KEY;
    if (!mistralKey) {
      return NextResponse.json(
        { error: "AI is not configured on this server (MISTRAL_API_KEY missing)" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: "Please describe what you want to track" },
        { status: 400 }
      );
    }

    // Use template search pipeline if OPENAI_API_KEY is available,
    // otherwise fall back to direct generation
    const hasEmbeddingSupport = !!process.env.OPENAI_API_KEY;

    if (hasEmbeddingSupport) {
      const { config } = await generateWithTemplateSearch(prompt.trim(), String(userId));
      return NextResponse.json({ config });
    }

    // Fallback: no embedding support, generate directly
    const config = await generateWithDefaultAI(prompt.trim());
    return NextResponse.json({ config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[onboarding/generate] Error:", message);
    if (stack) console.error("[onboarding/generate] Stack:", stack);

    return NextResponse.json(
      { error: message.slice(0, 200) },
      { status: 500 }
    );
  }
}
