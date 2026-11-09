import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { submitBookingRequest } from "./booking-email.server";

/*
  The booking form's only endpoint. The server stores the request itself and sends the two e-mails
  only for the row it has just created, so the e-mails can no longer be triggered on their own
  (the old notify endpoint mailed any address it was given). See booking-email.server.ts for the
  honeypot, the per-IP limit and the once-a-day confirmation per address.
*/
const schema = z
  .object({
    company: z.string().trim().min(1).max(160),
    kennitala: z.string().regex(/^\d{10}$/),
    offer: z.string().trim().min(1).max(300),
    email: z.string().trim().max(200).optional().default(""),
    phone: z.string().trim().max(60).optional().default(""),
    brochure: z.enum(["Nýji kaflinn", "Fyrirtækjabæklingur"]),
    /** honeypot: a field people never see or reach; bots fill it in */
    website: z.string().max(200).optional().default(""),
  })
  .refine((d) => d.email !== "" || d.phone !== "", { message: "email or phone" });

export type BookingRequestInput = z.infer<typeof schema>;

export const submitBooking = createServerFn({ method: "POST" })
  .validator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => submitBookingRequest(data));
