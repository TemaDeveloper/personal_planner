import type { AIProvider } from "@/lib/ai-providers";

/**
 * Resolve which AI provider/key to use: explicit request values win, otherwise
 * fall back to a server-configured key. Returns null if nothing is available.
 */
export function resolveAIConfig(body: {
  provider?: string;
  apiKey?: string;
}): { provider: AIProvider; apiKey: string } | null {
  if (body.provider && body.apiKey) {
    return { provider: body.provider as AIProvider, apiKey: body.apiKey };
  }
  if (process.env.MISTRAL_API_KEY) {
    return { provider: "mistral", apiKey: process.env.MISTRAL_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", apiKey: process.env.OPENAI_API_KEY };
  }
  return null;
}
