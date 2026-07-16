import { useEffect, useState } from "react";
import { Bell, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/molten/StatusPill";
import {
  createReminder,
  cancelReminder,
  listActiveForCompany,
  defaultTemplate,
  Reminder,
} from "@/services/notificationService";
import type { Company } from "@/types";
import { toast } from "sonner";

interface LataVitaButtonProps {
  company: Company;
}

export function LataVitaButton({ company }: LataVitaButtonProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<Reminder[]>([]);
  const [message, setMessage] = useState(defaultTemplate(company.name));
  const firstContact = (company.contacts || [])[0];
  const [recipient, setRecipient] = useState(
    firstContact?.phone || company.phone || firstContact?.email || company.email || "",
  );
  const [channel, setChannel] = useState<"sms" | "email">(
    firstContact?.phone || company.phone ? "sms" : "email",
  );

  const refresh = async () => {
    const rs = await listActiveForCompany(company.id);
    setActive(rs);
  };

  useEffect(() => {
    refresh();
  }, [company.id]);

  const queued = active.find((r) => r.status === "queued");
  const sent = active.find((r) => r.status === "sent");

  const submit = async () => {
    if (!recipient.trim()) {
      toast.error("Vantar símanúmer eða netfang");
      return;
    }
    setSaving(true);
    const r = await createReminder({
      companyId: company.id,
      channel,
      recipient: recipient.trim(),
      message: message.trim(),
    });
    setSaving(false);
    if (r) {
      toast.success("Skilaboð sett í biðröð");
      setOpen(false);
      refresh();
    } else {
      toast.error("Villa við að setja í biðröð");
    }
  };

  const doCancel = async () => {
    if (!queued) return;
    const ok = await cancelReminder(queued.id);
    if (ok) {
      toast.success("Hætt við");
      refresh();
    }
  };

  if (sent) {
    return (
      <StatusPill tone="sent" className="gap-1">
        <Check className="w-3 h-3" /> Látinn vita
      </StatusPill>
    );
  }
  if (queued) {
    return (
      <div className="inline-flex items-center gap-1">
        <StatusPill tone="queued" className="gap-1">
          <Bell className="w-3 h-3" /> Verður látinn vita í dag
        </StatusPill>
        <button
          onClick={doCancel}
          className="text-muted-foreground hover:text-destructive p-0.5"
          title="Hætta við"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1 border-orange-400/40 text-orange-200 hover:bg-orange-500/10"
        onClick={() => setOpen(true)}
      >
        <Bell className="w-3.5 h-3.5" />
        Láta vita
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong border-white/10">
          <DialogHeader>
            <DialogTitle>Láta vita — {company.name}</DialogTitle>
            <DialogDescription>
              Viltu að {company.name} fái skilaboð um að við hringjum í dag?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={channel === "sms" ? "default" : "outline"}
                onClick={() => setChannel("sms")}
              >
                SMS
              </Button>
              <Button
                type="button"
                size="sm"
                variant={channel === "email" ? "default" : "outline"}
                onClick={() => setChannel("email")}
              >
                Tölvupóstur
              </Button>
            </div>
            <div>
              <Label className="text-xs">
                {channel === "sms" ? "Símanúmer" : "Netfang"}
              </Label>
              <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Skilaboð</Label>
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Nei</Button>
            <Button onClick={submit} disabled={saving} className="bg-ember text-primary-foreground hover:opacity-90">
              {saving ? "Vista…" : "Já, senda skilaboð"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}