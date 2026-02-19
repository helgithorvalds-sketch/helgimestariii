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

The text is ALWAYS from a finna.is company page. The URL pattern is: https://www.finna.is/fyrirtaeki/<ID>/<company-slug>
Example: "Finna - VPS Verkfræðiþjónusta" → the finna.is link is something like "https://www.finna.is/fyrirtaeki/XXXXX/vps-verkfraedithjonusta"

Extract:
- name: company name (e.g. "VPS Verkfræðiþjónusta")
- owner: owner/contact person name (leave empty if not explicitly mentioned as a person's name)
- companyId: kennitala / kt. number (e.g. "7012922439")
- phone: primary phone number, digits only (e.g. "5671278")
- websiteUrl: the company's OWN website (e.g. "http://www.vps.is"), NOT finna.is
- finnaUrl: if a finna.is URL is present in the text, extract it exactly. If not present but you can see the company name, leave empty - the frontend will handle it.
- email: email address if present (e.g. "tryggvi@vps.is")
- estimatedPrice: default 160000 (valid range 160000-220000)
- notes: Put the finna.is link here prominently at the top, then any other info like address, email, facebook link etc.
- stage: default "email_sent"

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
                  owner: { type: "string", description: "Owner or contact person name" },
                  companyId: { type: "string", description: "Kennitala (kt.) number" },
                  phone: { type: "string", description: "Phone number, digits only" },
                  websiteUrl: { type: "string", description: "Company's own website URL, NOT finna.is" },
                  finnaUrl: { type: "string", description: "The finna.is URL for this company" },
                  email: { type: "string", description: "Email address" },
                  estimatedPrice: { type: "number", description: "Estimated price in ISK, default 160000" },
                  notes: { type: "string", description: "Finna.is link at top, then address, email, facebook, etc." },
                  stage: { type: "string", enum: ["email_sent", "registered", "preview", "finished", "paid"] }
                },
                required: ["name", "owner", "companyId", "phone", "websiteUrl", "finnaUrl", "email", "estimatedPrice", "notes", "stage"],
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
