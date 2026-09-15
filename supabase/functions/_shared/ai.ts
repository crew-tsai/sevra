// Talks to Google's Gemini API directly.
//
// This app was built in Lovable and later migrated out, but the AI calls kept
// pointing at ai.gateway.lovable.dev with a LOVABLE_API_KEY. That key was never
// set on the migrated project, so the entire AI surface has been dead: incident
// analysis, Agent Stripes, asset generation and the monitoring simulation all
// failed on a missing environment variable.
//
// The models are unchanged -- the gateway was only ever a proxy in front of
// Google. Google publishes an OpenAI-compatible endpoint, so the call sites
// keep their existing request shape (messages, tools, response_format) and
// their existing response parsing (choices[0].message.tool_calls). That keeps
// this migration a change of address rather than a rewrite of every prompt.
//
// Image generation is the exception: it needs the native endpoint, so it has
// its own function below.

const OPENAI_COMPAT_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const NATIVE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Model ids, centralised because they were previously spelled inline at each
 * call site with a `google/` prefix the gateway required and Google does not.
 * If a name drifts, it drifts in one place.
 */
export const MODELS = {
  /** Classification and reasoning. */
  reasoning: "gemini-3-flash-preview",
  /** Drafting and lighter-weight generation. */
  fast: "gemini-2.5-flash",
  /** Image generation. */
  image: "gemini-2.5-flash-image",
} as const;

export function aiKey(): string | null {
  return Deno.env.get("GEMINI_API_KEY")?.trim() || null;
}

/** Thrown when the key is absent, so callers can report it distinctly. */
export class MissingAIKey extends Error {
  constructor() {
    super("GEMINI_API_KEY is not configured");
    this.name = "MissingAIKey";
  }
}

/**
 * OpenAI-shaped chat completion against Gemini. `body` is passed through
 * untouched apart from the model, so tools, response_format and everything
 * else the call sites already send keep working.
 */
export async function chatCompletion(body: Record<string, unknown>): Promise<Response> {
  const key = aiKey();
  if (!key) throw new MissingAIKey();

  return await fetch(OPENAI_COMPAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Image generation via the native endpoint -- the OpenAI-compatible surface
 * does not carry image modalities.
 *
 * Returns a data: URL, matching what the previous gateway response was parsed
 * into, so storage and the UI are unaffected.
 */
export async function generateImage(
  prompt: string,
  model: string = MODELS.image,
): Promise<{ dataUrl: string } | { error: string; status: number }> {
  const key = aiKey();
  if (!key) throw new MissingAIKey();

  const res = await fetch(`${NATIVE_URL}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("generateImage: Gemini error", JSON.stringify(json).slice(0, 400));
    return { error: `Image generation request failed (${res.status})`, status: 502 };
  }

  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part?.inlineData ?? part?.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType ?? inline.mime_type ?? "image/png";
      return { dataUrl: `data:${mime};base64,${inline.data}` };
    }
  }

  console.error("generateImage: no image in response", JSON.stringify(json).slice(0, 400));
  return { error: "The model returned no image — try uploading one instead.", status: 502 };
}
