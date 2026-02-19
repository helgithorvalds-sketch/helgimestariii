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
};

export function StageBadge({ stage, size = "sm" }: StageBadgeProps) {
  const sizeClass = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${stageClassMap[stage]} ${sizeClass}`}>
      {STAGE_LABELS[stage]}
    </span>
  );
}
