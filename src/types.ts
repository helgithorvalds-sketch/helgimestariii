export type CompanyStage = 
  | "email_sent" 
  | "registered" 
  | "preview" 
  | "finished" 
  | "paid"
  | "lead";

export type LeadSource = "facebook" | "new_company" | "restaurant";

export type PreviewSubStatus = 
  | "wanted_preview"
  | "sold_preview" 
  | "fifty_fifty" 
  | "needed_website";

export type FinishedSubStatus =
  | "not_contacted"
  | "contacted"
  | "website_changed"
  | "krafa";

export type PaidSubStatus =
  | "fully_paid"
  | "partially_paid";

export interface ContactPerson {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

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
  websiteUrl?: string;
  finnaUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  industry?: string;
  leadSource?: LeadSource;
  facebookUrl?: string;
  jaUrl?: string;
  googleUrl?: string;
  category?: string;
  registeredDate?: string;
  pitch?: string;
  rejected?: boolean;
  rejectedAt?: string;
  lastCallOutcome?: "answered" | "no_answer" | "rejected" | "interested";
  stage: CompanyStage;
  previewSubStatus?: PreviewSubStatus;
  finishedSubStatus?: FinishedSubStatus;
  paidSubStatus?: PaidSubStatus;
  estimatedPrice: number;
  customPrice?: number;
  contacts: ContactPerson[];
  checklist: ChecklistItem[];
  notes: string;
  personalityDescription: string;
  previewSent: boolean;
  projectedEarnings: number;
  amountPaid?: number;
  paidDate?: string;
  monthlyPaymentAmount?: number;
  monthlyPaymentStartDate?: string;
  monthlyPaymentActive: boolean;
  nextCallAt?: string;
  createdAt: string;
}

export const STAGE_LABELS: Record<CompanyStage, string> = {
  email_sent: "Tölvupóstur sendur",
  registered: "Skráð",
  preview: "Vill sýnishorn",
  finished: "Lokið",
  paid: "Greitt",
  lead: "Til að hringja",
};

export const PREVIEW_SUB_LABELS: Record<PreviewSubStatus, string> = {
  wanted_preview: "Vildi forskoðun",
  sold_preview: "Selt sýnishorn",
  fifty_fifty: "50/50",
  needed_website: "Þarf vefsíðu",
};

export const PREVIEW_SUB_ORDER: PreviewSubStatus[] = [
  "wanted_preview",
  "sold_preview",
  "fifty_fifty",
  "needed_website",
];

export const FINISHED_SUB_LABELS: Record<FinishedSubStatus, string> = {
  not_contacted: "Ekki haft samband",
  contacted: "Haft samband",
  website_changed: "Vefsíða breytt",
  krafa: "Krafa",
};

export const FINISHED_SUB_ORDER: FinishedSubStatus[] = [
  "not_contacted",
  "contacted",
  "website_changed",
  "krafa",
];

export const PAID_SUB_LABELS: Record<PaidSubStatus, string> = {
  fully_paid: "Greitt að fullu",
  partially_paid: "Greitt X",
};

export const PAID_SUB_ORDER: PaidSubStatus[] = [
  "partially_paid",
  "fully_paid",
];

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
  { label: "Greitt X", checked: false },
];

export const PRICE_OPTIONS = [
  { label: "160 - 200.000 kr.", value: 160000 },
  { label: "300.000+ kr.", value: 300000 },
];
