import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warn" | "queued" | "sent" | "danger" | "ember";

const TONES: Record<Tone, string> = {
  neutral: "bg-white/5 text-foreground border-white/10",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  warn: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  queued: "bg-orange-500/15 text-orange-200 border-orange-400/30",
  sent: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  danger: "bg-red-500/15 text-red-300 border-red-400/30",
  ember: "ember-bg border-transparent shadow-ember",
};

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function StatusPill({ tone = "neutral", className, ...props }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-md",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}