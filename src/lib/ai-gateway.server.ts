// Server-only helper for calling Lovable AI Gateway (Gemini).
// Used by server functions; never imported from client code.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callGemini(
  messages: ChatMessage[],
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "atlas-ai",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.6,
    }),
  });

  if (resp.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
  if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway error (${resp.status}): ${text.slice(0, 200)}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
