import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { callAI } from "@/lib/ai";
import { extractFacets } from "@/lib/profile/facet-extract";
import { applyFacets } from "@/lib/profile/profile-store";
import { resolveAIConfig } from "@/lib/profile/ai-config";
import {
  ONBOARDING_SYSTEM_PROMPT,
  isProfileSufficient,
  type ChatMessage,
} from "@/lib/profile/conversation";

/**
 * Onboarding chat turn: takes the conversation so far, extracts life facets from
 * what the user has said, merges them into the living profile, and returns the
 * assistant's next message plus whether we understand them well enough to build.
 *
 * POST { messages: ChatMessage[], provider?, apiKey? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const messages: ChatMessage[] = body?.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const ai = resolveAIConfig(body ?? {});
  if (!ai) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 400 });
  }

  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const facets = await extractFacets(userText, ai.provider, ai.apiKey);
  const profile = await applyFacets(userId, facets);
  const sufficient = isProfileSufficient(profile.facets);

  const transcript = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  let assistant = "";
  try {
    assistant = await callAI(
      ai.provider,
      ai.apiKey,
      ONBOARDING_SYSTEM_PROMPT,
      `Conversation so far:\n${transcript}\n\nReply with your next message.`
    );
  } catch {
    assistant = sufficient
      ? "I think I've got a good picture of your life — ready to build your planner."
      : "Tell me a bit more about a typical week for you.";
  }

  return NextResponse.json({
    assistant,
    facets: profile.facets,
    version: profile.version,
    sufficient,
  });
}
