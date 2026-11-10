import { useEffect, useRef, useState } from "react";
import { submitBooking } from "@/lib/booking-email.functions";
import { Pill, PillArrow } from "@/components/SvifBits";

/*
  One short form on the dark stage: company, kennitala, the offer, and a way to reach them.
  Everything else (logo, pictures, category, wording of the ad) is sorted out in the first
  phone call or e-mail after the request comes in. Fields are hairlines, not boxes.

  Validation is said, not implied: the button is always enabled; on submit (and on blur after the
  first attempt) each field gets aria-invalid and one short line under it, and focus moves to the
  first field that needs attention. After sending, focus moves to the result.
*/
type Key = "company" | "kennitala" | "offer" | "email" | "phone";

export function BookingForm({
  brochure = "Nýji kaflinn",
}: {
  brochure?: string;
} = {}) {
  /** the business page speaks to the company (þið: "hringið"), the home page to one person (þú) */
  const isBiz = brochure === "Fyrirtækjabæklingur";
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [tried, setTried] = useState(false);
  const [form, setForm] = useState({
    company: "",
    kennitala: "",
    offer: "",
    email: "",
    phone: "",
  });
  const doneRef = useRef<HTMLParagraphElement | null>(null);
  /** honeypot: never shown, never reached by keyboard; a bot that fills it gets a quiet "done" */
  const trapRef = useRef<HTMLInputElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);

  const set = (key: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const kt = form.kennitala.replace(/\D/g, "");
  const email = form.email.trim();
  const phone = form.phone.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const phoneOk = phone.replace(/\D/g, "").length >= 7;
  const errors: Partial<Record<Key, string>> = {};
  if (!form.company.trim()) errors.company = "Nafn fyrirtækis vantar";
  if (kt.length !== 10) errors.kennitala = "Kennitala er 10 tölustafir";
  if (!form.offer.trim()) errors.offer = "Tilboð vantar";
  if (email && !emailOk) errors.email = "Netfang er ekki gilt";
  if (phone && !phoneOk) errors.phone = "Símanúmer er of stutt";
  if (!email && !phone) errors.email = "Netfang eða sími vantar";
  const valid = Object.keys(errors).length === 0;
  const show = (k: Key) => (tried ? errors[k] : undefined);

  useEffect(() => {
    if (status === "done") doneRef.current?.focus();
    if (status === "error") errorRef.current?.focus();
  }, [status]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setTried(true);
    if (!valid) {
      const first = (["company", "kennitala", "offer", "email", "phone"] as Key[]).find(
        (k) => errors[k],
      );
      if (first) document.getElementById(`bf-${first}`)?.focus();
      return;
    }
    setStatus("sending");

    // one request: the server stores it and only then sends the e-mails (booking-email.server.ts).
    // Anything that goes wrong (network, a stale deploy, the server's limit) shows the error line.
    try {
      const res = await submitBooking({
        data: {
          company: form.company.trim().slice(0, 160),
          kennitala: kt,
          offer: form.offer.trim().slice(0, 300),
          email: email.slice(0, 200),
          phone: phone.slice(0, 60),
          brochure: isBiz ? "Fyrirtækjabæklingur" : "Nýji kaflinn",
          website: trapRef.current?.value ?? "",
        },
      });
      setStatus(res.ok ? "done" : "error");
    } catch (err) {
      console.error("Booking request failed", err);
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div
        role="status"
        className="border-t border-[color:var(--cream)]/20 pt-10 text-[color:var(--cream)]"
      >
        <p ref={doneRef} tabIndex={-1} className="display-caps text-[1.6rem] outline-none">
          Takk.
        </p>
        <p className="mt-4 max-w-[28rem] text-[15px] leading-relaxed text-[color:var(--cream)]/72">
          Við höfum samband innan tveggja virkra daga.
        </p>
        <p className="mt-6 label-caps text-[length:max(10.5px,0.62rem)] text-[color:var(--cream)]/68">
          Liggur á?{" "}
          <a
            href="tel:8535147"
            className="link-wipe inline-flex min-h-[44px] items-center text-[color:var(--cream)]/85"
          >
            853 5147
          </a>
        </p>
      </div>
    );
  }

  const field =
    "peer mt-1 w-full border-0 border-b border-[color:var(--cream)]/24 bg-transparent px-0 pb-3 pt-2 text-[16px] text-[color:var(--cream)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[color:var(--cream)]/40 focus:border-[color:var(--cream)]/90 focus-visible:shadow-[0_1px_0_0_var(--cream)] focus-visible:outline-none aria-[invalid=true]:border-[color:var(--rose)]";
  const label = "block label-caps text-[length:max(10.5px,0.6rem)] text-[color:var(--cream)]/75";
  const hint = "mt-2 text-[12.5px] leading-snug text-[#e2c4ae]";
  const offerLabel = isBiz ? "Tilboð til nýrra fyrirtækja" : "Tilboð til nýrra húseigenda";
  const offerHint = isBiz
    ? "t.d. fyrsti mánuðurinn frír eða 20% afsláttur"
    : "t.d. 15% afsláttur af fyrsta verki eða frí úttekt";
  const describe = (k: Key, extra?: string) =>
    [show(k) ? `bf-${k}-err` : "", extra ?? ""].filter(Boolean).join(" ") || undefined;
  const msg = (k: Key) =>
    show(k) ? (
      <p id={`bf-${k}-err`} className={hint}>
        {show(k)}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} className="relative text-left text-[color:var(--cream)]" noValidate>
      <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="bf-company">
            Nafn fyrirtækis
          </label>
          <input
            id="bf-company"
            className={field}
            value={form.company}
            onChange={set("company")}
            maxLength={160}
            autoComplete="organization"
            required
            aria-invalid={!!show("company")}
            aria-describedby={describe("company")}
          />
          {msg("company")}
        </div>
        <div>
          <label className={label} htmlFor="bf-kennitala">
            Kennitala
          </label>
          <input
            id="bf-kennitala"
            className={field}
            value={form.kennitala}
            onChange={set("kennitala")}
            maxLength={11}
            inputMode="numeric"
            placeholder="000000-0000"
            required
            aria-invalid={!!show("kennitala")}
            aria-describedby={describe("kennitala")}
          />
          {msg("kennitala")}
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="bf-offer">
            {offerLabel}
          </label>
          <textarea
            id="bf-offer"
            rows={2}
            className={`${field} resize-none`}
            value={form.offer}
            onChange={set("offer")}
            maxLength={300}
            placeholder={offerHint}
            required
            aria-invalid={!!show("offer")}
            aria-describedby={describe("offer")}
          />
          {msg("offer")}
        </div>
        <div>
          <label className={label} htmlFor="bf-email">
            Netfang
          </label>
          <input
            id="bf-email"
            type="email"
            className={field}
            value={form.email}
            onChange={set("email")}
            maxLength={200}
            autoComplete="email"
            aria-invalid={!!show("email")}
            aria-describedby={describe("email", "bf-contact-hint")}
          />
          {msg("email")}
        </div>
        <div>
          <label className={label} htmlFor="bf-phone">
            Sími
          </label>
          <input
            id="bf-phone"
            type="tel"
            className={field}
            value={form.phone}
            onChange={set("phone")}
            maxLength={60}
            autoComplete="tel"
            aria-invalid={!!show("phone")}
            aria-describedby={describe("phone", "bf-contact-hint")}
          />
          {msg("phone")}
        </div>
      </div>
      {/* honeypot (see trapRef): off-screen, out of the tab order and hidden from assistive tech */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="bf-website">Vefsíða</label>
        <input
          ref={trapRef}
          id="bf-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <p
        id="bf-contact-hint"
        className="mt-4 text-[12.5px] leading-relaxed text-[color:var(--cream)]/68"
      >
        Netfang eða sími dugar.
      </p>

      {status === "error" && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 text-[14px] text-[color:var(--cream)]/90 outline-none"
        >
          {isBiz
            ? "Það tókst ekki að senda. Reynið aftur eða hringið í 853 5147."
            : "Það tókst ekki að senda. Reyndu aftur eða hringdu í 853 5147."}
        </p>
      )}

      <div className="mt-10 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <a
          href="tel:8535147"
          className="label-caps inline-flex min-h-[44px] items-center justify-center text-center text-[length:max(10.5px,0.62rem)] text-[color:var(--cream)]/72 sm:justify-start sm:text-left"
        >
          {isBiz ? "Eða hringið í" : "Eða hringdu í"}{" "}
          <span className="link-wipe ml-1.5 text-[color:var(--cream)]/90">853 5147</span>
        </a>
        <Pill
          type="submit"
          variant={valid ? "solid-cream" : "outline-cream"}
          size="lg"
          disabled={status === "sending"}
          className="w-full disabled:!opacity-55 sm:w-auto"
        >
          {status === "sending" ? "Sendi…" : "Senda"}
          <PillArrow />
        </Pill>
      </div>
    </form>
  );
}
