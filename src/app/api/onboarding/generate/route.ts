import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { generateWithDefaultAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured on this server" },
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

  try {
    const config = await generateWithDefaultAI(prompt.trim());
    return NextResponse.json({ config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[onboarding/generate] Error:", message);

    if (message.includes("401") || message.includes("Unauthorized") || message.includes("Invalid API Key")) {
      return NextResponse.json({ error: "AI service authentication failed" }, { status: 500 });
    }
    if (message.includes("429") || message.includes("rate limit")) {
      return NextResponse.json({ error: "AI rate limited. Please try again in a moment." }, { status: 429 });
    }

    return NextResponse.json(
      { error: `Failed to generate config: ${message.slice(0, 100)}` },
      { status: 500 }
    );
  }
}
