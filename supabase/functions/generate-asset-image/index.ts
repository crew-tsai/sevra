// Generates an image for an Instagram asset and stores it in the asset-media
// bucket. This is the only image-generation call in the codebase, so it stays
// defensive: if no image comes back in a recognized shape it fails with a
// clear, specific error rather than crashing or silently doing nothing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { generateImage } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(token);
    if (!userData?.user?.id) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { asset_id, prompt } = await req.json().catch(() => ({}));
    if (!asset_id || typeof asset_id !== "string") {
      return new Response(JSON.stringify({ success: false, error: "asset_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof prompt !== "string" || !prompt.trim()) {
      return new Response(JSON.stringify({ success: false, error: "prompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: asset, error: assetErr } = await admin
      .from("incident_assets")
      .select("id, asset_type")
      .eq("id", asset_id)
      .maybeSingle();
    if (assetErr) throw assetErr;
    if (!asset) throw new Error("Asset not found");

    // Image modalities aren't carried by the OpenAI-compatible surface, so
    // this one goes through Gemini's native endpoint.
    const image = await generateImage(prompt);
    if ("error" in image) {
      return new Response(JSON.stringify({ success: false, error: image.error }), {
        status: image.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dataUrl = image.dataUrl;

    const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return new Response(
        JSON.stringify({ success: false, error: "Unexpected image format returned by the gateway." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const [, mimeType, base64Data] = match;
    const ext = mimeType.split("/")[1] ?? "png";
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const path = `${asset_id}-generated-${Date.now()}.${ext}`;
    const { error: uploadErr } = await admin.storage
      .from("asset-media")
      .upload(path, bytes, { contentType: mimeType, upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = admin.storage.from("asset-media").getPublicUrl(path);

    const { error: updateErr } = await admin
      .from("incident_assets")
      .update({ media_url: publicUrlData.publicUrl, media_type: "image", media_source: "generated" })
      .eq("id", asset_id);
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, media_url: publicUrlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-asset-image error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
