import { useState, useEffect, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Company, CompanyStage, STAGE_ORDER } from "@/types";
import { fetchCompanies, addCompany, updateCompany, deleteCompany, updateCompanyStage } from "@/services/companyService";
import { StageBadge } from "@/components/StageBadge";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CompanyModal } from "@/components/CompanyModal";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export default function Index() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CompanyStage | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const data = await fetchCompanies();
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (data: Omit<Company, "id" | "createdAt">) => {
    const result = await addCompany(data);
    if (result) {
      setCompanies((prev) => [...prev, result]);
      toast.success("Fyrirtæki skráð!");
    } else {
      toast.error("Villa við skráningu");
    }
  };

  const handleUpdate = async (updated: Company) => {
    const result = await updateCompany(updated);
    if (result) {
      setCompanies((prev) => prev.map((c) => (c.id === result.id ? result : c)));
      toast.success("Vistað!");
    } else {
      toast.error("Villa við vistun");
    }
    setSelectedCompany(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteCompany(id);
    if (ok) {
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      toast.success("Fyrirtæki eytt");
    } else {
      toast.error("Villa við eyðingu");
    }
    setSelectedCompany(null);
  };

  // Drag handlers
  const onDragStart = (e: DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: DragEvent, stage: CompanyStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const onDragLeave = () => setDragOverStage(null);

  const onDrop = async (e: DragEvent, targetStage: CompanyStage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedId) return;
    const ok = await updateCompanyStage(draggedId, targetStage);
    if (ok) {
      setCompanies((prev) =>
        prev.map((c) => (c.id === draggedId ? { ...c, stage: targetStage } : c))
      );
    }
    setDraggedId(null);
  };

  const companiesByStage = (stage: CompanyStage) =>
    companies.filter((c) => c.stage === stage);

  const formatPrice = (n: number) => n.toLocaleString("is-IS") + " kr.";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Verkefnastjórnun</h1>
              <p className="text-sm text-muted-foreground">Haldtu utan um fyrirtæki og verkefni</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/finances")} className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Fjárhagur
            </Button>
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nýtt fyrirtæki
            </Button>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Hleð...</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {STAGE_ORDER.map((stage) => (
              <div
                key={stage}
                onDragOver={(e) => onDragOver(e, stage)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, stage)}
                className={`rounded-xl border bg-card p-3 min-h-[300px] transition-all ${
                  dragOverStage === stage ? "drag-over" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <StageBadge stage={stage} size="md" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {companiesByStage(stage).length}
                  </span>
                </div>

                <div className="space-y-2">
                  {companiesByStage(stage).map((company) => (
                    <div
                      key={company.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, company.id)}
                      onClick={() => setSelectedCompany(company)}
                      className={`rounded-lg border bg-background p-3 cursor-pointer hover:shadow-md transition-all group ${
                        draggedId === company.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 mt-0.5 flex-shrink-0 cursor-grab" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{company.name}</p>
                          {company.owner && (
                            <p className="text-xs text-muted-foreground truncate">{company.owner}</p>
                          )}
                          <p className="text-xs text-primary font-medium mt-1">
                            {formatPrice(company.estimatedPrice)}
                          </p>
                          {company.checklist.length > 0 && (
                            <div className="mt-2">
                              <div className="flex gap-0.5">
                                {company.checklist.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`h-1 flex-1 rounded-full ${
                                      item.checked ? "bg-primary" : "bg-border"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddCompanyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        existingNames={companies.map((c) => c.name)}
      />

      {selectedCompany && (
        <CompanyModal
          company={selectedCompany}
          open={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
