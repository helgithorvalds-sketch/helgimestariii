import { useEffect, useState } from "react";
import { Bell, Check, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusPill } from "@/components/molten/StatusPill";
import {
  listRemindersForDate,
  cancelReminder,
  triggerSendReminders,
  Reminder,
} from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchCompanies } from "@/services/companyService";
import type { Company } from "@/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Reminder[]>([]);
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    const [rs, cs] = await Promise.all([listRemindersForDate(), fetchCompanies()]);
    setItems(rs);
    const map: Record<string, Company> = {};
    cs.forEach((c) => (map[c.id] = c));
    setCompanies(map);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("notif-outbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications_outbox" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const queued = items.filter((r) => r.status === "queued");

  const doCancel = async (id: string) => {
    const ok = await cancelReminder(id);
    if (ok) refresh();
  };

  const sendNow = async () => {
    setSending(true);
    const res = await triggerSendReminders();
    setSending(false);
    if (res) {
      toast.success(`Sendi ${res.processed} skilaboð`);
      refresh();
    } else {
      toast.error("Ekki hægt að senda núna");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative glass border-white/10">
          <Bell className="w-4 h-4" />
          {queued.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full ember-bg text-[10px] font-bold flex items-center justify-center px-1 shadow-ember">
              {queued.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 glass-strong border-white/10">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Áminningar í dag</div>
            <div className="text-xs text-muted-foreground">
              {queued.length} í biðröð · {items.filter((i) => i.status === "sent").length} send
            </div>
          </div>
          <Button size="sm" onClick={sendNow} disabled={sending || !queued.length} className="bg-ember text-primary-foreground gap-1">
            <Send className="w-3.5 h-3.5" /> Senda núna
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Engar áminningar í dag</div>
          ) : (
            items.map((r) => {
              const c = companies[r.companyId];
              return (
                <div key={r.id} className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm truncate">{c?.name || "Fyrirtæki"}</div>
                    {r.status === "queued" && (
                      <StatusPill tone="queued" className="gap-1"><Bell className="w-3 h-3" />Bíður</StatusPill>
                    )}
                    {r.status === "sent" && (
                      <StatusPill tone="sent" className="gap-1"><Check className="w-3 h-3" />Sent</StatusPill>
                    )}
                    {r.status === "cancelled" && <StatusPill tone="neutral">Hætt við</StatusPill>}
                    {r.status === "failed" && <StatusPill tone="danger">Villa</StatusPill>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.channel === "sms" ? "SMS" : "Póstur"} · {r.recipient}
                  </div>
                  <div className="text-xs text-foreground/80 line-clamp-2">{r.message}</div>
                  {r.status === "queued" && (
                    <div className="pt-1">
                      <button onClick={() => doCancel(r.id)} className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
                        <X className="w-3 h-3" /> Hætta við
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}