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
            content: `You are a data extraction assistant. Given raw text about a company, extract structured information.
Return a JSON object using this tool call. Extract:
- name: company name
- owner: owner/contact person name (leave empty if not found)
- companyId: kennitala or ID number (Icelandic format if possible)
- phone: phone number (just digits, e.g. "4535170")
- websiteUrl: the company website URL (e.g. "http://tborg.is")
- finnaUrl: the finna.is link if present in the text (e.g. "https://www.finna.is/fyrirtaeki/emwwNY/tresmidjan-borg")
- estimatedPrice: estimated price as number (default 160000 if not mentioned, valid range 160000-220000)
- personalityDescription: brief description of the company personality/vibe
- notes: any other relevant notes. IMPORTANT: Always include the finna.is link in the notes if one is found in the text.
- stage: one of "email_sent", "registered", "preview", "finished", "paid" based on context (default "email_sent")

If you can't find a field, leave it as empty string or default value.`
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
                  owner: { type: "string", description: "Owner or contact person" },
                  companyId: { type: "string", description: "Kennitala or ID" },
                  phone: { type: "string", description: "Phone number" },
                  websiteUrl: { type: "string", description: "Company website URL" },
                  finnaUrl: { type: "string", description: "Finna.is link" },
                  estimatedPrice: { type: "number", description: "Estimated price in ISK" },
                  personalityDescription: { type: "string", description: "Company personality" },
                  notes: { type: "string", description: "Additional notes including finna.is link" },
                  stage: { type: "string", enum: ["email_sent", "registered", "preview", "finished", "paid"] }
                },
                required: ["name", "owner", "companyId", "phone", "websiteUrl", "finnaUrl", "estimatedPrice", "personalityDescription", "notes", "stage"],
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
