import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ────────────────────────────────────────────────────────────────
// PROVIDER INTEGRATION POINT
// Drop in a Twilio (SMS) or Resend (email) call inside `deliver`.
// Return { ok: true } on success or { ok: false, error } on failure.
// The surrounding queue/status logic does not need to change.
// ────────────────────────────────────────────────────────────────
async function deliver(_row: {
  channel: string;
  recipient: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  // TODO: Provider integration — Twilio SMS or Resend email goes here.
  // Example (Twilio):
  //   const res = await fetch("https://api.twilio.com/...", { ... });
  //   if (!res.ok) return { ok: false, error: await res.text() };
  console.log("[send-reminders] would deliver:", _row);
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date().toISOString().slice(0, 10);

    const { data: rows, error } = await supabase
      .from("notifications_outbox")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_date", today);

    if (error) throw error;

    let processed = 0;
    for (const row of rows || []) {
      const result = await deliver({
        channel: row.channel,
        recipient: row.recipient,
        message: row.message,
      });
      if (result.ok) {
        await supabase
          .from("notifications_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
          .eq("id", row.id);
      } else {
        await supabase
          .from("notifications_outbox")
          .update({ status: "failed", error: result.error || "unknown" })
          .eq("id", row.id);
      }
      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("send-reminders error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});