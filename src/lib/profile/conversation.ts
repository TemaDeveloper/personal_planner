import type { ILifeFacet } from "@/lib/models/life-profile";
import { distinctDimensions } from "@/lib/profile/merge";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const ONBOARDING_SYSTEM_PROMPT = `You are Lifora's onboarding guide. Understand how THIS person actually lives so their planner fits them — not a generic template.

Be FAST and efficient. Ask AT MOST 3-4 short questions TOTAL, one at a time. Their first answer often covers several things — don't re-ask what they already told you. Start broad ("Tell me about a typical week — how you spend your time, earn, move, and what you're working toward"), then ask at most 1-2 targeted follow-ups only if something important is missing.

Never assume a car, a 9-5, a gym, or a family — but don't interrogate either. As soon as you have a reasonable picture (usually after 2-3 exchanges), STOP asking and say you're ready to build their planner. Don't drag it out.

Do not force their life into fixed categories; capture whatever is distinctive about them. Keep every reply short and human.`;

/** Build the message list for the onboarding chat model. */
export function buildConversationPrompt(history: ChatMessage[]): {
  system: string;
  messages: ChatMessage[];
} {
  return { system: ONBOARDING_SYSTEM_PROMPT, messages: history };
}

/**
 * Heuristic: do we understand this person well enough to generate their planner?
 * Enough breadth (distinct dimensions), enough depth (a few facets), and at
 * least one clearly central facet.
 */
export function isProfileSufficient(
  facets: ILifeFacet[],
  opts: { minFacets?: number; minDimensions?: number; minTopSalience?: number } = {}
): boolean {
  const minFacets = opts.minFacets ?? 4;
  const minDimensions = opts.minDimensions ?? 3;
  const minTopSalience = opts.minTopSalience ?? 0.6;
  if (facets.length < minFacets) return false;
  if (distinctDimensions(facets).length < minDimensions) return false;
  return facets.some((f) => f.salience >= minTopSalience);
}
