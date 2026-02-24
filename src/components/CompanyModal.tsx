import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Company, CompanyStage, STAGE_LABELS, STAGE_ORDER, ChecklistItem } from "@/types";
import { StageBadge } from "./StageBadge";
import { Trash2, Save, CalendarIcon, Phone, Plus, X, Globe, ExternalLink, Mail, Pencil, ArrowLeft, Repeat, Play, Pause, CheckCircle, Sparkles, Loader2, Mic, MicOff, Languages, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { CallLog, fetchCallLogs, addCallLog, deleteCallLog } from "@/services/callLogService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CompanyModalProps {
  company: Company;
  open: boolean;
  onClose: () => void;
  onUpdate: (company: Company) => void;
  onDelete: (id: string) => void;
}

export function CompanyModal({ company, open, onClose, onUpdate, onDelete }: CompanyModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedCompany, setEditedCompany] = useState<Company>(company);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [newCallNote, setNewCallNote] = useState("");
  const [addingCall, setAddingCall] = useState(false);
  
  // Full call overlay state (same as CallSchedule)
  const [finishingCall, setFinishingCall] = useState(false);
  const [finishNotes, setFinishNotes] = useState("");
  const [finishOwnerName, setFinishOwnerName] = useState("");
  const [savingFinish, setSavingFinish] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [originalNotes, setOriginalNotes] = useState<string | null>(null);
  const [nextCallDate, setNextCallDate] = useState("");
  const [nextCallTime, setNextCallTime] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  
  // Quick schedule state
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  useEffect(() => {
    if (open && company.id) {
      fetchCallLogs(company.id).then(setCallLogs);
      setEditMode(false);
      setEditedCompany(company);
    }
  }, [open, company.id]);

  const updateField = <K extends keyof Company>(key: K, value: Company[K]) => {
    setEditedCompany((prev) => ({ ...prev, [key]: value }));
  };

  const toggleChecklist = (itemId: string) => {
    updateField(
      "checklist",
      editedCompany.checklist.map((c) =>
        c.id === itemId ? { ...c, checked: !c.checked } : c
      )
    );
  };

  const handleSave = () => {
    onUpdate(editedCompany);
    setEditMode(false);
  };

  const handleDelete = () => {
    onDelete(company.id);
    onClose();
  };

  // ─── FULL CALL OVERLAY FUNCTIONS ───
  const handleFinishCall = async () => {
    if (!finishNotes.trim()) return;
    setSavingFinish(true);
    const log = await addCallLog(company.id, finishNotes.trim());
    if (log) {
      setCallLogs((prev) => [log, ...prev]);
      let nextCallAt: string | undefined = undefined;
      if (nextCallDate && nextCallTime) {
        nextCallAt = new Date(`${nextCallDate}T${nextCallTime}`).toISOString();
      } else if (nextCallDate) {
        nextCallAt = new Date(`${nextCallDate}T09:00`).toISOString();
      }
      const updated = {
        ...company,
        nextCallAt,
        owner: finishOwnerName.trim() || company.owner,
      };
      onUpdate(updated);
      toast.success("Símtal skráð!");
    } else {
      toast.error("Villa við skráningu");
    }
    setSavingFinish(false);
    setFinishingCall(false);
    setFinishNotes("");
    setFinishOwnerName("");
    setOriginalNotes(null);
    setNextCallDate("");
    setNextCallTime("");
  };

  const handleSummarize = async () => {
    if (!finishNotes.trim()) return;
    setSummarizing(true);
    setOriginalNotes(finishNotes);
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
      toast.error("Villa við samantekt");
      setOriginalNotes(null);
    }
    setSummarizing(false);
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
      toast.error("Villa við þýðingu");
      setOriginalNotes(null);
    }
    setTranslating(false);
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
    if (!SpeechRecognitionAPI) { toast.error("Vafrinn þinn styður ekki talgreiningu"); return; }
    if (isRecording) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
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
    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch (_) {}
      } else {
        setIsRecording(false);
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        toast.error("Hljóðnemi ekki leyfður");
        isListeningRef.current = false;
        setIsRecording(false);
      } else if (event.error !== "no-speech") {
        isListeningRef.current = false;
        setIsRecording(false);
      }
    };
    recognitionRef.current = recognition;
    isListeningRef.current = true;
    recognition.start();
    setIsRecording(true);
  };

  const handleQuickSchedule = () => {
    if (!scheduleDate) return;
    const nextCallAt = scheduleTime
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : new Date(`${scheduleDate}T09:00`).toISOString();
    onUpdate({ ...editedCompany, nextCallAt });
    setShowScheduler(false);
    setScheduleDate("");
    setScheduleTime("09:00");
    toast.success("Símtal skipulagt!");
  };

  const formatPrice = (n: number) =>
    n.toLocaleString("is-IS") + " kr.";

  const getDaysUntil = (dateStr: string) => {
    const now = new Date();
    const target = parseISO(dateStr);
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)} dögum síðan`;
    if (diffDays === 0) return "Í dag";
    if (diffDays === 1) return "Á morgun";
    return `Eftir ${diffDays} daga`;
  };

  // ─── VIEW MODE ───
  const renderViewMode = () => (
    <div className="space-y-4 pt-2">
      {/* Contact info */}
      <div className="space-y-2.5">
        {company.owner && (
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm w-24 flex-shrink-0">Tengiliður</span>
            <span className="text-sm font-medium text-foreground">{company.owner}</span>
          </div>
        )}
        {company.phone && (
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm w-24 flex-shrink-0 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Sími
            </span>
            <a href={`tel:${company.phone}`} className="text-sm font-medium text-primary hover:underline">
              {company.phone}
            </a>
          </div>
        )}
        {company.email && (
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm w-24 flex-shrink-0 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Netfang
            </span>
            <a href={`mailto:${company.email}`} className="text-sm font-medium text-primary hover:underline truncate">
              {company.email}
            </a>
          </div>
        )}
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        {company.logoUrl && (
          <a
            href={company.logoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900"
          >
            <Globe className="w-3.5 h-3.5" />
            Meistaraverk
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {company.websiteUrl && (
          <a
            href={company.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            Gamli vefur
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {company.finnaUrl && (
          <a
            href={company.finnaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Finna.is
          </a>
        )}
      </div>

      {/* Next call with countdown */}
      {company.nextCallAt && (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <CalendarIcon className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Næsta símtal</p>
            <p className="text-sm font-medium text-foreground">
              {format(parseISO(company.nextCallAt), "dd.MM.yyyy · HH:mm")}
            </p>
          </div>
          <span className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full",
            parseISO(company.nextCallAt).getTime() < Date.now()
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}>
            {getDaysUntil(company.nextCallAt)}
          </span>
        </div>
      )}

      {/* Price & Payment */}
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Áætlað verð</span>
          <span className="text-sm font-bold text-foreground">{formatPrice(company.estimatedPrice)}</span>
        </div>
        {company.amountPaid !== undefined && company.amountPaid > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Borgað</span>
            <span className="text-sm font-bold text-primary">{formatPrice(company.amountPaid)}</span>
          </div>
        )}
      </div>

      {/* Monthly Payment */}
      {(company.monthlyPaymentAmount || company.monthlyPaymentActive) && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Repeat className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Mánaðarleg greiðsla</span>
          </div>
          {company.monthlyPaymentAmount && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Upphæð</span>
              <span className="text-sm font-bold text-foreground">{formatPrice(company.monthlyPaymentAmount)}</span>
            </div>
          )}
          {company.monthlyPaymentStartDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Byrjunardagur</span>
              <span className="text-sm font-medium text-foreground">{format(new Date(company.monthlyPaymentStartDate), "dd.MM.yyyy")}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Staða</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${company.monthlyPaymentActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {company.monthlyPaymentActive ? "Virkt" : "Óvirkt"}
            </span>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Gátlisti</Label>
        <div className="space-y-1 rounded-lg border p-3">
          {company.checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-0.5">
              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${item.checked ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                {item.checked && <span className="text-primary-foreground text-xs">✓</span>}
              </div>
              <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Company Notes - Yellow */}
      {company.notes && (
        <div className="space-y-1">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
            Athugasemdir
          </Label>
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
            <p className="text-sm text-foreground whitespace-pre-wrap">{company.notes}</p>
          </div>
        </div>
      )}

      {/* Call Log - Blue */}
      {renderCallLog()}

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setEditMode(true)} variant="outline" className="flex-1 gap-2">
          <Pencil className="w-4 h-4" />
          Breyta
        </Button>
        <Button variant="destructive" onClick={handleDelete} className="gap-2">
          <Trash2 className="w-4 h-4" />
          Eyða
        </Button>
      </div>
    </div>
  );

  // ─── EDIT MODE ───
  const renderEditMode = () => (
    <div className="space-y-4 pt-2">
      <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); setEditedCompany(company); }} className="gap-1.5 -ml-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Til baka
      </Button>

      {/* Company name */}
      <div className="space-y-1.5">
        <Label>Nafn fyrirtækis <span className="text-destructive">*</span></Label>
        <Input value={editedCompany.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Nafn..." />
      </div>

      {/* Finna URL */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><ExternalLink className="w-4 h-4" /> Finna tengill</Label>
        <div className="flex gap-2">
          <Input value={editedCompany.finnaUrl || ""} onChange={(e) => updateField("finnaUrl", e.target.value)} placeholder="https://www.finna.is/fyrirtaeki/..." type="url" className="flex-1" />
          {editedCompany.finnaUrl && (
            <a href={editedCompany.finnaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 hover:bg-accent transition-colors">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Current website */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> Núverandi vefsíða</Label>
        <Input value={editedCompany.websiteUrl || ""} onChange={(e) => updateField("websiteUrl", e.target.value)} placeholder="https://..." type="url" />
      </div>

      {/* Contact person */}
      <div className="space-y-1.5">
        <Label>Tengiliður <span className="text-destructive">*</span></Label>
        <Input value={editedCompany.owner} onChange={(e) => updateField("owner", e.target.value)} placeholder="Nafn tengiliðs..." />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> Sími</Label>
        <Input value={editedCompany.phone || ""} onChange={(e) => updateField("phone", e.target.value)} placeholder="Símanúmer..." />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> Netfang</Label>
        <Input value={editedCompany.email || ""} onChange={(e) => updateField("email", e.target.value)} placeholder="netfang@fyrirtaeki.is" type="email" />
      </div>

      {/* Stage */}
      <div className="space-y-2">
        <Label>Staða fyrirtækis</Label>
        <div className="flex flex-wrap gap-2">
          {STAGE_ORDER.map((s) => (
            <button key={s} onClick={() => updateField("stage", s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${editedCompany.stage === s ? "ring-2 ring-primary ring-offset-1 scale-105" : "opacity-60 hover:opacity-100"}`}>
              <StageBadge stage={s} />
            </button>
          ))}
        </div>
      </div>

      {/* Meistaraverk link */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> Tengill á meistaraverkið</Label>
        <Input value={editedCompany.logoUrl || ""} onChange={(e) => updateField("logoUrl", e.target.value)} placeholder="https://..." type="url" />
      </div>

      {/* Amount paid */}
      <div className="space-y-1.5">
        <Label>Borgað</Label>
        <Input type="number" value={editedCompany.amountPaid || ""} onChange={(e) => updateField("amountPaid", Number(e.target.value))} placeholder="Upphæð í kr..." />
      </div>

      {/* Monthly Payment */}
      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold">Mánaðarleg greiðsla</Label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Upphæð á mánuði</Label>
          <Input
            type="number"
            value={editedCompany.monthlyPaymentAmount || ""}
            onChange={(e) => updateField("monthlyPaymentAmount", Number(e.target.value) || undefined)}
            placeholder="Upphæð í kr..."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Byrjunardagur greiðslu</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editedCompany.monthlyPaymentStartDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {editedCompany.monthlyPaymentStartDate ? format(new Date(editedCompany.monthlyPaymentStartDate), "dd.MM.yyyy") : "Veldu dagsetningu"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={editedCompany.monthlyPaymentStartDate ? new Date(editedCompany.monthlyPaymentStartDate) : undefined}
                onSelect={(date) => updateField("monthlyPaymentStartDate", date ? format(date, "yyyy-MM-dd") : undefined)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button
          variant={editedCompany.monthlyPaymentActive ? "destructive" : "default"}
          size="sm"
          className="w-full gap-2"
          disabled={!editedCompany.monthlyPaymentAmount}
          onClick={() => updateField("monthlyPaymentActive", !editedCompany.monthlyPaymentActive)}
        >
          {editedCompany.monthlyPaymentActive ? (
            <><Pause className="w-4 h-4" /> Stöðva mánaðarlega greiðslu</>
          ) : (
            <><Play className="w-4 h-4" /> Byrja að rekja mánaðarlega greiðslu</>
          )}
        </Button>
      </div>

      {/* Next call */}
      <div className="space-y-2">
        <Label>Næsta símtal</Label>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !editedCompany.nextCallAt && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {editedCompany.nextCallAt ? format(parseISO(editedCompany.nextCallAt), "dd.MM.yyyy") : "Veldu dagsetningu"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={editedCompany.nextCallAt ? parseISO(editedCompany.nextCallAt) : undefined}
                onSelect={(date) => {
                  if (date) {
                    const existing = editedCompany.nextCallAt ? parseISO(editedCompany.nextCallAt) : new Date();
                    date.setHours(existing.getHours(), existing.getMinutes());
                    updateField("nextCallAt", date.toISOString());
                  } else {
                    updateField("nextCallAt", undefined);
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={editedCompany.nextCallAt ? format(parseISO(editedCompany.nextCallAt), "HH:mm") : ""}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              const dt = editedCompany.nextCallAt ? parseISO(editedCompany.nextCallAt) : new Date();
              dt.setHours(h, m, 0, 0);
              updateField("nextCallAt", dt.toISOString());
            }}
            className="w-28"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Athugasemdir</Label>
        <Textarea value={editedCompany.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} />
      </div>

      {/* Schedule a call button */}
      <div className="rounded-lg border border-dashed border-primary/30 p-3 space-y-2">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowScheduler(!showScheduler)}
        >
          <Phone className="w-4 h-4" />
          Skipuleggja símtal
        </Button>
        {showScheduler && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="flex-1 text-sm h-9"
              />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-28 text-sm h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!scheduleDate}
                onClick={handleQuickSchedule}
                className="flex-1 gap-1.5"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Vista
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowScheduler(false); setScheduleDate(""); setScheduleTime("09:00"); }}>
                Hætta við
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <Button onClick={handleSave} className="w-full gap-2">
        <Save className="w-4 h-4" />
        Vista breytingar
      </Button>
    </div>
  );

  // ─── CALL LOG (shared) ───
  const renderCallLog = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-blue-500" />
          <Label className="text-sm font-semibold">Símtalaskrá</Label>
        </div>
        <Button variant="outline" size="sm" onClick={() => setFinishingCall(true)} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Nýtt símtal
        </Button>
      </div>


      {callLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          <Phone className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="text-xs">Engin símtöl skráð ennþá</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {callLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-blue-200 bg-blue-50 p-3 group relative dark:border-blue-800 dark:bg-blue-950/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{format(parseISO(log.calledAt), "dd.MM.yyyy · HH:mm")}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.notes}</p>
                </div>
                <button onClick={async () => { const ok = await deleteCallLog(log.id); if (ok) setCallLogs((prev) => prev.filter((l) => l.id !== log.id)); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Full call overlay */}
      {finishingCall && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl border-2 border-primary bg-card p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Nýtt símtal</h2>
              <p className="text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{company.name}</span>
                {company.phone && <span className="ml-2">· 📞 {company.phone}</span>}
              </p>
            </div>
            {/* Contact name prompt if missing */}
            {!company.owner && (
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
                    <Button variant="outline" size="sm" onClick={handleRevertNotes} className="gap-1.5 text-xs h-7 text-muted-foreground">
                      ↩️ Til baka
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleTranslate} disabled={!finishNotes.trim() || translating} className="gap-1.5 text-xs h-7">
                    {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                    {translating ? "Þýði..." : "Þýða á íslensku"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSummarize} disabled={!finishNotes.trim() || summarizing} className="gap-1.5 text-xs h-7">
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
                <Input type="date" value={nextCallDate} onChange={(e) => setNextCallDate(e.target.value)} className="flex-1 text-sm h-9" />
                <Input type="time" value={nextCallTime} onChange={(e) => setNextCallTime(e.target.value)} className="w-28 text-sm h-9" placeholder="09:00" />
              </div>
              {!nextCallDate && (
                <p className="text-xs text-muted-foreground">Ef þú skilur þetta eftir tómt verður ekkert símtal skipulagt.</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={handleFinishCall} disabled={!finishNotes.trim() || savingFinish} className="flex-1 gap-2">
                <CheckCircle className="w-4 h-4" />
                {savingFinish ? "Vista..." : "Vista og ljúka"}
              </Button>
              <Button variant="ghost" onClick={() => {
                isListeningRef.current = false;
                recognitionRef.current?.stop();
                setFinishingCall(false);
                setFinishNotes("");
                setFinishOwnerName("");
                setOriginalNotes(null);
                setNextCallDate("");
                setNextCallTime("");
                setIsRecording(false);
              }} className="text-muted-foreground">
                Hætta við
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setEditMode(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-foreground">{company.name}</DialogTitle>
              <StageBadge stage={company.stage} size="md" />
            </div>
          </DialogHeader>

          {editMode ? renderEditMode() : renderViewMode()}
        </DialogContent>
      </Dialog>
    </>
  );
}
