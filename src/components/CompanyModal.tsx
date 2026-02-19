import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Company, CompanyStage, STAGE_LABELS, STAGE_ORDER, ChecklistItem } from "@/types";
import { StageBadge } from "./StageBadge";
import { Trash2, Save } from "lucide-react";

interface CompanyModalProps {
  company: Company;
  open: boolean;
  onClose: () => void;
  onUpdate: (company: Company) => void;
  onDelete: (id: string) => void;
}

export function CompanyModal({ company, open, onClose, onUpdate, onDelete }: CompanyModalProps) {
  const [editedCompany, setEditedCompany] = useState<Company>(company);

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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Eigandi</Label>
              <Input
                value={editedCompany.owner}
                onChange={(e) => updateField("owner", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ID / Kennitala</Label>
              <Input
                value={editedCompany.companyId}
                onChange={(e) => updateField("companyId", e.target.value)}
              />
            </div>
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

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Athugasemdir</Label>
            <Textarea
              value={editedCompany.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={2}
            />
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
