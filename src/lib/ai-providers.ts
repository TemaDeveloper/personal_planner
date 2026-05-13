export type AIProvider = "claude" | "gemini" | "openai" | "mistral";

export const AI_PROVIDERS: { id: AIProvider; label: string; placeholder: string }[] = [
  { id: "mistral", label: "Mistral", placeholder: "your-mistral-key" },
  { id: "claude", label: "Claude", placeholder: "sk-ant-..." },
  { id: "gemini", label: "Gemini", placeholder: "AIza..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
];
