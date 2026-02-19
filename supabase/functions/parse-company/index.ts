import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
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
        messages: [
          {
            role: "system",
            content: `You are a data extraction assistant. The user will paste text copied from finna.is (an Icelandic business directory). Extract structured information.

Extract:
- name: company name
- owner: owner/contact person name (leave empty if not explicitly mentioned as a person's name)
- companyId: kennitala / kt. number (e.g. "7012922439")
- websiteUrl: the company's OWN website (NOT finna.is)
- finnaUrl: ONLY extract a finna.is URL if one appears VERBATIM in the pasted text. The finna.is internal ID is a short alphanumeric code (like "emwwNY"), NOT the kennitala. NEVER construct or guess a finna.is URL. If no finna.is URL is present in the text, return an empty string.
- estimatedPrice: default 160000
- stage: default "email_sent"
- email: try to guess the company's email from their website domain or any email visible in the text. If the website is e.g. example.is, guess info@example.is. Mark it as a guess. If no website or email found, leave empty.

IMPORTANT: Do NOT extract phone numbers. Do NOT fill in notes. Leave phone and notes empty.
CRITICAL: NEVER fabricate finna.is URLs. The kennitala is NOT the finna.is ID.`
          },
          { role: "user", content: text }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_company",
              description: "Extract structured company data from text",
              parameters: {
                type: "object",
                  properties: {
                    name: { type: "string", description: "Company name" },
                    owner: { type: "string", description: "Owner or contact person name" },
                    companyId: { type: "string", description: "Kennitala (kt.) number" },
                    websiteUrl: { type: "string", description: "Company's own website URL, NOT finna.is" },
                    finnaUrl: { type: "string", description: "The finna.is URL for this company" },
                    estimatedPrice: { type: "number", description: "Estimated price in ISK, default 160000" },
                    stage: { type: "string", enum: ["email_sent", "registered", "preview", "finished", "paid"] },
                    email: { type: "string", description: "Probable email address for the company, guessed from domain if needed" }
                  },
                  required: ["name", "owner", "companyId", "websiteUrl", "finnaUrl", "estimatedPrice", "stage", "email"],
                  additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_company" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Hraðatakmörk náð, reyndu aftur síðar." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredit búið, bættu við inneign." }), {
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ekki tókst að greina texta" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-company error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
