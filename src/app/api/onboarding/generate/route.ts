import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { generatePlannerConfig, type AIProvider } from "@/lib/ai";

const VALID_PROVIDERS: AIProvider[] = ["claude", "gemini", "openai"];

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { prompt, provider, apiKey } = body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return NextResponse.json(
      { error: "Please describe what you want to track" },
      { status: 400 }
    );
  }

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { error: "Invalid AI provider" },
      { status: 400 }
    );
  }

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json(
      { error: "API key is required" },
      { status: 400 }
    );
  }

  try {
    const config = await generatePlannerConfig(prompt.trim(), provider, apiKey);
    return NextResponse.json({ config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed";

    if (message.includes("401") || message.includes("invalid") || message.includes("Incorrect API key")) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }
    if (message.includes("429") || message.includes("rate")) {
      return NextResponse.json({ error: "Rate limited. Please try again in a moment." }, { status: 429 });
    }

    return NextResponse.json(
      { error: "Failed to generate config. Please try again." },
      { status: 500 }
    );
  }
}
