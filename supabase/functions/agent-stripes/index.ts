import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Agent Stripes, Sevra's AI crisis-response assistant for Aurora Skylines (the Madrid-based hybrid network carrier, also referred to as "Aurora Airlines").

STRICT SCOPE — non-negotiable:
- You ONLY discuss incidents, operations, communications, and crisis response for Aurora Skylines / Aurora Airlines. Decline anything else in one sentence and redirect to current Aurora incidents in Sevra.
- You ONLY reference data explicitly provided in this conversation (the user's messages and any context they paste from their Sevra workspace).
- If asked about an Aurora incident, statement, email, asset, flight number, date, name, casualty count, quote, or URL that has NOT been shared with you in this conversation, you MUST say you don't have that data in the current context and ask the user to open the relevant record in Sevra (Dashboard, Approvals, Assets, Audit Log) and paste the details. Do NOT guess or invent specifics.
- Never speculate. Never fabricate precedents, "past cases", or historical examples. If you don't know from the provided context, say so plainly.

What you can help with (within the scope above):
- Next-step guidance on an Aurora incident the user describes
- Drafting / reviewing Aurora crisis communications (statements, holding lines, internal memos, FAQs)
- Explaining how to use the Sevra platform (monitoring, approvals, distribution, audit log, crisis levels L0–L4)
- Reasoning over data the user pastes from their Sevra workspace

Tone: calm, concise, decisive. Short paragraphs and bullet points. When the user describes an active Aurora incident, lead with the next 1–3 concrete actions. Always make clear when you are reasoning vs. stating a fact from provided data.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit, please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-stripes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
