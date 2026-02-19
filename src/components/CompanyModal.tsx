import { useState, useEffect } from "react";
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
import { Trash2, Save, CalendarIcon, Phone, Plus, X, Globe } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { CallLog, fetchCallLogs, addCallLog, deleteCallLog } from "@/services/callLogService";
import { toast } from "sonner";

interface CompanyModalProps {
  company: Company;
  open: boolean;
  onClose: () => void;
  onUpdate: (company: Company) => void;
  onDelete: (id: string) => void;
}

export function CompanyModal({ company, open, onClose, onUpdate, onDelete }: CompanyModalProps) {
  const [editedCompany, setEditedCompany] = useState<Company>(company);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [newCallNote, setNewCallNote] = useState("");
  const [addingCall, setAddingCall] = useState(false);

  useEffect(() => {
    if (open && company.id) {
      fetchCallLogs(company.id).then(setCallLogs);
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
    onClose();
  };

  const handleDelete = () => {
    onDelete(company.id);
    onClose();
  };

  const formatPrice = (n: number) =>
    n.toLocaleString("is-IS") + " kr.";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-foreground">{editedCompany.name}</DialogTitle>
            <StageBadge stage={editedCompany.stage} size="md" />
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Basic info */}
          {/* Website URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              Vefsíða
            </Label>
            <Input
              value={editedCompany.websiteUrl || ""}
              onChange={(e) => updateField("websiteUrl", e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Eigandi</Label>
              <Input
                value={editedCompany.owner}
                onChange={(e) => updateField("owner", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                Sími
              </Label>
              <Input
                value={editedCompany.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Símanúmer..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ID / Kennitala</Label>
            <Input
              value={editedCompany.companyId}
              onChange={(e) => updateField("companyId", e.target.value)}
            />
          </div>

          {/* Stage */}
          <div className="space-y-2">
            <Label>Staða</Label>
            <div className="flex flex-wrap gap-2">
              {STAGE_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => updateField("stage", s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    editedCompany.stage === s
                      ? "ring-2 ring-primary ring-offset-1 scale-105"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <StageBadge stage={s} />
                </button>
              ))}
            </div>
          </div>

          {/* Price & Projected Earnings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Áætlað verð</Label>
              <Input
                type="number"
                value={editedCompany.estimatedPrice}
                onChange={(e) => updateField("estimatedPrice", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{formatPrice(editedCompany.estimatedPrice)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Áætlaður hagnaður</Label>
              <Input
                type="number"
                value={editedCompany.projectedEarnings}
                onChange={(e) => updateField("projectedEarnings", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{formatPrice(editedCompany.projectedEarnings)}</p>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Greitt (raunverulega)</Label>
              <Input
                type="number"
                value={editedCompany.amountPaid || ""}
                onChange={(e) => updateField("amountPaid", Number(e.target.value))}
                placeholder="Upphæð..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dagsetning greiðslu</Label>
              <Input
                type="date"
                value={editedCompany.paidDate || ""}
                onChange={(e) => updateField("paidDate", e.target.value)}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label>Gátlisti</Label>
            <div className="space-y-1.5 rounded-lg border p-3">
              {editedCompany.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 py-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => toggleChecklist(item.id)}
                  />
                  <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Personality */}
          <div className="space-y-1.5">
            <Label>Lýsing á fyrirtæki</Label>
            <Textarea
              value={editedCompany.personalityDescription}
              onChange={(e) => updateField("personalityDescription", e.target.value)}
              rows={2}
            />
          </div>

          {/* Next call */}
          <div className="space-y-2">
            <Label>Næsta símtal</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !editedCompany.nextCallAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editedCompany.nextCallAt
                      ? format(parseISO(editedCompany.nextCallAt), "dd.MM.yyyy")
                      : "Veldu dagsetningu"}
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

          {/* Call Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Símtalaskrá</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingCall(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Nýtt símtal
              </Button>
            </div>

            {addingCall && (
              <div className="rounded-xl border border-primary/30 bg-accent/30 p-3 space-y-2">
                <Textarea
                  value={newCallNote}
                  onChange={(e) => setNewCallNote(e.target.value)}
                  placeholder="Skrifaðu athugasemdir frá símtalinu..."
                  rows={3}
                  autoFocus
                  className="bg-background"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAddingCall(false); setNewCallNote(""); }}
                  >
                    Hætta við
                  </Button>
                  <Button
                    size="sm"
                    disabled={!newCallNote.trim()}
                    onClick={async () => {
                      const log = await addCallLog(company.id, newCallNote.trim());
                      if (log) {
                        setCallLogs((prev) => [log, ...prev]);
                        setNewCallNote("");
                        setAddingCall(false);
                        toast.success("Símtal skráð!");
                      } else {
                        toast.error("Villa við skráningu");
                      }
                    }}
                    className="gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Vista símtal
                  </Button>
                </div>
              </div>
            )}

            {callLogs.length === 0 && !addingCall ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                <Phone className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Engin símtöl skráð ennþá</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {callLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border bg-background p-3 group relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium mb-1">
                          {format(parseISO(log.calledAt), "dd.MM.yyyy · HH:mm")}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{log.notes}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const ok = await deleteCallLog(log.id);
                          if (ok) setCallLogs((prev) => prev.filter((l) => l.id !== log.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 gap-2">
              <Save className="w-4 h-4" />
              Vista
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Eyða
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
