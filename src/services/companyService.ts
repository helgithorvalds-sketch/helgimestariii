import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyStage, ChecklistItem, ContactPerson, PreviewSubStatus, FinishedSubStatus, PaidSubStatus } from "@/types";

// Convert DB row to Company type
function rowToCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    companyId: row.company_id,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    finnaUrl: row.finna_url,
    phone: row.phone,
    email: row.email,
    address: row.address || undefined,
    industry: row.industry || undefined,
    leadSource: row.lead_source || undefined,
    facebookUrl: row.facebook_url || undefined,
    jaUrl: row.ja_url || undefined,
    googleUrl: row.google_url || undefined,
    category: row.category || undefined,
    registeredDate: row.registered_date || undefined,
    pitch: row.pitch || undefined,
    rejected: row.rejected ?? false,
    rejectedAt: row.rejected_at || undefined,
    lastCallOutcome: row.last_call_outcome || undefined,
    stage: row.stage as CompanyStage,
    previewSubStatus: row.preview_sub_status,
    finishedSubStatus: row.finished_sub_status,
    paidSubStatus: row.paid_sub_status,
    estimatedPrice: row.estimated_price,
    customPrice: row.custom_price,
    checklist: (row.checklist || []) as ChecklistItem[],
    contacts: (row.contacts || []) as ContactPerson[],
    notes: row.notes,
    personalityDescription: row.personality_description,
    previewSent: row.preview_sent,
    projectedEarnings: row.projected_earnings,
    amountPaid: row.amount_paid,
    paidDate: row.paid_date,
    monthlyPaymentAmount: row.monthly_payment_amount,
    monthlyPaymentStartDate: row.monthly_payment_start_date,
    monthlyPaymentActive: row.monthly_payment_active ?? false,
    nextCallAt: row.next_call_at,
    createdAt: row.created_at,
  };
}

// Convert Company to DB row format
function companyToRow(company: Omit<Company, "id" | "createdAt">) {
  return {
    name: company.name,
    owner: company.owner,
    company_id: company.companyId,
    logo_url: company.logoUrl || null,
    website_url: company.websiteUrl || null,
    finna_url: company.finnaUrl || null,
    phone: company.phone || null,
    email: company.email || null,
    address: company.address || null,
    industry: company.industry || null,
    lead_source: company.leadSource || null,
    facebook_url: company.facebookUrl || null,
    ja_url: company.jaUrl || null,
    google_url: company.googleUrl || null,
    category: company.category || null,
    registered_date: company.registeredDate || null,
    pitch: company.pitch || null,
    rejected: company.rejected ?? false,
    rejected_at: company.rejectedAt || null,
    last_call_outcome: company.lastCallOutcome || null,
    stage: company.stage,
    preview_sub_status: company.previewSubStatus || null,
    finished_sub_status: company.finishedSubStatus || null,
    paid_sub_status: company.paidSubStatus || null,
    estimated_price: company.estimatedPrice,
    custom_price: company.customPrice || null,
    checklist: company.checklist as any,
    contacts: company.contacts as any,
    notes: company.notes,
    personality_description: company.personalityDescription,
    preview_sent: company.previewSent,
    projected_earnings: company.projectedEarnings,
    amount_paid: company.amountPaid || null,
    paid_date: company.paidDate || null,
    monthly_payment_amount: company.monthlyPaymentAmount || null,
    monthly_payment_start_date: company.monthlyPaymentStartDate || null,
    monthly_payment_active: company.monthlyPaymentActive ?? false,
    next_call_at: company.nextCallAt || null,
  };
}

export async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching companies:", error);
    return [];
  }
  return (data || []).map(rowToCompany);
}

export async function addCompany(company: Omit<Company, "id" | "createdAt">): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .insert(companyToRow(company))
    .select()
    .single();

  if (error) {
    console.error("Error adding company:", error);
    return null;
  }
  return rowToCompany(data);
}

export async function updateCompany(company: Company): Promise<Company | null> {
  // Auto-stamp email_sent_at the first time a company enters email_sent stage
  const row: any = companyToRow(company);
  if (company.stage === "email_sent") {
    row.email_sent_at = (company as any).emailSentAt || new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("companies")
    .update(row)
    .eq("id", company.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating company:", error);
    return null;
  }
  return rowToCompany(data);
}

export async function deleteCompany(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting company:", error);
    return false;
  }
  return true;
}

export async function updateCompanyStage(
  id: string, 
  stage: CompanyStage, 
  previewSubStatus?: PreviewSubStatus | null,
  finishedSubStatus?: FinishedSubStatus | null,
  paidSubStatus?: PaidSubStatus | null,
  amountPaid?: number | null
): Promise<boolean> {
  const updateData: any = { stage };
  if (stage === "email_sent") {
    updateData.email_sent_at = new Date().toISOString();
  }
  if (stage === "preview" && previewSubStatus) {
    updateData.preview_sub_status = previewSubStatus;
  } else if (stage !== "preview") {
    updateData.preview_sub_status = null;
  }
  if (stage === "finished" && finishedSubStatus) {
    updateData.finished_sub_status = finishedSubStatus;
  } else if (stage !== "finished") {
    updateData.finished_sub_status = null;
  }
  if (stage === "paid" && paidSubStatus) {
    updateData.paid_sub_status = paidSubStatus;
    if (amountPaid !== undefined && amountPaid !== null) {
      updateData.amount_paid = amountPaid;
    }
  } else if (stage !== "paid") {
    updateData.paid_sub_status = null;
  }
  const { error } = await supabase
    .from("companies")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating stage:", error);
    return false;
  }
  return true;
}
