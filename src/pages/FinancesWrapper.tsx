import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Company } from "@/types";
import { fetchCompanies } from "@/services/companyService";
import Finances from "@/pages/Finances";

export default function FinancesWrapper() {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    fetchCompanies().then((list) =>
      setCompanies(list.filter((c) => c.stage !== "lead" && c.stage !== "svif" && c.stage !== "svif_fyrirtæki"))
    );
  }, []);


  return <Finances companies={companies} />;
}
