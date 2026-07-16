import { useEffect, useState } from "react";
import { Mail, MessageCircle, Smartphone, StickyNote, CheckCircle, Send, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  addCommunication,
  channelLabel,
  CommChannel,
  Communication,
  CommStatus,
  fetchCommStatus,
  fetchCommunications,
  markReplied,
} from "@/services/communicationService";

const ICELANDIC_MONTHS = [
  "janúar", "febrúar", "mars", "apríl", "maí", "júní",
  "júlí", "ágúst", "september", "október", "nóvember", "desember",
];

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Í dag";
  if (sameDay(d, yesterday)) return "Í gær";
  return `${d.getDate()}. ${ICELANDIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CHANNEL_ICON: Record<CommChannel, any> = {
  email: Mail,
  messenger: MessageCircle,
  sms: Smartphone,
  note: StickyNote,
};

interface Props {
  companyId: string;
}

export function CommunicationsSection({ companyId }: Props) {
  const [status, setStatus] = useState<CommStatus | null>(null);
  const [comms, setComms] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<CommChannel>("messenger");
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [s, cs] = await Promise.all([fetchCommStatus(companyId), fetchCommunications(companyId)]);
    setStatus(s);
    setComms(cs);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleMarkReplied = async () => {
    const updated = await markReplied(companyId);
    if (updated) {
      setStatus(updated);
      toast.success("Merkt sem svarað");
    }
  };

  const handleSave = async () => {
    if (!body.trim()) return;
    setSaving(true);
    const [y, m, d] = dateStr.split("-").map(Number);
    const now = new Date();
    const occurred = new Date(y, (m || 1) - 1, d || 1, now.getHours(), now.getMinutes()).toISOString();
    const created = await addCommunication({
      companyId,
      channel,
      direction: channel === "note" ? null : "inbound",
      body: body.trim(),
      occurredAt: occurred,
    });
    if (created) {
      setBody("");
      toast.success("Vistað");
      await reload();
    } else {
      toast.error("Villa við vistun");
    }
    setSaving(false);
  };

  // group comms by day
  const groups = comms.reduce<Record<string, Communication[]>>((acc, c) => {
    const key = c.occurredAt.slice(0, 10);
    (acc[key] ||= []).push(c);
    return acc;
  }, {});
  const groupKeys = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Staða samtals</div>
            <p className="text-sm text-foreground">
              {status?.summary || <span className="text-muted-foreground italic">Engin samantekt ennþá — AI tekur saman í næstu dagskeyrslu.</span>}
            </p>
            {status?.lastCommAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Síðustu samskipti: {formatDayHeader(status.lastCommAt)} kl. {formatTime(status.lastCommAt)}
              </p>
            )}
          </div>
          {status?.needsReply && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-200 text-[11px] font-semibold px-2.5 py-1 shrink-0">
              <AlertCircle className="w-3 h-3" /> Svara þarf
            </span>
          )}
        </div>
        {status?.needsReply && status.needsReplyReason && (
          <p className="text-xs text-orange-300/90">{status.needsReplyReason}</p>
        )}
        {status?.needsReply && (
          <Button size="sm" onClick={handleMarkReplied} className="gap-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" /> Merkja sem svarað
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Hleð…</p>
        ) : comms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Engin samskipti skráð ennþá.</p>
        ) : (
          groupKeys.map((k) => (
            <div key={k} className="space-y-2">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground px-1">
                {formatDayHeader(groups[k][0].occurredAt)}
              </div>
              {groups[k].map((c) => {
                const Icon = CHANNEL_ICON[c.channel];
                const isOutbound = c.direction === "outbound";
                const isNote = c.channel === "note";
                const long = c.body.length > 240;
                const isOpen = !!expanded[c.id];
                const displayBody = long && !isOpen ? c.body.slice(0, 240) + "…" : c.body;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-xl border p-3 space-y-1.5 backdrop-blur-md",
                      isNote
                        ? "border-amber-400/30 bg-amber-500/5"
                        : isOutbound
                          ? "border-white/10 bg-white/5"
                          : "border-orange-400/30 bg-orange-500/5",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{channelLabel(c.channel)}</span>
                        <span className="opacity-40">·</span>
                        <span className={cn(
                          "font-semibold",
                          isNote ? "text-amber-300" : isOutbound ? "text-sky-300" : "text-orange-300",
                        )}>
                          {isNote ? "Glósa" : isOutbound ? "Frá mér" : "Frá þeim"}
                        </span>
                      </div>
                      <span className="text-muted-foreground">{formatTime(c.occurredAt)}</span>
                    </div>
                    {c.subject && <div className="font-semibold text-sm text-foreground">{c.subject}</div>}
                    <p className="text-sm text-foreground whitespace-pre-wrap">{displayBody}</p>
                    {long && (
                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [c.id]: !isOpen }))}
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {isOpen ? <><ChevronUp className="w-3 h-3" /> Sjá minna</> : <><ChevronDown className="w-3 h-3" /> Sjá meira</>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Paste conversation */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-3 space-y-2">
        <Label className="text-sm font-semibold">Líma samtal</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Límdu Messenger-þráð eða skrifaðu glósu…"
          rows={4}
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as CommChannel)}
            className="rounded-md border border-white/10 bg-background/50 px-2 py-1.5 text-sm"
          >
            <option value="messenger">Messenger</option>
            <option value="sms">SMS</option>
            <option value="note">Glósa</option>
          </select>
          <Input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="w-auto"
          />
          <Button
            onClick={handleSave}
            disabled={!body.trim() || saving}
            className="gap-1.5 bg-ember text-primary-foreground ml-auto"
          >
            <Send className="w-3.5 h-3.5" /> Vista
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">AI tekur saman stöðuna í næstu dagskeyrslu.</p>
      </div>
    </div>
  );
}