import { useState, useEffect, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Company, CompanyStage, STAGE_ORDER, STAGE_LABELS, PreviewSubStatus, PREVIEW_SUB_LABELS, PREVIEW_SUB_ORDER } from "@/types";
import { fetchCompanies, addCompany, updateCompany, deleteCompany, updateCompanyStage } from "@/services/companyService";
import { StageBadge } from "@/components/StageBadge";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CompanyModal } from "@/components/CompanyModal";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export default function Index() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const loadData = async () => {
    const data = await fetchCompanies();
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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

  const onDragStart = (e: DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: DragEvent, dropId: string) => {
    e.preventDefault();
    setDragOverStage(dropId);
  };

  const onDragLeave = () => setDragOverStage(null);

  const onDropStage = async (e: DragEvent, stage: CompanyStage, subStatus?: PreviewSubStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStage(null);
    if (!draggedId) return;
    const ok = await updateCompanyStage(draggedId, stage, subStatus || null);
    if (ok) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === draggedId
            ? { ...c, stage, previewSubStatus: stage === "preview" ? subStatus : undefined }
            : c
        )
      );
    }
    setDraggedId(null);
  };

  const companiesByStage = (stage: CompanyStage) =>
    companies.filter((c) => c.stage === stage);

  const companiesByPreviewSub = (sub: PreviewSubStatus) =>
    companies.filter((c) => c.stage === "preview" && c.previewSubStatus === sub);

  const previewUncategorized = companies.filter(
    (c) => c.stage === "preview" && !c.previewSubStatus
  );

  const formatPrice = (n: number) => n.toLocaleString("is-IS") + " kr.";

  const renderCompanyCard = (company: Company) => (
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
                    className={`h-1 flex-1 rounded-full ${item.checked ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const nonPreviewStages = STAGE_ORDER.filter((s) => s !== "preview");

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

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Hleð...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main stage columns (without preview) */}
            <div className="grid grid-cols-4 gap-4">
              {nonPreviewStages.map((stage) => (
                <div
                  key={stage}
                  onDragOver={(e) => onDragOver(e, stage)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDropStage(e, stage)}
                  className={`rounded-xl border bg-card p-3 min-h-[250px] transition-all ${
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
                    {companiesByStage(stage).map(renderCompanyCard)}
                  </div>
                </div>
              ))}
            </div>

            {/* Sýnishorn (Preview) section - expandable */}
            <div
              className={`rounded-xl border bg-card transition-all ${
                dragOverStage === "preview" && !previewExpanded ? "drag-over" : ""
              }`}
            >
              {/* Header - always visible, clickable to expand */}
              <button
                onClick={() => setPreviewExpanded(!previewExpanded)}
                onDragOver={(e) => {
                  onDragOver(e, "preview");
                  // Auto-expand when dragging over
                  if (!previewExpanded) setPreviewExpanded(true);
                }}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDropStage(e, "preview")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <StageBadge stage="preview" size="md" />
                  <span className="text-sm text-muted-foreground">
                    {companiesByStage("preview").length} fyrirtæki
                  </span>
                </div>
                {previewExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {/* Expanded content - 3 sub-categories */}
              {previewExpanded && (
                <div className="px-4 pb-4">
                  {/* Uncategorized preview companies */}
                  {previewUncategorized.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Óflokkað — dragðu í undirflokk</p>
                      <div className="flex flex-wrap gap-2">
                        {previewUncategorized.map(renderCompanyCard)}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    {PREVIEW_SUB_ORDER.map((sub) => {
                      const dropId = `preview_${sub}`;
                      return (
                        <div
                          key={sub}
                          onDragOver={(e) => onDragOver(e, dropId)}
                          onDragLeave={onDragLeave}
                          onDrop={(e) => onDropStage(e, "preview", sub)}
                          className={`rounded-lg border border-dashed p-3 min-h-[200px] transition-all ${
                            dragOverStage === dropId ? "drag-over" : "bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-foreground">
                              {PREVIEW_SUB_LABELS[sub]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {companiesByPreviewSub(sub).length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {companiesByPreviewSub(sub).map(renderCompanyCard)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

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
