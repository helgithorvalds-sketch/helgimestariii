import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Company, CompanyStage, STAGE_LABELS, STAGE_ORDER, PRICE_OPTIONS, DEFAULT_CHECKLIST, PreviewSubStatus, PREVIEW_SUB_LABELS, PREVIEW_SUB_ORDER } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, CalendarIcon, Globe, Phone, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (company: Omit<Company, "id" | "createdAt">) => void;
  existingNames: string[];
}

export function AddCompanyModal({ open, onClose, onAdd, existingNames }: AddCompanyModalProps) {
  const [name, setName] = useState("");
  const [stage, setStage] = useState<CompanyStage>("email_sent");
  const [previewSub, setPreviewSub] = useState<PreviewSubStatus | undefined>();
  const [selectedPrice, setSelectedPrice] = useState<number>(160000);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [personality, setPersonality] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [nextCallDate, setNextCallDate] = useState<Date | undefined>();
  const [nextCallTime, setNextCallTime] = useState("10:00");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [finnaUrl, setFinnaUrl] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerUnknown, setOwnerUnknown] = useState(false);
  const [companyId, setCompanyId] = useState("");

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

      if (error) { toast.error("Villa við AI greiningu"); return; }
      if (data.error) { toast.error(data.error); return; }

      if (data.name) handleNameChange(data.name);
      if (data.stage) setStage(data.stage);
      if (data.owner) setOwnerName(data.owner);
      if (data.companyId) setCompanyId(data.companyId);
      if (data.websiteUrl) setWebsiteUrl(data.websiteUrl);
      if (data.finnaUrl) setFinnaUrl(data.finnaUrl);
      if (data.estimatedPrice) {
        const price = Number(data.estimatedPrice);
        const match = PRICE_OPTIONS.find((p) => p.value === price);
        if (match) { setUseCustomPrice(false); setSelectedPrice(match.value); }
        else { setUseCustomPrice(true); setCustomPrice(String(price)); }
      }
      toast.success("AI greindi upplýsingarnar!");
    } catch { toast.error("Villa við AI greiningu"); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = () => {
    if (!name.trim() || duplicateWarning) return;
    if (!ownerUnknown && !ownerName.trim()) return;
    if (stage === "preview" && !previewSub) return;
    const price = useCustomPrice ? Number(customPrice) || 0 : selectedPrice;
    const checklist = DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `new-${i}` }));
    
    let nextCallAt: string | undefined;
    if (nextCallDate) {
      const [hours, minutes] = nextCallTime.split(":").map(Number);
      const dt = new Date(nextCallDate);
      dt.setHours(hours, minutes, 0, 0);
      nextCallAt = dt.toISOString();
    }
    
    onAdd({
      name: name.trim(),
      owner: ownerUnknown ? "" : ownerName.trim(),
      companyId: companyId.trim(),
      stage,
      previewSubStatus: stage === "preview" ? previewSub : undefined,
      estimatedPrice: price,
      customPrice: useCustomPrice ? price : undefined,
      checklist,
      notes,
      personalityDescription: personality,
      previewSent: false,
      projectedEarnings: price,
      nextCallAt,
      websiteUrl: websiteUrl.trim() || undefined,
      finnaUrl: finnaUrl.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName(""); setStage("email_sent"); setPreviewSub(undefined);
    setSelectedPrice(160000); setUseCustomPrice(false); setCustomPrice("");
    setNotes(""); setPersonality(""); setDuplicateWarning(""); setAiText("");
    setNextCallDate(undefined); setNextCallTime("10:00");
    setWebsiteUrl(""); setFinnaUrl(""); setPhone(""); setOwnerName(""); setCompanyId("");
    setOwnerUnknown(false);
  };

  // Filter out "registered" from stage options in the form
  const formStages = STAGE_ORDER.filter((s) => s !== "registered");

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
              placeholder="Límdu hér allar upplýsingar um fyrirtækið og AI fyllir út formið..."
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

          {/* Finna URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <ExternalLink className="w-4 h-4" />
              Finna tengill
            </Label>
            <Input
              value={finnaUrl}
              onChange={(e) => setFinnaUrl(e.target.value)}
              placeholder="https://www.finna.is/fyrirtaeki/..."
              type="url"
            />
          </div>

          {/* Website URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              Núverandi vefsíða
            </Label>
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>

          {/* Owner & Phone */}
          <div className="space-y-1.5">
            <Label>Tengiliður *</Label>
            {!ownerUnknown ? (
              <div className="flex gap-2">
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nafn tengiliðs..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setOwnerUnknown(true); setOwnerName(""); }}
                  className="whitespace-nowrap text-xs"
                >
                  Veit ekki
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 p-3">
                <span className="text-sm text-muted-foreground flex-1">Tengiliður óþekktur</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOwnerUnknown(false)}
                  className="text-xs"
                >
                  Breyta
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              Sími
            </Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Símanúmer..." />
          </div>

          {/* Stage selection */}
          <div className="space-y-2">
            <Label>Staða fyrirtækis</Label>
            <div className="grid grid-cols-1 gap-2">
              {formStages.map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    stage === s ? "border-primary bg-accent" : "border-border hover:bg-muted"
                  }`}
                  onClick={() => { setStage(s); if (s !== "preview") setPreviewSub(undefined); }}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${stage === s ? "border-primary" : "border-muted-foreground"}`}>
                    {stage === s && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="text-sm font-medium">{STAGE_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview sub-options */}
          {stage === "preview" && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/30">
              <Label className="text-sm text-primary">Undirflokkur sýnishorns</Label>
              <div className="grid grid-cols-1 gap-2">
                {PREVIEW_SUB_ORDER.map((sub) => (
                  <label
                    key={sub}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      previewSub === sub ? "border-primary bg-accent" : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setPreviewSub(sub)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${previewSub === sub ? "border-primary" : "border-muted-foreground"}`}>
                      {previewSub === sub && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm font-medium">{PREVIEW_SUB_LABELS[sub]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="space-y-2">
            <Label>Áætlað verð</Label>
            <RadioGroup
              value={useCustomPrice ? "custom" : String(selectedPrice)}
              onValueChange={(val) => {
                if (val === "custom") { setUseCustomPrice(true); }
                else { setUseCustomPrice(false); setSelectedPrice(Number(val)); }
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                {PRICE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      !useCustomPrice && selectedPrice === opt.value ? "border-primary bg-accent" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={String(opt.value)} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
              <label className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${useCustomPrice ? "border-primary bg-accent" : "border-border hover:bg-muted"}`}>
                <RadioGroupItem value="custom" />
                <span className="text-sm font-medium">Sérsniðið verð</span>
              </label>
            </RadioGroup>
            {useCustomPrice && (
              <Input type="number" placeholder="Sláðu inn verð..." value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="mt-2" />
            )}
          </div>

          {/* Next call date/time */}
          <div className="space-y-2">
            <Label>Næsta símtal</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !nextCallDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextCallDate ? format(nextCallDate, "dd.MM.yyyy") : "Veldu dagsetningu"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={nextCallDate}
                    onSelect={setNextCallDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={nextCallTime}
                onChange={(e) => setNextCallTime(e.target.value)}
                className="w-28"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Athugasemdir</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Athugasemdir..." rows={2} />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !!duplicateWarning || (stage === "preview" && !previewSub) || (!ownerUnknown && !ownerName.trim())}
            className="w-full"
          >
            Skrá fyrirtæki
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
