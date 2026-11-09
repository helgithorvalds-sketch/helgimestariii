import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import { sendTemplateEmail } from "./email-templates/send-email";

// Server-only. The booking form posts here (booking-email.functions.ts): the request is stored
// first, and only a stored request sends e-mail.

export interface BookingRequest {
  company: string;
  kennitala: string;
  offer: string;
  /** the applicant's own address; empty when they gave only a phone number */
  email: string;
  phone: string;
  brochure: "Nýji kaflinn" | "Fyrirtækjabæklingur";
  /** honeypot (never shown to people) */
  website: string;
}

export interface BookingEmailInput {
  company: string;
  /** the applicant's own address; empty when they gave only a phone number */
  email?: string;
  phone?: string;
  category?: string;
  details?: string;
  requestId?: string;
}

const OWNER = "helgithorvalds@gmail.com";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/*
  Per-IP limit: 3 requests per 10 minutes. It lives in the server instance's memory, so it is a
  brake, not a guarantee (each worker instance counts on its own); together with the once-a-day
  confirmation per address below it stops the form being used to flood an inbox.
*/
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function allow(ip: string, now = Date.now()) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  // keep the map small
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return true;
}

function clientIp() {
  try {
    return (
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

/** The same publishable key and row-level rules as the browser had; no session on the server. */
function database() {
  const url = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
  const opaque = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      // new-style API keys are opaque strings, not bearer JWTs (as in integrations/supabase/client)
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (opaque && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function submitBookingRequest(
  data: BookingRequest,
): Promise<{ ok: true } | { ok: false; reason: "limit" | "store" }> {
  // a bot filled the hidden field: it is told all went well, and nothing is stored or sent
  if (data.website.trim()) return { ok: true };
  if (!allow(clientIp())) return { ok: false, reason: "limit" };

  const isBiz = data.brochure === "Fyrirtækjabæklingur";
  const email = EMAIL.test(data.email) ? data.email.slice(0, 200) : "";
  const phone = data.phone.slice(0, 60);
  const company = data.company.slice(0, 160);
  const offer = data.offer.slice(0, 300);

  const { error } = await database()
    .from("booking_requests")
    .insert({
      name: company,
      company,
      email: email || `${data.kennitala}@engin-netfang.svif.is`,
      phone: phone || null,
      kennitala: data.kennitala,
      discount_offer: offer,
      category: isBiz ? "Fyrirtækjabæklingur" : null,
      message: isBiz ? "Bæklingur: SVIF fyrir fyrirtæki." : "Bæklingur: Nýji kaflinn.",
    });
  if (error) {
    console.error("[booking] insert failed", error.message);
    return { ok: false, reason: "store" };
  }

  // the request is stored: the e-mails may fail without failing the request
  await sendBookingEmails({
    company,
    email,
    phone,
    category: data.brochure,
    details: [`Kennitala: ${data.kennitala}`, `Tilboð: ${offer}`].join("\n"),
    requestId: `${data.kennitala}-${Date.now()}`,
  });
  return { ok: true };
}

/**
 * Two e-mails per stored request: the internal notification (always, to SVIF) and the confirmation
 * (only to the applicant's own address, and only when they gave one). Never send the customer's
 * confirmation to SVIF's own address, and never set SVIF as its own reply-to. An address gets at
 * most one confirmation a day (the idempotency key carries the date).
 */
async function sendBookingEmails(data: BookingEmailInput) {
  const applicant = data.email && EMAIL.test(data.email) ? data.email : "";
  const key = data.requestId || `${applicant || data.company}-${Date.now()}`;
  const day = new Date().toISOString().slice(0, 10);

  const sends: Promise<unknown>[] = [
    sendTemplateEmail("booking-notification", OWNER, {
      templateData: {
        company: data.company,
        email: applicant,
        phone: data.phone,
        category: data.category,
        details: data.details,
      },
      idempotencyKey: `booking-notification-${key}`,
      replyTo: applicant || undefined,
    }),
  ];

  if (applicant) {
    sends.push(
      sendTemplateEmail("booking-confirmation", applicant, {
        templateData: { category: data.category },
        idempotencyKey: `booking-confirmation-${applicant.toLowerCase()}-${day}`,
      }),
    );
  }

  const results = await Promise.allSettled(sends);
  for (const r of results) {
    if (r.status === "rejected") console.error("[booking-email]", r.reason);
  }
}
