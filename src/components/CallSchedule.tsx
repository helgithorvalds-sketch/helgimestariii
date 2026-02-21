import { useState, useRef } from "react";
import { Company, CompanyStage, STAGE_LABELS } from "@/types";
import { format, isToday, isTomorrow, isPast, parseISO, differenceInCalendarDays } from "date-fns";
import { Phone, Clock, AlertCircle, ChevronDown, ChevronUp, FileText, CheckCircle, Globe, Sparkles, Loader2, PhoneMissed, ExternalLink, Mail, Mic, MicOff, Languages } from "lucide-react";
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
  const [confirmNoAnswer, setConfirmNoAnswer] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
  const [finishingCall, setFinishingCall] = useState<Company | null>(null);
  const [finishNotes, setFinishNotes] = useState("");
  const [finishWebsiteUrl, setFinishWebsiteUrl] = useState("");
  const [finishOwnerName, setFinishOwnerName] = useState("");
  const [savingFinish, setSavingFinish] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [finishStage, setFinishStage] = useState<CompanyStage>("finished");
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  const [nextCallDate, setNextCallDate] = useState("");
  const [nextCallTime, setNextCallTime] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [translating, setTranslating] = useState(false);
  const recognitionRef = useRef<any>(null);


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

  const getDaysLabel = (dateStr: string) => {
    const days = differenceInCalendarDays(parseISO(dateStr), new Date());
    if (days < 0) return `${Math.abs(days)} dögum síðan`;
    if (days === 0) return "Í dag";
    if (days === 1) return "Á morgun";
    return `Eftir ${days} daga`;
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
      let nextCallAt: string | undefined = undefined;
      if (nextCallDate && nextCallTime) {
        nextCallAt = new Date(`${nextCallDate}T${nextCallTime}`).toISOString();
      } else if (nextCallDate) {
        nextCallAt = new Date(`${nextCallDate}T09:00`).toISOString();
      }
      if (onCompanyUpdate) {
        onCompanyUpdate({
          ...finishingCall,
          nextCallAt,
          stage: nextCallAt ? finishingCall.stage : finishStage,
          websiteUrl: finishWebsiteUrl.trim() || finishingCall.websiteUrl,
          owner: finishOwnerName.trim() || finishingCall.owner,
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
    setFinishOwnerName("");
    setFinishStage("finished");
    setOriginalNotes(null);
    setNextCallDate("");
    setNextCallTime("");
  };

  const handleSummarize = async () => {
    if (!finishNotes.trim()) return;
    setSummarizing(true);
    setOriginalNotes(finishNotes); // save original before summarizing
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
      setOriginalNotes(null);
    }
    setSummarizing(false);
  };

  const handleRevertNotes = () => {
    if (originalNotes !== null) {
      setFinishNotes(originalNotes);
      setOriginalNotes(null);
      toast("Upprunalegar athugasemdir endurheimtar", { icon: "↩️" });
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Vafrinn þinn styður ekki talgreining");
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setFinishNotes((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      toast.error("Villa við talgreiningu");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleTranslate = async () => {
    if (!finishNotes.trim()) return;
    setTranslating(true);
    setOriginalNotes(finishNotes);
    try {
      const { data, error } = await supabase.functions.invoke("translate-notes", {
        body: { notes: finishNotes.trim() },
      });
      if (error) throw error;
      if (data?.translated) {
        setFinishNotes(data.translated);
        toast.success("Þýtt á íslensku!");
      }
    } catch (e) {
      console.error("Translate error:", e);
      toast.error("Villa við þýðingu");
      setOriginalNotes(null);
    }
    setTranslating(false);
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
          {/* Contact name prompt if missing */}
          {!finishingCall.owner && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Manstu nafnið á tengiliðnum?</label>
              <Input
                value={finishOwnerName}
                onChange={(e) => setFinishOwnerName(e.target.value)}
                placeholder="Nafn tengiliðs..."
              />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Hvað fjallaði símtalið um?</label>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {originalNotes !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevertNotes}
                    className="gap-1.5 text-xs h-7 text-muted-foreground"
                  >
                    ↩️ Til baka
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTranslate}
                  disabled={!finishNotes.trim() || translating}
                  className="gap-1.5 text-xs h-7"
                >
                  {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                  {translating ? "Þýði..." : "Þýða á íslensku"}
                </Button>
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
            </div>
            <div className="relative">
              <Textarea
                value={finishNotes}
                onChange={(e) => { setFinishNotes(e.target.value); setOriginalNotes(null); }}
                placeholder="Skrifaðu athugasemdir frá símtalinu eða notaðu hljóðnemann..."
                rows={5}
                autoFocus
                className="text-base pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVoiceInput}
                className={`absolute bottom-2 right-2 h-7 w-7 ${isRecording ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                title={isRecording ? "Stöðva talgreiningu" : "Tala (enska → texti)"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </div>
            {isRecording && (
              <p className="text-xs text-destructive font-medium animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                Hlusta... (talaðu á ensku)
              </p>
            )}
          </div>

          {/* Next call scheduler */}
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3 bg-muted/30">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              Hvenær er næsta símtal?
            </label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={nextCallDate}
                onChange={(e) => setNextCallDate(e.target.value)}
                className="flex-1 text-sm h-9"
              />
              <Input
                type="time"
                value={nextCallTime}
                onChange={(e) => setNextCallTime(e.target.value)}
                className="w-28 text-sm h-9"
                placeholder="09:00"
              />
            </div>
            {!nextCallDate && (
              <p className="text-xs text-muted-foreground">Ef þú skilur þetta eftir tómt verður fyrirtækið sett sem lokið.</p>
            )}
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
              onClick={() => { setFinishingCall(null); setFinishNotes(""); setFinishWebsiteUrl(""); setFinishOwnerName(""); setFinishStage("finished"); setOriginalNotes(null); setNextCallDate(""); setNextCallTime(""); }}
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
                        {/* Contact details row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          {company.phone && (
                            <a
                              href={`tel:${company.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {company.phone}
                            </a>
                          )}
                          {company.email && (
                            <a
                              href={`mailto:${company.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                            >
                              <Mail className="w-3 h-3" />
                              {company.email}
                            </a>
                          )}
                          {company.finnaUrl && (
                            <a
                              href={company.finnaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Finna.is
                            </a>
                          )}
                        </div>
                        {company.owner && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Tengiliður: {company.owner}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${isOverdue(company.nextCallAt!) ? "text-destructive animate-[pulse_1.5s_ease-in-out_infinite]" : "text-foreground"}`}>
                          {isOverdue(company.nextCallAt!) ? "⚠️ " : ""}{formatCallDate(company.nextCallAt!)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCallTime(company.nextCallAt!)}</p>
                        <p className={`text-xs font-medium mt-0.5 ${isOverdue(company.nextCallAt!) ? "text-destructive" : "text-primary"}`}>
                          {getDaysLabel(company.nextCallAt!)}
                        </p>
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
                    {confirmNoAnswer === company.id ? (() => {
                      const callDate = company.nextCallAt ? new Date(company.nextCallAt) : new Date();
                      const isFriday = callDate.getDay() === 5;
                      const isSaturday = callDate.getDay() === 6;
                      const isSunday = callDate.getDay() === 0;
                      const isWeekend = isSaturday || isSunday;
                      const daysToMonday = isFriday ? 3 : isSaturday ? 2 : isSunday ? 1 : 1;
                      const showMondayPrompt = isFriday || isWeekend;

                      return (
                      <>
                        <span className="text-xs text-destructive font-medium">
                          {showMondayPrompt ? "Færa á mánudag?" : "Ertu viss?"}
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!company.nextCallAt || !onCompanyUpdate) return;
                            const next = new Date(company.nextCallAt);
                            next.setDate(next.getDate() + daysToMonday);
                            onCompanyUpdate({ ...company, nextCallAt: next.toISOString() });
                            addCallLog(company.id, "Svaraði ekki");
                            toast(showMondayPrompt ? "Símtal fært á mánudag" : "Símtal fært á morgun", { icon: "📞" });
                            setConfirmNoAnswer(null);
                          }}
                          className="gap-1.5 text-xs h-7 px-3"
                        >
                          {showMondayPrompt ? "Já, mánudagur" : "Já"}
                        </Button>
                        {showMondayPrompt && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!company.nextCallAt || !onCompanyUpdate) return;
                              const next = new Date(company.nextCallAt);
                              next.setDate(next.getDate() + 1);
                              onCompanyUpdate({ ...company, nextCallAt: next.toISOString() });
                              addCallLog(company.id, "Svaraði ekki");
                              toast("Símtal fært á morgun", { icon: "📞" });
                              setConfirmNoAnswer(null);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            Nei, á morgun
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setConfirmNoAnswer(null); }}
                          className="text-xs h-7 px-2"
                        >
                          Hætta við
                        </Button>
                      </>
                      );
                    })() : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setConfirmNoAnswer(company.id); }}
                        className="gap-1.5 text-xs h-7 px-3"
                      >
                        <PhoneMissed className="w-3.5 h-3.5" />
                        Svaraði ekki
                      </Button>
                    )}
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
