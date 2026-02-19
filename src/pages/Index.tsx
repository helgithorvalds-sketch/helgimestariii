import { useState, useEffect, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Company, CompanyStage, STAGE_ORDER, STAGE_LABELS, PreviewSubStatus, PREVIEW_SUB_LABELS, PREVIEW_SUB_ORDER, PaidSubStatus, PAID_SUB_LABELS, PAID_SUB_ORDER } from "@/types";
import { fetchCompanies, addCompany, updateCompany, deleteCompany, updateCompanyStage } from "@/services/companyService";
import { StageBadge } from "@/components/StageBadge";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CallSchedule } from "@/components/CallSchedule";
import { CompanyModal } from "@/components/CompanyModal";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, TrendingUp, ChevronDown, ChevronUp, Globe, AlertTriangle } from "lucide-react";
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
  const [paidExpanded, setPaidExpanded] = useState(false);
  const [pendingPaidDrop, setPendingPaidDrop] = useState<{ companyId: string; sub: PaidSubStatus } | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [websiteReminder, setWebsiteReminder] = useState<{ companyId: string; companyName: string } | null>(null);
  const [websiteInput, setWebsiteInput] = useState("");

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

  const onDropStage = async (e: DragEvent, stage: CompanyStage, subStatus?: PreviewSubStatus, paidSub?: PaidSubStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStage(null);
    if (!draggedId) return;

    // If dropping into "finished", check if company has website_url
    if (stage === "finished") {
      const company = companies.find((c) => c.id === draggedId);
      if (company && !company.websiteUrl) {
        setWebsiteReminder({ companyId: draggedId, companyName: company.name });
        setWebsiteInput("");
        setDraggedId(null);
        return;
      }
    }

    // If dropping into "partially_paid", prompt for amount
    if (stage === "paid" && paidSub === "partially_paid") {
      setPendingPaidDrop({ companyId: draggedId, sub: paidSub });
      setPaidAmountInput("");
      setDraggedId(null);
      return;
    }

    const ok = await updateCompanyStage(draggedId, stage, subStatus || null, paidSub || null);
    if (ok) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === draggedId
            ? { 
                ...c, 
                stage, 
                previewSubStatus: stage === "preview" ? subStatus : undefined,
                paidSubStatus: stage === "paid" ? paidSub : undefined,
              }
            : c
        )
      );
    }
    setDraggedId(null);
  };

  const confirmWebsiteAndMove = async (skipUrl: boolean) => {
    if (!websiteReminder) return;
    const { companyId } = websiteReminder;
    
    // Save the website URL if provided
    if (!skipUrl && websiteInput.trim()) {
      const company = companies.find((c) => c.id === companyId);
      if (company) {
        const updated = { ...company, websiteUrl: websiteInput.trim() };
        await updateCompany(updated);
        setCompanies((prev) => prev.map((c) => c.id === companyId ? updated : c));
      }
    }

    // Move to finished
    const ok = await updateCompanyStage(companyId, "finished");
    if (ok) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? { ...c, stage: "finished" as CompanyStage, websiteUrl: websiteInput.trim() || c.websiteUrl }
            : c
        )
      );
    }
    setWebsiteReminder(null);
    setWebsiteInput("");
  };

  const confirmPaidAmount = async () => {
    if (!pendingPaidDrop) return;
    const amount = Number(paidAmountInput);
    if (!amount || amount <= 0) return;
    const ok = await updateCompanyStage(pendingPaidDrop.companyId, "paid", null, "partially_paid", amount);
    if (ok) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === pendingPaidDrop.companyId
            ? { ...c, stage: "paid" as CompanyStage, paidSubStatus: "partially_paid" as PaidSubStatus, amountPaid: amount }
            : c
        )
      );
      toast.success("Greitt X skráð!");
    }
    setPendingPaidDrop(null);
    setPaidAmountInput("");
  };

  const companiesByStage = (stage: CompanyStage) =>
    companies.filter((c) => c.stage === stage);

  const companiesByPreviewSub = (sub: PreviewSubStatus) =>
    companies.filter((c) => c.stage === "preview" && c.previewSubStatus === sub);

  const previewUncategorized = companies.filter(
    (c) => c.stage === "preview" && !c.previewSubStatus
  );

  const companiesByPaidSub = (sub: PaidSubStatus) =>
    companies.filter((c) => c.stage === "paid" && c.paidSubStatus === sub);

  const paidUncategorized = companies.filter(
    (c) => c.stage === "paid" && !c.paidSubStatus
  );

  const formatPrice = (n: number) => n.toLocaleString("is-IS") + " kr.";

  const renderCompanyCard = (company: Company) => (
    <div
      key={company.id}
      draggable
      onDragStart={(e) => onDragStart(e, company.id)}
      onClick={() => setSelectedCompany(company)}
      className={`rounded-xl border bg-background p-4 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group ${
        draggedId === company.id ? "opacity-40 scale-95" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 mt-1 flex-shrink-0 cursor-grab transition-opacity" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{company.name}</p>
          {company.owner && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{company.owner}</p>
          )}
          {company.phone && (
            <p className="text-xs text-muted-foreground mt-0.5">📞 {company.phone}</p>
          )}
          {company.paidSubStatus === "partially_paid" && company.amountPaid ? (
            <p className="text-sm font-bold mt-2">
              <span className="text-green-600">{formatPrice(company.amountPaid)}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-foreground">{formatPrice(company.estimatedPrice)}</span>
            </p>
          ) : (
            <p className="text-sm text-primary font-bold mt-2">
              {formatPrice(company.estimatedPrice)}
            </p>
          )}
          {company.checklist.length > 0 && (
            <div className="mt-3">
              <div className="flex gap-1">
                {company.checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${item.checked ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const mainStages: CompanyStage[] = ["email_sent", "registered", "finished"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="w-11 h-11 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Verkefnastjórnun</h1>
              <p className="text-sm text-muted-foreground">Haldtu utan um fyrirtæki og verkefni</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/finances")} className="gap-2 shadow-sm">
              <TrendingUp className="w-4 h-4" />
              Fjárhagur
            </Button>
            <Button onClick={() => setAddOpen(true)} className="gap-2 shadow-sm">
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
          <div className="space-y-5">
            {/* Main stage columns */}
            <div className="grid grid-cols-3 gap-4">
              {mainStages.map((stage) => {
                const count = companiesByStage(stage).length;
                return (
                  <div
                    key={stage}
                    onDragOver={(e) => onDragOver(e, stage)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDropStage(e, stage)}
                    className={`rounded-2xl border bg-card/80 backdrop-blur-sm p-4 min-h-[260px] transition-all shadow-sm ${
                      dragOverStage === stage ? "drag-over" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <StageBadge stage={stage} size="md" />
                      <span className="text-xs bg-muted text-muted-foreground font-semibold px-2.5 py-1 rounded-full">
                        {count}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {companiesByStage(stage).map(renderCompanyCard)}
                    </div>
                    {count === 0 && (
                      <div className="flex items-center justify-center h-32 text-muted-foreground/40">
                        <p className="text-xs">Dragðu fyrirtæki hingað</p>
                      </div>
                    )}
                  </div>
                );
              })}
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

            {/* Greitt (Paid) section - expandable like preview */}
            <div
              className={`rounded-xl border bg-card transition-all shadow-sm ${
                dragOverStage === "paid" && !paidExpanded ? "drag-over" : ""
              }`}
            >
              <button
                onClick={() => setPaidExpanded(!paidExpanded)}
                onDragOver={(e) => {
                  onDragOver(e, "paid");
                  if (!paidExpanded) setPaidExpanded(true);
                }}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDropStage(e, "paid")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <StageBadge stage="paid" size="md" />
                  <span className="text-sm text-muted-foreground">
                    {companiesByStage("paid").length} fyrirtæki
                  </span>
                </div>
                {paidExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {paidExpanded && (
                <div className="px-4 pb-4">
                  {paidUncategorized.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Óflokkað — dragðu í undirflokk</p>
                      <div className="flex flex-wrap gap-2">
                        {paidUncategorized.map(renderCompanyCard)}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {PAID_SUB_ORDER.map((sub) => {
                      const dropId = `paid_${sub}`;
                      return (
                        <div
                          key={sub}
                          onDragOver={(e) => onDragOver(e, dropId)}
                          onDragLeave={onDragLeave}
                          onDrop={(e) => onDropStage(e, "paid", undefined, sub)}
                          className={`rounded-lg border border-dashed p-3 min-h-[200px] transition-all ${
                            dragOverStage === dropId ? "drag-over" : "bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-foreground">
                              {PAID_SUB_LABELS[sub]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {companiesByPaidSub(sub).length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {companiesByPaidSub(sub).map(renderCompanyCard)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Paid amount prompt dialog */}
            {pendingPaidDrop && (
              <div className="rounded-xl border-2 border-primary bg-card p-5 shadow-lg">
                <p className="font-semibold text-foreground mb-3">Hversu mikið hefur verið greitt?</p>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder="Upphæð í kr..."
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    autoFocus
                  />
                  <Button onClick={confirmPaidAmount} disabled={!paidAmountInput || Number(paidAmountInput) <= 0}>
                    Staðfesta
                  </Button>
                  <Button variant="ghost" onClick={() => { setPendingPaidDrop(null); setPaidAmountInput(""); }}>
                    Hætta við
                  </Button>
                </div>
              </div>
            )}

            {/* Website URL reminder - full screen overlay */}
            {websiteReminder && (
              <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="max-w-md w-full rounded-2xl border-2 border-primary bg-card p-8 shadow-2xl space-y-6 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Vefsíðutengil vantar!</h2>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{websiteReminder.companyName}</span> er að fara í „Lokið" en hefur engan vefsíðutengil.
                    </p>
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      Tengill á verkefnið
                    </Label>
                    <Input
                      value={websiteInput}
                      onChange={(e) => setWebsiteInput(e.target.value)}
                      placeholder="https://..."
                      type="url"
                      autoFocus
                      className="text-base"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => confirmWebsiteAndMove(false)}
                      disabled={!websiteInput.trim()}
                      className="flex-1 gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Vista og færa
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => confirmWebsiteAndMove(true)}
                      className="text-muted-foreground"
                    >
                      Sleppa
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <CallSchedule companies={companies} onCompanyClick={setSelectedCompany} />
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
