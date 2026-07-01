import type { ILifeFacet } from "@/lib/models/life-profile";
import { distinctDimensions } from "@/lib/profile/merge";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const ONBOARDING_SYSTEM_PROMPT = `You are Lifora's onboarding guide. Your goal is to understand how THIS person actually lives so their planner can be built around them — not a generic template.

Interview warmly, ONE question at a time. Start broad ("Walk me through a typical week"), then follow the threads that matter to them (how they earn, how they move, how they rest, who they care for, what they're working toward). Never assume a car, a 9-5, a gym, or a family — ask.

Do not force their life into fixed categories. If something about them doesn't fit common buckets, that's the most important thing to capture.

Keep replies short and human. When you clearly understand their life, say you're ready to build their planner.`;

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
  const minFacets = opts.minFacets ?? 5;
  const minDimensions = opts.minDimensions ?? 4;
  const minTopSalience = opts.minTopSalience ?? 0.7;
  if (facets.length < minFacets) return false;
  if (distinctDimensions(facets).length < minDimensions) return false;
  return facets.some((f) => f.salience >= minTopSalience);
}
