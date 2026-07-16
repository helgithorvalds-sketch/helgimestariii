import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings2, PhoneCall, Coffee, Sunrise, Mail, Check, X, RefreshCw, Bell } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/molten/GlassCard";
import { RingProgress } from "@/components/molten/RingProgress";
import { CountUp } from "@/components/molten/CountUp";
import { StatusPill } from "@/components/molten/StatusPill";
import { NotificationBell } from "@/components/NotificationBell";
import { LataVitaButton } from "@/components/LataVitaButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  DailySettings,
  ScheduleBlock,
  ensureSchedule,
  fetchBlocks,
  fetchDailySettings,
  todayISO,
  updateBlock,
  updateDailySettings,
  yesterdaySummary,
  deleteBlock,
} from "@/services/scheduleService";
import { fetchCompanies } from "@/services/companyService";
import type { Company } from "@/types";
import logo from "@/assets/logo.png";
import { NavLink } from "react-router-dom";

const KIND_META: Record<string, { label: string; Icon: any; tone: string }> = {
  prep: { label: "Undirbúningur", Icon: Sunrise, tone: "text-amber-300" },
  call: { label: "Símtal", Icon: PhoneCall, tone: "text-orange-300" },
  break: { label: "Hlé", Icon: Coffee, tone: "text-emerald-300" },
  followup: { label: "Eftirfylgni", Icon: Mail, tone: "text-sky-300" },
  email: { label: "Póstur", Icon: Mail, tone: "text-sky-300" },
  custom: { label: "Verk", Icon: Check, tone: "text-muted-foreground" },
};

const ICELANDIC_DAYS = ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"];
const ICELANDIC_MONTHS = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];

function formatIcelandicDate(d: Date) {
  return `${ICELANDIC_DAYS[d.getDay()]}, ${d.getDate()}. ${ICELANDIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Góða nótt";
  if (h < 12) return "Góðan daginn";
  if (h < 18) return "Góðan dag";
  return "Gott kvöld";
}

export default function Dagurinn() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<DailySettings | null>(null);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [summary, setSummary] = useState<{ callsDone: number; streak: number }>({ callsDone: 0, streak: 0 });

  const load = async () => {
    setLoading(true);
    const s = await fetchDailySettings();
    setSettings(s);
    const bs = await ensureSchedule(todayISO(), s);
    setBlocks(bs);
    const cs = await fetchCompanies();
    const map: Record<string, Company> = {};
    cs.forEach((c) => (map[c.id] = c));
    setCompanies(map);
    yesterdaySummary().then(setSummary);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = blocks.length;
  const doneCount = blocks.filter((b) => b.status !== "pending").length;
  const percent = total ? doneCount / total : 0;

  const setBlockStatus = async (id: string, status: ScheduleBlock["status"]) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    await updateBlock(id, { status });
  };

  const setBlockNotes = async (id: string, notes: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, notes } : b)));
  };
  const saveNotes = async (id: string, notes: string) => {
    await updateBlock(id, { notes });
  };

  const regenerate = async () => {
    if (!settings) return;
    if (!confirm("Endurgera dagsins áætlun? Núverandi blokkir tapast.")) return;
    setRegenerating(true);
    // delete today
    await Promise.all(blocks.map((b) => deleteBlock(b.id)));
    const bs = await ensureSchedule(todayISO(), settings);
    setBlocks(bs);
    setRegenerating(false);
    toast.success("Áætlun endurgerð");
  };

  const toggleVacation = async () => {
    if (!settings) return;
    const next = !settings.vacationMode;
    const updated = await updateDailySettings({ id: settings.id, vacationMode: next });
    if (updated) setSettings(updated);
  };

  const today = useMemo(() => new Date(), []);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <header className="px-4 md:px-8 pt-6 pb-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Landmannahellir" className="w-12 h-12 rounded-2xl shadow-ember" />
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Landmannahellir</div>
              <div className="text-lg font-display">{formatIcelandicDate(today)}</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <DesktopNav />
            <NotificationBell />
          </div>
          <div className="md:hidden">
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 space-y-6">
        {/* Hero */}
        <GlassCard strong className="p-6 md:p-8 relative overflow-hidden animate-fade-in">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-ember opacity-20 blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center gap-8 relative">
            <RingProgress value={percent} size={220} stroke={14} label={settings?.vacationMode ? "Í fríi" : "klárað í dag"} />
            <div className="flex-1 space-y-2 text-center md:text-left">
              <div className="text-sm text-muted-foreground">{greeting()}, Helgi</div>
              <h1 className="text-4xl md:text-5xl font-display leading-tight">
                {settings?.vacationMode ? (
                  <span className="ember-text">Þú ert í fríi</span>
                ) : (
                  <>
                    <CountUp to={doneCount} className="ember-text" /> af{" "}
                    <span className="text-foreground">{total}</span> klárað
                  </>
                )}
              </h1>
              <p className="text-muted-foreground max-w-md">
                {settings?.vacationMode
                  ? "Engin símtöl í dag. Njóttu."
                  : "Fylgdu áætluninni fyrir daginn — merktu hvern lið þegar honum er lokið."}
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                <SettingsSheet settings={settings} onSaved={setSettings} onToggleVacation={toggleVacation} onRegenerate={regenerate} regenerating={regenerating} />
                <Button variant="outline" onClick={() => navigate("/leads")} className="glass border-white/10 gap-2">
                  <PhoneCall className="w-4 h-4" /> Öll leads
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Timeline */}
        {loading ? (
          <GlassCard className="p-8 text-center text-muted-foreground">Hleð…</GlassCard>
        ) : settings?.vacationMode ? (
          <GlassCard className="p-12 text-center space-y-3">
            <div className="text-6xl">🌴</div>
            <div className="text-xl font-display">Í fríi</div>
            <p className="text-muted-foreground">Kveiktu aftur á áætluninni í stillingum þegar þú kemur aftur.</p>
          </GlassCard>
        ) : blocks.length === 0 ? (
          <GlassCard className="p-12 text-center space-y-3">
            <div className="text-xl font-display">Engin verkefni í dag</div>
            <p className="text-muted-foreground text-sm">Bættu leads við eða breyttu stillingum.</p>
            <Button onClick={regenerate} disabled={regenerating} className="bg-ember text-primary-foreground gap-2">
              <RefreshCw className="w-4 h-4" /> Búa til áætlun
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {blocks.map((b, i) => (
              <ScheduleBlockRow
                key={b.id}
                block={b}
                index={i}
                company={b.companyId ? companies[b.companyId] : undefined}
                onStatus={(s) => setBlockStatus(b.id, s)}
                onNotesChange={(n) => setBlockNotes(b.id, n)}
                onNotesBlur={(n) => saveNotes(b.id, n)}
              />
            ))}
          </div>
        )}

        {/* Yesterday strip */}
        <GlassCard className="p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Í gær</div>
              <div className="numbers-float text-3xl">
                <CountUp to={summary.callsDone} /> <span className="text-sm text-muted-foreground">símtöl</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Röð</div>
              <div className="numbers-float text-3xl ember-text">
                <CountUp to={summary.streak} /> <span className="text-sm text-muted-foreground not-italic">daga</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground max-w-xs text-center md:text-right">
            Röð telur samfellda daga þar sem áætlunin var kláruð eða merkt sem sleppt.
          </div>
        </GlassCard>
      </main>

    </div>
  );
}

function DesktopNav() {
  const items = [
    { to: "/", label: "Dagurinn", end: true },
    { to: "/leads", label: "Hringja" },
    { to: "/kanban", label: "Söluferli" },
    { to: "/tasks", label: "Verkefni" },
    { to: "/finances", label: "Fjármál" },
  ];
  return (
    <div className="glass rounded-full px-1.5 py-1.5 border-white/10 flex items-center gap-0.5">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
              isActive
                ? "ember-bg text-primary-foreground shadow-ember"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {it.label}
        </NavLink>
      ))}
    </div>
  );
}

function ScheduleBlockRow({
  block,
  index,
  company,
  onStatus,
  onNotesChange,
  onNotesBlur,
}: {
  block: ScheduleBlock;
  index: number;
  company?: Company;
  onStatus: (s: ScheduleBlock["status"]) => void;
  onNotesChange: (n: string) => void;
  onNotesBlur: (n: string) => void;
}) {
  const meta = KIND_META[block.kind] || KIND_META.custom;
  const Icon = meta.Icon;
  const isCall = block.kind === "call" || block.kind === "followup";
  const phone = company?.contacts?.[0]?.phone || company?.phone;

  return (
    <GlassCard
      className={cn(
        "p-4 md:p-5 flex flex-col md:flex-row gap-4 animate-fade-in",
        block.status === "done" && "opacity-70",
        block.status === "skipped" && "opacity-40",
      )}
      style={{ animationDelay: `${index * 40}ms` } as any}
    >
      {/* Time gutter */}
      <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-1 md:w-24 shrink-0">
        <div className="numbers-float text-2xl md:text-3xl">{block.blockTime}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{block.durationMin} mín</div>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className={cn("w-8 h-8 rounded-lg glass flex items-center justify-center", meta.tone)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{meta.label}</div>
            <div className="font-display text-lg truncate">{block.title}</div>
          </div>
          {company && isCall && <LataVitaButton company={company} />}
        </div>

        {isCall && company && (
          <div className="flex flex-wrap gap-2 text-xs">
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex items-center gap-1 glass px-2.5 py-1 rounded-full border-white/10 hover:border-orange-400/40">
                <PhoneCall className="w-3 h-3" /> {phone}
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1 glass px-2.5 py-1 rounded-full border-white/10">
                <Mail className="w-3 h-3" /> {company.email}
              </a>
            )}
            {company.companyId && (
              <span className="inline-flex items-center gap-1 glass px-2.5 py-1 rounded-full border-white/10 font-mono">
                {company.companyId}
              </span>
            )}
          </div>
        )}

        <Textarea
          value={block.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onBlur={(e) => onNotesBlur(e.target.value)}
          placeholder="Glósur…"
          rows={2}
          className="glass border-white/10 resize-none text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex md:flex-col gap-2 md:w-32 shrink-0">
        <Button
          size="sm"
          variant={block.status === "done" ? "default" : "outline"}
          className={cn("flex-1 gap-1", block.status === "done" ? "bg-emerald-500/80 hover:bg-emerald-500 text-white" : "glass border-white/10")}
          onClick={() => onStatus(block.status === "done" ? "pending" : "done")}
        >
          <Check className="w-3.5 h-3.5" /> Búið
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn("flex-1 gap-1 glass border-white/10", block.status === "skipped" && "border-amber-400/50 text-amber-300")}
          onClick={() => onStatus(block.status === "skipped" ? "pending" : "skipped")}
        >
          <X className="w-3.5 h-3.5" /> Sleppt
        </Button>
      </div>
    </GlassCard>
  );
}

function SettingsSheet({
  settings,
  onSaved,
  onToggleVacation,
  onRegenerate,
  regenerating,
}: {
  settings: DailySettings | null;
  onSaved: (s: DailySettings) => void;
  onToggleVacation: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [ws, setWs] = useState(settings?.workStart || "09:00");
  const [we, setWe] = useState(settings?.workEnd || "17:00");
  const [mc, setMc] = useState<number>(settings?.maxCalls || 10);

  useEffect(() => {
    if (settings) {
      setWs(settings.workStart);
      setWe(settings.workEnd);
      setMc(settings.maxCalls);
    }
  }, [settings]);

  const save = async () => {
    if (!settings) return;
    const s = await updateDailySettings({ id: settings.id, workStart: ws, workEnd: we, maxCalls: mc });
    if (s) {
      onSaved(s);
      toast.success("Stillingar vistaðar");
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="glass border-white/10 gap-2">
          <Settings2 className="w-4 h-4" /> Stillingar
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong border-white/10 space-y-5">
        <SheetHeader>
          <SheetTitle>Stillingar dagsins</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Byrjun</Label>
            <Input type="time" value={ws} onChange={(e) => setWs(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Endir</Label>
            <Input type="time" value={we} onChange={(e) => setWe(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Hámark símtala á dag</Label>
          <Input type="number" min={1} max={30} value={mc} onChange={(e) => setMc(Number(e.target.value) || 1)} />
        </div>
        <div className="flex items-center justify-between glass p-3 rounded-lg border-white/10">
          <div>
            <div className="text-sm font-medium">Frí / Vacation</div>
            <div className="text-xs text-muted-foreground">Pásar áætluninni</div>
          </div>
          <Switch checked={settings?.vacationMode || false} onCheckedChange={onToggleVacation} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={save} className="flex-1 bg-ember text-primary-foreground">Vista</Button>
          <Button variant="outline" onClick={onRegenerate} disabled={regenerating} className="gap-1">
            <RefreshCw className="w-4 h-4" /> Endurgera
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}