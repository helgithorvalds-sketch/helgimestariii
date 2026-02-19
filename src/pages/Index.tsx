import { useState, useEffect, useRef, DragEvent } from "react";
import { Company, CompanyStage, STAGE_LABELS, STAGE_ORDER, DEFAULT_CHECKLIST } from "@/types";
import { loadCompanies, saveCompanies } from "@/services/storage";
import { StageBadge } from "@/components/StageBadge";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CompanyModal } from "@/components/CompanyModal";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, DollarSign } from "lucide-react";

export default function Index() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CompanyStage | null>(null);

  useEffect(() => {
    setCompanies(loadCompanies());
  }, []);

  const persist = (updated: Company[]) => {
    setCompanies(updated);
    saveCompanies(updated);
  };

  const handleAdd = (data: Omit<Company, "id" | "createdAt">) => {
    const newCompany: Company = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    persist([...companies, newCompany]);
  };

  const handleUpdate = (updated: Company) => {
    persist(companies.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCompany(null);
  };

  const handleDelete = (id: string) => {
    persist(companies.filter((c) => c.id !== id));
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

  const onDrop = (e: DragEvent, targetStage: CompanyStage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedId) return;
    persist(
      companies.map((c) =>
        c.id === draggedId ? { ...c, stage: targetStage } : c
      )
    );
    setDraggedId(null);
  };

  const companiesByStage = (stage: CompanyStage) =>
    companies.filter((c) => c.stage === stage);

  const totalEarned = companies
    .filter((c) => c.stage === "paid" && c.amountPaid)
    .reduce((sum, c) => sum + (c.amountPaid || 0), 0);

  const paidCompanies = companies.filter((c) => c.stage === "paid" && c.amountPaid);

  const formatPrice = (n: number) => n.toLocaleString("is-IS") + " kr.";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Verkefnastjórnun</h1>
            <p className="text-sm text-muted-foreground">Haldtu utan um fyrirtæki og verkefni</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nýtt fyrirtæki
          </Button>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-5 gap-4 mb-8">
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
                        {/* Checklist progress */}
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Earnings Summary */}
        {paidCompanies.length > 0 && (
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Hagnaður</h2>
            </div>
            <p className="text-3xl font-bold text-primary mb-4">{formatPrice(totalEarned)}</p>
            <div className="space-y-2">
              {paidCompanies.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.owner} · {c.paidDate || "—"}
                    </p>
                  </div>
                  <p className="font-bold text-sm text-primary">
                    {formatPrice(c.amountPaid || 0)}
                  </p>
                </div>
              ))}
            </div>
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
