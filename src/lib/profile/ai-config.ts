import type { AIProvider } from "@/lib/ai-providers";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user";

/**
 * Resolve which AI provider/key to use: explicit request values win, then a
 * server-configured key, then the user's own saved aiConfig from settings.
 * Returns null if nothing is available.
 */
export async function resolveAIConfig(
  body: {
    provider?: string;
    apiKey?: string;
  },
  userId?: string | null
): Promise<{ provider: AIProvider; apiKey: string } | null> {
  if (body.provider && body.apiKey) {
    return { provider: body.provider as AIProvider, apiKey: body.apiKey };
  }
  if (process.env.MISTRAL_API_KEY) {
    return { provider: "mistral", apiKey: process.env.MISTRAL_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
  }
  // Fall back to the key the user saved in Settings (same source the AI Studio
  // routes use — see edit-layout's user.aiConfig usage).
  if (userId) {
    await connectDB();
    const user = await User.findById(userId).select("aiConfig").lean();
    if (user?.aiConfig?.provider && user.aiConfig.apiKey) {
      return { provider: user.aiConfig.provider, apiKey: user.aiConfig.apiKey };
    }
  }
  return null;
}
