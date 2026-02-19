import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Company } from "@/types";
import { fetchCompanies } from "@/services/companyService";
import Finances from "@/pages/Finances";

export default function FinancesWrapper() {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    fetchCompanies().then(setCompanies);
  }, []);

  return <Finances companies={companies} />;
}
