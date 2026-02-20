import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, companies } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const companySummary = (companies || [])
      .map((c: any) => `- "${c.name}" (id: ${c.id}, stage: ${c.stage}, price: ${c.estimatedPrice} kr, nextCall: ${c.nextCallAt || "none"})`)
      .join("\n");

    const systemPrompt = `You are a helpful sales CRM assistant for an Icelandic web agency. The user speaks in English but you can understand Icelandic too.
You help manage company records. You can perform the following ACTIONS based on what the user says.

Here are the current companies in the system:
${companySummary}

You MUST respond in TWO parts:
1. A short friendly reply in Icelandic (1-2 sentences)
2. A JSON block with any actions to perform, wrapped in <ACTIONS>...</ACTIONS>

Action types (use exact field names):
- add_note: { type: "add_note", companyId: string, note: string }
- update_price: { type: "update_price", companyId: string, price: number }
- update_stage: { type: "update_stage", companyId: string, stage: "email_sent"|"registered"|"preview"|"finished"|"paid" }
- schedule_call: { type: "schedule_call", companyId: string, nextCallAt: string } (ISO 8601 date string)
- update_owner: { type: "update_owner", companyId: string, owner: string }
- update_phone: { type: "update_phone", companyId: string, phone: string }

Match company names loosely (partial match, case insensitive).
If no action is needed, use <ACTIONS>[]</ACTIONS>.
If a company is not found, say so in the reply and use <ACTIONS>[]</ACTIONS>.

Example response format:
Skráð athugasemd fyrir Kaffihús Íslands!
<ACTIONS>[{"type":"add_note","companyId":"abc-123","note":"Interested in redesign, call back next week"}]</ACTIONS>`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Of margar beiðnir, reyndu aftur síðar." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Greiðslu krafist, bættu við inneign." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI villa" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract actions JSON from <ACTIONS>...</ACTIONS>
    const actionsMatch = content.match(/<ACTIONS>([\s\S]*?)<\/ACTIONS>/);
    let actions = [];
    if (actionsMatch) {
      try {
        actions = JSON.parse(actionsMatch[1].trim());
      } catch (e) {
        console.error("Failed to parse actions:", actionsMatch[1]);
      }
    }

    // Extract the text reply (everything before <ACTIONS>)
    const replyText = content.replace(/<ACTIONS>[\s\S]*?<\/ACTIONS>/g, "").trim();

    return new Response(JSON.stringify({ reply: replyText, actions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
