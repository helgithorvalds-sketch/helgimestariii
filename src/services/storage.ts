import { Company } from "@/types";

const STORAGE_KEY = "company_tracker_data";

export function loadCompanies(): Company[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCompanies(companies: Company[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
}
