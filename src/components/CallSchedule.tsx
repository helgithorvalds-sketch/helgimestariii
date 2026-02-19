import { useState } from "react";
import { Company, CompanyStage, STAGE_LABELS } from "@/types";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { Phone, Clock, AlertCircle, ChevronDown, ChevronUp, FileText, CheckCircle, Globe, Sparkles, Loader2 } from "lucide-react";
import { StageBadge } from "./StageBadge";
import { CallLog, fetchCallLogs, addCallLog } from "@/services/callLogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CallScheduleProps {
  companies: Company[];
  onCompanyClick: (company: Company) => void;
  onCompanyUpdate?: (company: Company) => void;
}

export function CallSchedule({ companies, onCompanyClick, onCompanyUpdate }: CallScheduleProps) {
  const [expandedLogs, setExpandedLogs] = useState<Record<string, CallLog[] | null>>({});
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
  const [finishingCall, setFinishingCall] = useState<Company | null>(null);
  const [finishNotes, setFinishNotes] = useState("");
  const [finishWebsiteUrl, setFinishWebsiteUrl] = useState("");
  const [savingFinish, setSavingFinish] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [finishStage, setFinishStage] = useState<CompanyStage>("finished");

  const scheduled = companies
    .filter((c) => c.nextCallAt)
    .sort((a, b) => new Date(a.nextCallAt!).getTime() - new Date(b.nextCallAt!).getTime());

  const unscheduled = companies.filter((c) => !c.nextCallAt);

  const formatCallDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Í dag";
    if (isTomorrow(date)) return "Á morgun";
    return format(date, "dd.MM.yyyy");
  };

  const formatCallTime = (dateStr: string) => {
    return format(parseISO(dateStr), "HH:mm");
  };

  const isOverdue = (dateStr: string) => {
    const date = parseISO(dateStr);
    const now = new Date();
    return date.getFullYear() < now.getFullYear() ||
      (date.getFullYear() === now.getFullYear() && date.getMonth() < now.getMonth()) ||
      (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() < now.getDate());
  };

  const getRowStyle = (dateStr: string) => {
    if (isOverdue(dateStr)) return "border-l-4 border-l-destructive bg-destructive/10 ring-1 ring-destructive/30";
    const date = parseISO(dateStr);
    if (isToday(date)) return "border-l-4 border-l-primary bg-primary/5";
    if (isTomorrow(date)) return "border-l-4 border-l-amber-500 bg-amber-500/5";
    return "border-l-4 border-l-border";
  };

  const toggleCallLogs = async (companyId: string) => {
    if (expandedLogs[companyId] !== undefined) {
      setExpandedLogs((prev) => {
        const next = { ...prev };
        delete next[companyId];
        return next;
      });
      return;
    }
    setLoadingLogs(companyId);
    const logs = await fetchCallLogs(companyId);
    setExpandedLogs((prev) => ({ ...prev, [companyId]: logs }));
    setLoadingLogs(null);
  };

  const handleFinishCall = async () => {
    if (!finishingCall || !finishNotes.trim()) return;
    setSavingFinish(true);
    const log = await addCallLog(finishingCall.id, finishNotes.trim());
    if (log) {
      if (onCompanyUpdate) {
        onCompanyUpdate({
          ...finishingCall,
          nextCallAt: undefined,
          stage: finishStage,
          websiteUrl: finishWebsiteUrl.trim() || finishingCall.websiteUrl,
        });
      }
      toast.success("Símtal skráð!");
    } else {
      toast.error("Villa við skráningu");
    }
    setSavingFinish(false);
    setFinishingCall(null);
    setFinishNotes("");
    setFinishWebsiteUrl("");
    setFinishStage("finished");
  };

  const handleSummarize = async () => {
    if (!finishNotes.trim()) return;
    setSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-call", {
        body: { notes: finishNotes.trim() },
      });
      if (error) throw error;
      if (data?.summary) {
        setFinishNotes(data.summary);
        toast.success("Athugasemdir teknar saman!");
      }
    } catch (e) {
      console.error("Summarize error:", e);
      toast.error("Villa við samantekt");
    }
    setSummarizing(false);
  };

  return (
    <>
    {/* Finish call full-screen overlay */}
    {finishingCall && (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border-2 border-primary bg-card p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Símtali lokið</h2>
            <p className="text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">{finishingCall.name}</span>
              {finishingCall.phone && <span className="ml-2">· 📞 {finishingCall.phone}</span>}
            </p>
          </div>
          {/* Stage selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Staða fyrirtækis</label>
            <div className="flex gap-2">
              {(["finished", "paid"] as CompanyStage[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFinishStage(s)}
                  className={`flex-1 rounded-lg border p-2.5 text-sm font-medium transition-all ${
                    finishStage === s
                      ? "border-primary bg-accent text-foreground ring-2 ring-primary ring-offset-1"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Website link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              Tengill á meistaraverkið
            </label>
            <Input
              value={finishWebsiteUrl}
              onChange={(e) => setFinishWebsiteUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Hvað fjallaði símtalið um?</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSummarize}
                disabled={!finishNotes.trim() || summarizing}
                className="gap-1.5 text-xs h-7"
              >
                {summarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {summarizing ? "Tek saman..." : "AI samantekt"}
              </Button>
            </div>
            <Textarea
              value={finishNotes}
              onChange={(e) => setFinishNotes(e.target.value)}
              placeholder="Skrifaðu athugasemdir frá símtalinu..."
              rows={5}
              autoFocus
              className="text-base"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleFinishCall}
              disabled={!finishNotes.trim() || savingFinish}
              className="flex-1 gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {savingFinish ? "Vista..." : "Vista og ljúka"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setFinishingCall(null); setFinishNotes(""); setFinishWebsiteUrl(""); setFinishStage("finished"); }}
              className="text-muted-foreground"
            >
              Hætta við
            </Button>
          </div>
        </div>
      </div>
    )}

    <div className="grid grid-cols-3 gap-6">
      {/* Schedule - 2/3 */}
      <div className="col-span-2 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Áætlun símtala</h2>
          <span className="text-sm text-muted-foreground ml-auto">{scheduled.length} skipulögð</span>
        </div>

        {scheduled.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Engin símtöl skipulögð</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduled.map((company) => {
              const isExpanded = expandedLogs[company.id] !== undefined;
              const logs = expandedLogs[company.id];
              return (
                <div
                  key={company.id}
                  className={`rounded-lg overflow-hidden transition-all ${getRowStyle(company.nextCallAt!)}`}
                >
                  <div
                    onClick={() => onCompanyClick(company)}
                    className="p-3 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{company.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StageBadge stage={company.stage} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {company.estimatedPrice.toLocaleString("is-IS")} kr.
                          </span>
                        </div>
                        {/* Phone number */}
                        {company.phone && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            <a
                              href={`tel:${company.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary font-medium hover:underline"
                            >
                              {company.phone}
                            </a>
                          </div>
                        )}
                        {company.owner && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Tengiliður: {company.owner}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isOverdue(company.nextCallAt!) ? "text-destructive animate-[pulse_1.5s_ease-in-out_infinite]" : "text-foreground"}`}>
                          {isOverdue(company.nextCallAt!) ? "⚠️ " : ""}{formatCallDate(company.nextCallAt!)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCallTime(company.nextCallAt!)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-3 pb-2 flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFinishingCall(company);
                        setFinishNotes("");
                      }}
                      className="gap-1.5 text-xs h-7 px-3"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Lokið
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCallLogs(company.id);
                      }}
                      className="gap-1.5 text-xs text-muted-foreground h-7 px-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {loadingLogs === company.id ? "Hleð..." : "Fyrri símtöl"}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>

                    {isExpanded && logs && (
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-border">
                        {logs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">Engin fyrri símtöl skráð</p>
                        ) : (
                          logs.map((log) => (
                            <div key={log.id} className="rounded-md bg-background p-2.5 border">
                              <p className="text-xs text-muted-foreground font-medium mb-0.5">
                                {format(parseISO(log.calledAt), "dd.MM.yyyy · HH:mm")}
                              </p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{log.notes}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unscheduled - 1/3 */}
      <div className="col-span-1 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">Óskipulögð</h2>
          <span className="text-sm text-muted-foreground ml-auto">{unscheduled.length}</span>
        </div>

        {unscheduled.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Öll fyrirtæki skipulögð! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unscheduled.map((company) => (
              <div
                key={company.id}
                onClick={() => onCompanyClick(company)}
                className="rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all hover:bg-muted/30"
              >
                <p className="font-medium text-sm text-foreground">{company.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StageBadge stage={company.stage} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {company.estimatedPrice.toLocaleString("is-IS")} kr.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
