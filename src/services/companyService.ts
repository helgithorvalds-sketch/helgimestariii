import { supabase } from "@/integrations/supabase/client";
import { Company, CompanyStage, ChecklistItem } from "@/types";

// Convert DB row to Company type
function rowToCompany(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    companyId: row.company_id,
    logoUrl: row.logo_url,
    stage: row.stage as CompanyStage,
    previewSubStatus: row.preview_sub_status,
    estimatedPrice: row.estimated_price,
    customPrice: row.custom_price,
    checklist: (row.checklist || []) as ChecklistItem[],
    notes: row.notes,
    personalityDescription: row.personality_description,
    previewSent: row.preview_sent,
    projectedEarnings: row.projected_earnings,
    amountPaid: row.amount_paid,
    paidDate: row.paid_date,
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
    stage: company.stage,
    preview_sub_status: company.previewSubStatus || null,
    estimated_price: company.estimatedPrice,
    custom_price: company.customPrice || null,
    checklist: company.checklist as any,
    notes: company.notes,
    personality_description: company.personalityDescription,
    preview_sent: company.previewSent,
    projected_earnings: company.projectedEarnings,
    amount_paid: company.amountPaid || null,
    paid_date: company.paidDate || null,
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
  const { data, error } = await supabase
    .from("companies")
    .update(companyToRow(company))
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

export async function updateCompanyStage(id: string, stage: CompanyStage): Promise<boolean> {
  const { error } = await supabase
    .from("companies")
    .update({ stage })
    .eq("id", id);

  if (error) {
    console.error("Error updating stage:", error);
    return false;
  }
  return true;
}
