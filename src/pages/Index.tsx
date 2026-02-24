import { useState, useEffect, useMemo, DragEvent, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Company, CompanyStage, STAGE_ORDER, STAGE_LABELS, PreviewSubStatus, PREVIEW_SUB_LABELS, PREVIEW_SUB_ORDER, FinishedSubStatus, FINISHED_SUB_LABELS, FINISHED_SUB_ORDER, PaidSubStatus, PAID_SUB_LABELS, PAID_SUB_ORDER } from "@/types";
import { fetchCompanies, addCompany, updateCompany, deleteCompany, updateCompanyStage } from "@/services/companyService";
import { CallLog, fetchCallLogs } from "@/services/callLogService";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { StageBadge } from "@/components/StageBadge";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CallSchedule } from "@/components/CallSchedule";
import { CompanyModal } from "@/components/CompanyModal";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, TrendingUp, ChevronDown, ChevronUp, Globe, AlertTriangle, ExternalLink, Phone, Pencil, Mail, Search, X } from "lucide-react";
import { AIAssistant } from "@/components/AIAssistant";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import confetti from "canvas-confetti";

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
  const [openWebsitesId, setOpenWebsitesId] = useState<string | null>(null);
  const [pendingFinishedSub, setPendingFinishedSub] = useState<FinishedSubStatus | null>(null);
  const [finishedExpanded, setFinishedExpanded] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [cardCallLogs, setCardCallLogs] = useState<Record<string, CallLog[]>>({});
  const [loadingCardLogs, setLoadingCardLogs] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadCardLogs = useCallback(async (companyId: string) => {
    if (cardCallLogs[companyId]) return;
    setLoadingCardLogs(companyId);
    const logs = await fetchCallLogs(companyId);
    setCardCallLogs((prev) => ({ ...prev, [companyId]: logs }));
    setLoadingCardLogs(null);
  }, [cardCallLogs]);

  const getDaysLabel = (dateStr: string) => {
    const days = differenceInCalendarDays(parseISO(dateStr), new Date());
    if (days < 0) return `${Math.abs(days)} dögum síðan`;
    if (days === 0) return "Í dag";
    if (days === 1) return "Á morgun";
    return `Eftir ${days} daga`;
  };

  const fireConfetti = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  };

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

  const onDropStage = async (e: DragEvent, stage: CompanyStage, subStatus?: PreviewSubStatus, finishedSub?: FinishedSubStatus, paidSub?: PaidSubStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStage(null);
    if (!draggedId) return;

    // If dropping into "finished", check if company has logoUrl (meistaraverk)
    if (stage === "finished") {
      const company = companies.find((c) => c.id === draggedId);
      if (company && !company.logoUrl) {
        setPendingFinishedSub(finishedSub || null);
        setWebsiteReminder({ companyId: draggedId, companyName: company.name });
        setWebsiteInput("");
        setDraggedId(null);
        return;
      }
    }

    // If dropping into "partially_paid", prompt for amount only if not already set
    if (stage === "paid" && paidSub === "partially_paid") {
      const company = companies.find((c) => c.id === draggedId);
      if (!company?.amountPaid) {
        setPendingPaidDrop({ companyId: draggedId, sub: paidSub });
        setPaidAmountInput("");
        setDraggedId(null);
        return;
      }
    }

    // If dropping into "fully_paid", fire confetti
    if (stage === "paid" && paidSub === "fully_paid") {
      fireConfetti();
    }

    const ok = await updateCompanyStage(draggedId, stage, subStatus || null, finishedSub || null, paidSub || null);
    if (ok) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === draggedId
            ? { 
                ...c, 
                stage, 
                previewSubStatus: stage === "preview" ? subStatus : undefined,
                finishedSubStatus: stage === "finished" ? finishedSub : undefined,
                paidSubStatus: stage === "paid" ? paidSub : undefined,
              }
            : c
        )
      );
    }
    setDraggedId(null);
  };

  const confirmWebsiteAndMove = async () => {
    if (!websiteReminder || !websiteInput.trim()) return;
    const { companyId } = websiteReminder;
    
    // Save the logoUrl (meistaraverk link)
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      const updated = { ...company, logoUrl: websiteInput.trim() };
      await updateCompany(updated);
      setCompanies((prev) => prev.map((c) => c.id === companyId ? updated : c));
    }

    // Move to finished
    const ok = await updateCompanyStage(companyId, "finished", null, pendingFinishedSub);
    if (ok) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? { ...c, stage: "finished" as CompanyStage, finishedSubStatus: pendingFinishedSub || undefined, logoUrl: websiteInput.trim() || c.logoUrl }
            : c
        )
      );
    }
    setWebsiteReminder(null);
    setWebsiteInput("");
    setPendingFinishedSub(null);
  };

  const confirmPaidAmount = async () => {
    if (!pendingPaidDrop) return;
    const amount = Number(paidAmountInput);
    if (!amount || amount <= 0) return;
    const ok = await updateCompanyStage(pendingPaidDrop.companyId, "paid", null, null, "partially_paid", amount);
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

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.owner.toLowerCase().includes(q) ||
      c.companyId.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  }, [companies, searchQuery]);

  const companiesByStage = (stage: CompanyStage) =>
    filteredCompanies.filter((c) => c.stage === stage);

  const companiesByPreviewSub = (sub: PreviewSubStatus) =>
    filteredCompanies.filter((c) => c.stage === "preview" && c.previewSubStatus === sub);

  const previewUncategorized = filteredCompanies.filter(
    (c) => c.stage === "preview" && !c.previewSubStatus
  );

  const companiesByFinishedSub = (sub: FinishedSubStatus) =>
    filteredCompanies.filter((c) => c.stage === "finished" && c.finishedSubStatus === sub);

  const finishedUncategorized = filteredCompanies.filter(
    (c) => c.stage === "finished" && !c.finishedSubStatus
  );

  const companiesByPaidSub = (sub: PaidSubStatus) =>
    filteredCompanies.filter((c) => c.stage === "paid" && c.paidSubStatus === sub);

  const paidUncategorized = filteredCompanies.filter(
    (c) => c.stage === "paid" && !c.paidSubStatus
  );

  const formatPrice = (n: number) => n.toLocaleString("is-IS") + " kr.";

  const renderCompanyCard = (company: Company) => {
    const isExpanded = expandedCardId === company.id;
    return (
      <div
        key={company.id}
        draggable={!isExpanded}
        onDragStart={(e) => { if (!isExpanded) onDragStart(e, company.id); }}
        onClick={() => {
        if (!isExpanded) {
            setExpandedCardId(company.id);
            loadCardLogs(company.id);
          }
        }}
        className={`rounded-xl border bg-background shadow-sm transition-all duration-200 group ${
          isExpanded ? "shadow-lg ring-1 ring-primary/20" : "px-3 py-2.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
        } ${draggedId === company.id ? "opacity-40 scale-95" : ""}`}
      >
        {!isExpanded ? (
          <div className="flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab transition-opacity" />
            <p className="font-semibold text-sm text-foreground truncate flex-1">{company.name}</p>
            <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
              {company.stage === "paid" && company.amountPaid
                ? formatPrice(company.amountPaid)
                : formatPrice(company.estimatedPrice)}
            </span>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {/* Name */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">{company.name}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedCardId(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            {/* Owner */}
            {company.owner && (
              <p className="text-sm font-medium text-primary">{company.owner}</p>
            )}

            {/* Phone */}
            {company.phone && (
              <div className="flex items-center gap-1.5 text-sm">
                <Phone className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                <a href={`tel:${company.phone}`} className="font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                  {company.phone}
                </a>
              </div>
            )}

            {/* Email */}
            {company.email && (
              <div className="flex items-center gap-1.5 text-sm">
                <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <a href={`mailto:${company.email}`} className="font-medium text-muted-foreground hover:text-foreground transition-colors truncate" onClick={(e) => e.stopPropagation()}>
                  {company.email}
                </a>
              </div>
            )}

            {/* Links - direct */}
            {(company.logoUrl || company.websiteUrl || company.finnaUrl) && (
              <div className="flex flex-wrap gap-2">
                {company.logoUrl && (
                  <a
                    href={company.logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900"
                  >
                    <Globe className="w-3 h-3" />
                    Meistaraverk
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {company.websiteUrl && (
                  <a
                    href={company.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Globe className="w-3 h-3" />
                    Gamli vefur
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {company.finnaUrl && (
                  <a
                    href={company.finnaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Finna.is
                  </a>
                )}
              </div>
            )}

            {/* Next call with countdown */}
            {company.nextCallAt && (
              <div className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Næsta símtal:</span>
                  <span className="text-xs font-medium text-foreground">
                    {format(parseISO(company.nextCallAt), "dd.MM.yyyy · HH:mm")}
                  </span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  differenceInCalendarDays(parseISO(company.nextCallAt), new Date()) < 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}>
                  {getDaysLabel(company.nextCallAt)}
                </span>
              </div>
            )}

            {/* Price */}
            <div className="pt-1">
              {company.amountPaid && company.amountPaid > 0 ? (
                <p className="text-sm">
                  <span className="font-bold text-primary">{formatPrice(company.amountPaid)}</span>
                  <span className="text-muted-foreground"> / {formatPrice(company.estimatedPrice)}</span>
                </p>
              ) : (
                <p className="text-sm font-bold text-foreground">{formatPrice(company.estimatedPrice)}</p>
              )}
            </div>

            {/* Monthly payment */}
            {(company.monthlyPaymentAmount || company.monthlyPaymentActive) && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Mánaðarleg:</span>
                <span className="font-semibold text-foreground">{formatPrice(company.monthlyPaymentAmount || 0)}</span>
                <span className={`px-1.5 py-0.5 rounded-full font-semibold ${company.monthlyPaymentActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {company.monthlyPaymentActive ? "Virkt" : "Óvirkt"}
                </span>
              </div>
            )}

            {/* Past call logs */}
            {(() => {
              const logs = cardCallLogs[company.id];
              if (loadingCardLogs === company.id) {
                return <p className="text-xs text-muted-foreground">Hleð símtölum...</p>;
              }
              if (!logs || logs.length === 0) return null;
              return (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground">Fyrri símtöl</p>
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="rounded-md border bg-muted/30 p-2">
                        <p className="text-[10px] text-muted-foreground font-medium">{format(parseISO(log.calledAt), "dd.MM.yyyy · HH:mm")}</p>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{log.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Breyta button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 mt-1"
              onClick={(e) => { e.stopPropagation(); setSelectedCompany(company); }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Breyta
            </Button>
          </div>
        )}
      </div>
    );
  };

  const mainStages: CompanyStage[] = ["email_sent"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="w-14 h-14 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Verkefnastjórnun</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{companies.length} fyrirtæki samtals</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Leita að fyrirtæki..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 w-56 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
            {/* Overdue calls banner */}
            {(() => {
              const now = new Date();
              const overdue = companies.filter((c) => {
                if (!c.nextCallAt) return false;
                const d = new Date(c.nextCallAt);
                return d.getFullYear() < now.getFullYear() ||
                  (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth()) ||
                  (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() < now.getDate());
              });
              if (overdue.length === 0) return null;
              return (
                <div className="rounded-xl border-2 border-destructive bg-destructive/10 p-4 flex items-center gap-4 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-destructive animate-[pulse_1.5s_ease-in-out_infinite]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-destructive text-lg">
                      {overdue.length} {overdue.length === 1 ? "símtal" : "símtöl"} óafgreitt!
                    </p>
                    <p className="text-sm text-destructive/80">
                      {overdue.map((c) => c.name).join(", ")}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-destructive animate-[pulse_1.5s_ease-in-out_infinite]" />
                </div>
              );
            })()}
            <div className="grid grid-cols-1 gap-4">
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
                      <span className="text-2xl font-extrabold text-foreground">
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
              <button
                onClick={() => setPreviewExpanded(!previewExpanded)}
                onDragOver={(e) => {
                  onDragOver(e, "preview");
                  if (!previewExpanded) setPreviewExpanded(true);
                }}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDropStage(e, "preview", "sold_preview")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <StageBadge stage="preview" size="md" />
                  <span className="text-xl font-extrabold text-foreground">
                    {companiesByStage("preview").length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    fyrirtæki
                  </span>
                </div>
                {previewExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {previewExpanded && (
                <div className="px-4 pb-4">
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

            {/* Lokið (Finished) section - expandable */}
            <div
              className={`rounded-xl border bg-card transition-all shadow-sm ${
                dragOverStage === "finished" && !finishedExpanded ? "drag-over" : ""
              }`}
            >
              <button
                onClick={() => setFinishedExpanded(!finishedExpanded)}
                onDragOver={(e) => {
                  onDragOver(e, "finished");
                  if (!finishedExpanded) setFinishedExpanded(true);
                }}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDropStage(e, "finished", undefined, "not_contacted")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <StageBadge stage="finished" size="md" />
                  <span className="text-xl font-extrabold text-foreground">
                    {companiesByStage("finished").length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    fyrirtæki
                  </span>
                </div>
                {finishedExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {finishedExpanded && (
                <div className="px-4 pb-4">
                  {finishedUncategorized.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Óflokkað — dragðu í undirflokk</p>
                      <div className="flex flex-wrap gap-2">
                        {finishedUncategorized.map(renderCompanyCard)}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {FINISHED_SUB_ORDER.map((sub) => {
                      const dropId = `finished_${sub}`;
                      return (
                        <div
                          key={sub}
                          onDragOver={(e) => onDragOver(e, dropId)}
                          onDragLeave={onDragLeave}
                          onDrop={(e) => onDropStage(e, "finished", undefined, sub)}
                          className={`rounded-lg border border-dashed p-3 min-h-[200px] transition-all ${
                            dragOverStage === dropId ? "drag-over" : "bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-foreground">
                              {FINISHED_SUB_LABELS[sub]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {companiesByFinishedSub(sub).length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {companiesByFinishedSub(sub).map(renderCompanyCard)}
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
                  <span className="text-xl font-extrabold text-foreground">
                    {companiesByStage("paid").length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    fyrirtæki
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
                          onDrop={(e) => onDropStage(e, "paid", undefined, undefined, sub)}
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
                    <h2 className="text-xl font-bold text-foreground mb-2">Meistaraverk tengil vantar!</h2>
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{websiteReminder.companyName}</span> er að fara í „Lokið" en hefur engan meistaraverk tengil.
                    </p>
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      Tengill á meistaraverkið
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
                      onClick={() => confirmWebsiteAndMove()}
                      disabled={!websiteInput.trim()}
                      className="flex-1 gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Vista og færa
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setWebsiteReminder(null); setWebsiteInput(""); setPendingFinishedSub(null); }}
                      className="text-muted-foreground"
                    >
                      Hætta við
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <CallSchedule
              companies={companies}
              onCompanyClick={setSelectedCompany}
              onCompanyUpdate={async (updated) => {
                const result = await updateCompany(updated);
                if (result) {
                  setCompanies((prev) => prev.map((c) => c.id === result.id ? result : c));
                }
              }}
            />
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

      <AIAssistant
        companies={companies}
        onCompaniesChange={(updater) => setCompanies(updater)}
      />
    </div>
  );
}
