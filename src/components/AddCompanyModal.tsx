import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Company, CompanyStage, STAGE_LABELS, STAGE_ORDER, PRICE_OPTIONS, DEFAULT_CHECKLIST } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (company: Omit<Company, "id" | "createdAt">) => void;
  existingNames: string[];
}

export function AddCompanyModal({ open, onClose, onAdd, existingNames }: AddCompanyModalProps) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [stage, setStage] = useState<CompanyStage>("email_sent");
  const [selectedPrice, setSelectedPrice] = useState<number>(160000);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [personality, setPersonality] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");

  // AI paste
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (existingNames.some((n) => n.toLowerCase() === val.trim().toLowerCase())) {
      setDuplicateWarning("Fyrirtæki með þessu nafni er þegar til!");
    } else {
      setDuplicateWarning("");
    }
  };

  const handleAIParse = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-company", {
        body: { text: aiText.trim() },
      });

      if (error) {
        toast.error("Villa við AI greiningu");
        console.error(error);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Fill form with AI results
      if (data.name) handleNameChange(data.name);
      if (data.owner) setOwner(data.owner);
      if (data.companyId) setCompanyId(data.companyId);
      if (data.stage) setStage(data.stage);
      if (data.estimatedPrice) {
        const price = Number(data.estimatedPrice);
        const match = PRICE_OPTIONS.find((p) => p.value === price);
        if (match) {
          setUseCustomPrice(false);
          setSelectedPrice(match.value);
        } else {
          setUseCustomPrice(true);
          setCustomPrice(String(price));
        }
      }
      if (data.personalityDescription) setPersonality(data.personalityDescription);
      if (data.notes) setNotes(data.notes);

      toast.success("AI greindi upplýsingarnar!");
    } catch (err) {
      toast.error("Villa við AI greiningu");
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || duplicateWarning) return;
    const price = useCustomPrice ? Number(customPrice) || 0 : selectedPrice;
    const checklist = DEFAULT_CHECKLIST.map((item, i) => ({
      ...item,
      id: `new-${i}`,
    }));
    onAdd({
      name: name.trim(),
      owner: owner.trim(),
      companyId: companyId.trim(),
      stage,
      estimatedPrice: price,
      customPrice: useCustomPrice ? price : undefined,
      checklist,
      notes,
      personalityDescription: personality,
      previewSent: false,
      projectedEarnings: price,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName(""); setOwner(""); setCompanyId(""); setStage("email_sent");
    setSelectedPrice(160000); setUseCustomPrice(false); setCustomPrice("");
    setNotes(""); setPersonality(""); setDuplicateWarning(""); setAiText("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">Skrá nýtt fyrirtæki</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* AI Paste Section */}
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-accent/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <Label className="text-sm font-semibold text-primary">AI greining — límdu texta</Label>
            </div>
            <Textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Límdu hér allar upplýsingar um fyrirtækið (nafn, eigandi, kennitala, verð, lýsing o.fl.) og AI fyllir út formið..."
              rows={4}
              className="bg-background"
            />
            <Button
              onClick={handleAIParse}
              disabled={!aiText.trim() || aiLoading}
              variant="outline"
              className="w-full gap-2"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? "Greini..." : "Greina með AI"}
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">eða fylltu út handvirkt</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Nafn fyrirtækis *</Label>
            <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Nafn..." />
            {duplicateWarning && <p className="text-sm text-destructive">{duplicateWarning}</p>}
          </div>

          {/* Owner & ID */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Eigandi</Label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Nafn eiganda..." />
            </div>
            <div className="space-y-1.5">
              <Label>Kennitala / ID</Label>
              <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="000000-0000" />
            </div>
          </div>

          {/* Stage checklist */}
          <div className="space-y-2">
            <Label>Staða fyrirtækis</Label>
            <div className="grid grid-cols-1 gap-2">
              {STAGE_ORDER.map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    stage === s ? "border-primary bg-accent" : "border-border hover:bg-muted"
                  }`}
                  onClick={() => setStage(s)}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      stage === s ? "border-primary" : "border-muted-foreground"
                    }`}
                  >
                    {stage === s && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm font-medium">{STAGE_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <Label>Áætlað verð</Label>
            <RadioGroup
              value={useCustomPrice ? "custom" : String(selectedPrice)}
              onValueChange={(val) => {
                if (val === "custom") {
                  setUseCustomPrice(true);
                } else {
                  setUseCustomPrice(false);
                  setSelectedPrice(Number(val));
                }
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                {PRICE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      !useCustomPrice && selectedPrice === opt.value
                        ? "border-primary bg-accent"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={String(opt.value)} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
              <label
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  useCustomPrice ? "border-primary bg-accent" : "border-border hover:bg-muted"
                }`}
              >
                <RadioGroupItem value="custom" />
                <span className="text-sm font-medium">Sérsniðið verð</span>
              </label>
            </RadioGroup>
            {useCustomPrice && (
              <Input
                type="number"
                placeholder="Sláðu inn verð..."
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Personality */}
          <div className="space-y-1.5">
            <Label>Lýsing á fyrirtæki</Label>
            <Textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Hvernig er fyrirtækið sem persóna..."
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Athugasemdir</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Athugasemdir..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !!duplicateWarning}
            className="w-full"
          >
            Skrá fyrirtæki
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
