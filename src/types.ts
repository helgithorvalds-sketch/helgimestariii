export type CompanyStage = 
  | "email_sent" 
  | "registered" 
  | "preview" 
  | "finished" 
  | "paid";

export type PreviewSubStatus = 
  | "sold_preview" 
  | "fifty_fifty" 
  | "needed_website";

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface Company {
  id: string;
  name: string;
  owner: string;
  companyId: string;
  logoUrl?: string;
  stage: CompanyStage;
  previewSubStatus?: PreviewSubStatus;
  estimatedPrice: number;
  customPrice?: number;
  checklist: ChecklistItem[];
  notes: string;
  personalityDescription: string;
  previewSent: boolean;
  projectedEarnings: number;
  amountPaid?: number;
  paidDate?: string;
  createdAt: string;
}

export const STAGE_LABELS: Record<CompanyStage, string> = {
  email_sent: "Tölvupóstur sendur",
  registered: "Skráð",
  preview: "Forskoðun",
  finished: "Lokið",
  paid: "Greitt",
};

export const STAGE_ORDER: CompanyStage[] = [
  "email_sent",
  "registered",
  "preview",
  "finished",
  "paid",
];

export const DEFAULT_CHECKLIST: Omit<ChecklistItem, "id">[] = [
  { label: "Haft samband", checked: false },
  { label: "Upplýsingar fengnar", checked: false },
  { label: "Verð samþykkt", checked: false },
  { label: "Forskoðun tilbúin", checked: false },
  { label: "Forskoðun send", checked: false },
  { label: "Endanleg vefsíða tilbúin", checked: false },
  { label: "Greiðsla móttekin", checked: false },
];

export const PRICE_OPTIONS = [
  { label: "160.000 kr.", value: 160000 },
  { label: "180.000 kr.", value: 180000 },
  { label: "200.000 kr.", value: 200000 },
  { label: "220.000 kr.", value: 220000 },
];
