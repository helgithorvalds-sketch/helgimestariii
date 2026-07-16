import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { audio, mime } = await req.json();
    if (!audio || typeof audio !== "string") {
      return new Response(JSON.stringify({ error: "audio (base64) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const bin = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
    const mt = (mime as string) || "audio/webm";
    const ext = mt.includes("mp4") ? "mp4" : mt.includes("wav") ? "wav" : mt.includes("mpeg") ? "mp3" : "webm";
    const blob = new Blob([bin], { type: mt });
    const form = new FormData();
    form.append("file", blob, `recording.${ext}`);
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("language", "is");

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!upstream.ok) {
      const t = await upstream.text().catch(() => "");
      return new Response(JSON.stringify({ error: `Transcription failed: ${upstream.status}`, detail: t }), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await upstream.json();
    return new Response(JSON.stringify({ text: data.text || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});