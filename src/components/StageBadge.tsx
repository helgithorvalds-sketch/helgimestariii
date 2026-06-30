import { CompanyStage, STAGE_LABELS } from "@/types";

interface StageBadgeProps {
  stage: CompanyStage;
  size?: "sm" | "md";
}

const stageClassMap: Record<CompanyStage, string> = {
  email_sent: "stage-badge-email",
  registered: "stage-badge-registered",
  preview: "stage-badge-preview",
  finished: "stage-badge-finished",
  paid: "stage-badge-paid",
  lead: "stage-badge-email",
};

export function StageBadge({ stage, size = "sm" }: StageBadgeProps) {
  const sizeClass = size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3.5 py-1.5 text-sm";
  return (
    <span className={`inline-flex items-center rounded-full font-semibold tracking-wide uppercase shadow-xs ring-1 ring-inset ring-white/15 ${stageClassMap[stage]} ${sizeClass}`}>
      {STAGE_LABELS[stage]}
    </span>
  );
}
