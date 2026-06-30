import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Company, CompanyStage, STAGE_LABELS, STAGE_ORDER, PRICE_OPTIONS, DEFAULT_CHECKLIST, PreviewSubStatus, PREVIEW_SUB_LABELS, PREVIEW_SUB_ORDER, FinishedSubStatus, FINISHED_SUB_LABELS, FINISHED_SUB_ORDER, ContactPerson } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, CalendarIcon, Globe, Phone, ExternalLink, Mail, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (company: Omit<Company, "id" | "createdAt">) => void;
  existingNames: string[];
  existingCompanyIds?: string[];
}

export function AddCompanyModal({ open, onClose, onAdd, existingNames, existingCompanyIds = [] }: AddCompanyModalProps) {
  const [name, setName] = useState("");
  const [stage, setStage] = useState<CompanyStage>("email_sent");
  const [previewSub, setPreviewSub] = useState<PreviewSubStatus | undefined>();
  const [finishedSub, setFinishedSub] = useState<FinishedSubStatus | undefined>();
  const [selectedPrice, setSelectedPrice] = useState<number>(160000);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [personality, setPersonality] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [nextCallDate, setNextCallDate] = useState<Date | undefined>();
  const [nextCallTime, setNextCallTime] = useState("10:00");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contacts, setContacts] = useState<ContactPerson[]>([{ id: "new-c-0", name: "", phone: "" }]);
  const [email, setEmail] = useState("");
  const [finnaUrl, setFinnaUrl] = useState("");
  const [ownerUnknown, setOwnerUnknown] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("");
  const [kennitalaWarning, setKennitalaWarning] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [emailConfidence, setEmailConfidence] = useState<"sure" | "unsure">("unsure");

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

  const handleCompanyIdChange = (val: string) => {
    setCompanyId(val);
    const trimmed = val.trim();
    if (trimmed && existingCompanyIds.some((k) => k === trimmed)) {
      setKennitalaWarning("Fyrirtæki með þessari kennitölu er þegar til!");
    } else {
      setKennitalaWarning("");
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
      if (data.owner) setContacts([{ id: "new-c-0", name: data.owner, phone: "" }]);
      if (data.companyId) setCompanyId(data.companyId);
      if (data.websiteUrl) setWebsiteUrl(data.websiteUrl);
      if (data.finnaUrl) setFinnaUrl(data.finnaUrl);
      if (data.email) setEmail(data.email);
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
    if (!name.trim() || duplicateWarning || kennitalaWarning) return;
    if (companyId.trim() && existingCompanyIds.includes(companyId.trim())) {
      setKennitalaWarning("Fyrirtæki með þessari kennitölu er þegar til!");
      return;
    }
    const validContacts = contacts.filter(c => c.name.trim() || c.phone.trim());
    if (!ownerUnknown && validContacts.length === 0) return;
    if (stage === "preview" && !previewSub) return;
    if (stage === "finished" && !finishedSub) return;
    const price = stage === "paid" ? (Number(paidAmount) || 0) : (useCustomPrice ? Number(customPrice) || 0 : selectedPrice);
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
      owner: ownerUnknown ? "" : (validContacts[0]?.name.trim() || ""),
      companyId: companyId.trim(),
      address: address.trim() || undefined,
      industry: industry.trim() || undefined,
      stage,
      previewSubStatus: stage === "preview" ? previewSub : undefined,
      finishedSubStatus: stage === "finished" ? finishedSub : undefined,
      estimatedPrice: stage === "paid" ? price : price,
      amountPaid: stage === "paid" ? (Number(paidAmount) || undefined) : undefined,
      customPrice: useCustomPrice ? price : undefined,
      checklist,
      contacts: validContacts,
      notes,
      personalityDescription: personality,
      previewSent: false,
      projectedEarnings: price,
      monthlyPaymentActive: false,
      nextCallAt,
      websiteUrl: websiteUrl.trim() || undefined,
      finnaUrl: finnaUrl.trim() || undefined,
      phone: validContacts[0]?.phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName(""); setStage("email_sent"); setPreviewSub(undefined);
    setSelectedPrice(160000); setUseCustomPrice(false); setCustomPrice("");
    setFinishedSub(undefined);
    setNotes(""); setPersonality(""); setDuplicateWarning(""); setAiText("");
    setNextCallDate(undefined); setNextCallTime("10:00");
    setWebsiteUrl(""); setFinnaUrl(""); setEmail(""); setCompanyId("");
    setContacts([{ id: "new-c-0", name: "", phone: "" }]);
    setOwnerUnknown(false); setPaidAmount("");
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

          {/* Contacts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tengiliðir *</Label>
              {!ownerUnknown && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setContacts([...contacts, { id: `new-c-${Date.now()}`, name: "", phone: "" }])}
                  className="gap-1 text-xs h-7"
                >
                  <Plus className="w-3.5 h-3.5" /> Bæta við
                </Button>
              )}
            </div>
            {!ownerUnknown ? (
              <div className="space-y-2">
                {contacts.map((contact, idx) => (
                  <div key={contact.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={contact.name}
                        onChange={(e) => {
                          const updated = [...contacts];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setContacts(updated);
                        }}
                        placeholder="Nafn..."
                      />
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <Input
                          value={contact.phone}
                          onChange={(e) => {
                            const updated = [...contacts];
                            updated[idx] = { ...updated[idx], phone: e.target.value };
                            setContacts(updated);
                          }}
                          placeholder="Símanúmer..."
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    {contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setOwnerUnknown(true); setContacts([{ id: "new-c-0", name: "", phone: "" }]); }}
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
              <Mail className="w-4 h-4" />
              Netfang
            </Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="netfang@fyrirtaeki.is" type="email" />
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setEmailConfidence("sure")}
                className={`px-3 py-1 rounded-md text-sm font-bold transition-colors ${
                  emailConfidence === "sure"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setEmailConfidence("unsure")}
                className={`px-3 py-1 rounded-md text-sm font-bold transition-colors ${
                  emailConfidence === "unsure"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Ekki viss
              </button>
            </div>
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
                  onClick={() => { setStage(s); if (s !== "preview") setPreviewSub(undefined); if (s !== "finished") setFinishedSub(undefined); }}
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

          {/* Finished sub-options */}
          {stage === "finished" && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/30">
              <Label className="text-sm text-primary">Undirflokkur</Label>
              <div className="grid grid-cols-1 gap-2">
                {FINISHED_SUB_ORDER.map((sub) => (
                  <label
                    key={sub}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      finishedSub === sub ? "border-primary bg-accent" : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setFinishedSub(sub)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${finishedSub === sub ? "border-primary" : "border-muted-foreground"}`}>
                      {finishedSub === sub && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm font-medium">{FINISHED_SUB_LABELS[sub]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Meistaraverk link - shown for lokið/greitt */}
          {(stage === "finished" || stage === "paid") && (
            <div className="space-y-1.5 pl-4 border-l-2 border-primary/30">
              <Label className="flex items-center gap-1.5 text-sm text-primary">
                <Globe className="w-4 h-4" />
                Tengill á meistaraverkið
              </Label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
            </div>
          )}

          {/* Paid amount - shown for greitt */}
          {stage === "paid" && (
            <div className="space-y-1.5 pl-4 border-l-2 border-primary/30">
              <Label className="text-sm text-primary">Borgað</Label>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="Upphæð í kr..."
              />
            </div>
          )}

          {/* Pricing - hidden when paid */}
          {stage !== "paid" && (
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
          )}

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
            disabled={!name.trim() || !!duplicateWarning || (stage === "preview" && !previewSub) || (stage === "finished" && !finishedSub) || (!ownerUnknown && contacts.every(c => !c.name.trim()))}
            className="w-full"
          >
            Skrá fyrirtæki
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
