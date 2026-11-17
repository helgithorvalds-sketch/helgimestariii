import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, X, Phone, Mail, Globe, Clapperboard, ChevronDown, ChevronRight, PhoneCall, Check, Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Company } from "@/types";
import { addCompany, fetchCompanies } from "@/services/companyService";
import { HERFERD, HerferdFyrirtaeki, HerferdStada, STADA_LABEL } from "@/data/myndbandaHerferd";
import { efnislina, postur } from "@/data/myndbandaPostur";

const MYNDBOND_SOURCE = "myndbond";

const STADA_PILL: Record<HerferdStada, string> = {
  ja: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  spurning: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  nei: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  sent: "bg-muted text-muted-foreground",
  sjalfvirkt: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  skopp: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  osent: "bg-muted text-muted-foreground",
};

const CARD_RING: Partial<Record<HerferdStada, string>> = {
  ja: "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/15 dark:border-emerald-700",
  spurning: "border-amber-400 bg-amber-50/40 dark:bg-amber-950/15 dark:border-amber-700",
  nei: "border-red-200 opacity-80 dark:border-red-900",
  sjalfvirkt: "border-sky-200 dark:border-sky-900",
  skopp: "border-zinc-300 opacity-80 dark:border-zinc-700",
};

/** Röðun svaranna: já fyrst, svo spurningar, svo nei. */
const SVAR_ROD: HerferdStada[] = ["ja", "spurning", "nei", "sjalfvirkt", "skopp"];

const FILTERS: (HerferdStada | "allt" | "svarad")[] = ["allt", "svarad", "ja", "spurning", "nei", "sent", "sjalfvirkt", "skopp"];

const tel = (s: string) => s.replace(/[^\d+]/g, "");
const norm = (s: string) => s.toLowerCase().replace(/\b(ehf|hf|slf|sf)\.?/g, "").replace(/[^\p{L}\p{N}]/gu, "");
const synaTima = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("is-IS", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

function tilCompany(f: HerferdFyrirtaeki): Omit<Company, "id" | "createdAt"> {
  const s = f.svarandi;
  const contacts = [
    ...(s?.nafn ? [{ id: crypto.randomUUID(), name: s.titill ? `${s.nafn}, ${s.titill}` : s.nafn, phone: s.simi || "", email: s.netfang || undefined }] : []),
    ...(f.person && f.person !== s?.nafn ? [{ id: crypto.randomUUID(), name: f.title ? `${f.person}, ${f.title}` : f.person, phone: f.phone || "", email: f.email }] : []),
  ];
  return {
    name: f.name,
    owner: s?.nafn || f.person || "",
    companyId: "",
    websiteUrl: `https://${f.web}`,
    phone: s?.simi || f.phone || undefined,
    email: s?.netfang || f.email,
    industry: f.sector,
    category: "Myndband",
    leadSource: MYNDBOND_SOURCE,
    stage: "lead",
    pitch: [f.samantekt, f.naest ? `Næst: ${f.naest}` : ""].filter(Boolean).join("\n"),
    lastCallOutcome: f.stada === "ja" ? "interested" : "call_again",
    estimatedPrice: 0,
    contacts,
    checklist: [],
    notes: [
      `Myndbandaherferð: svaraði ${STADA_LABEL[f.stada].toLowerCase()}${f.svor?.[0] ? ` ${f.svor[0].dags}` : ""}.`,
      `Hugmynd að myndbandi (úr rannsókninni, ekki í póstinum): ${f.idea}`,
    ].join("\n"),
    personalityDescription: "",
    previewSent: false,
    projectedEarnings: 0,
    monthlyPaymentActive: false,
  };
}

export default function Myndbond() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("allt");
  const [sector, setSector] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [opinnPostur, setOpinnPostur] = useState<Set<string>>(new Set());
  const [crm, setCrm] = useState<Company[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies().then(setCrm);
  }, []);

  const allir = HERFERD.fyrirtaeki;
  const sendir = allir.filter((f) => f.stada !== "osent");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of allir) c[f.stada] = (c[f.stada] || 0) + 1;
    c.svarad = (c.ja || 0) + (c.spurning || 0) + (c.nei || 0);
    return c;
  }, [allir]);

  const geirar = useMemo(() => Array.from(new Set(allir.map((f) => f.sector))).sort((a, b) => a.localeCompare(b, "is")), [allir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allir.filter((f) => {
      if (filter === "svarad" && !["ja", "spurning", "nei"].includes(f.stada)) return false;
      if (filter !== "allt" && filter !== "svarad" && f.stada !== filter) return false;
      if (sector && f.sector !== sector) return false;
      if (!q) return true;
      return [f.name, f.web, f.person, f.email, f.phone, f.svarandi?.nafn, f.what]
        .some((x) => (x || "").toLowerCase().includes(q));
    });
  }, [allir, search, filter, sector]);

  const svor = useMemo(
    () =>
      filtered
        .filter((f) => SVAR_ROD.includes(f.stada) && (f.svor?.length || f.stada === "skopp"))
        .sort((a, b) => SVAR_ROD.indexOf(a.stada) - SVAR_ROD.indexOf(b.stada) || b.score - a.score),
    [filtered]
  );

  const iCrm = (f: HerferdFyrirtaeki) => crm.find((c) => norm(c.name) === norm(f.name) && c.leadSource === MYNDBOND_SOURCE);

  const setjaAHringilista = async (f: HerferdFyrirtaeki) => {
    setSaving(f.web);
    const created = await addCompany(tilCompany(f));
    setSaving(null);
    if (!created) return toast.error("Villa við vistun");
    setCrm((prev) => [...prev, created]);
    toast.success(`${f.name} er komið á hringilistann`);
  };

  const toggle = (set: Set<string>, key: string, update: (s: Set<string>) => void) => {
    const n = new Set(set);
    n.has(key) ? n.delete(key) : n.add(key);
    update(n);
  };

  const renderPostur = (f: HerferdFyrirtaeki) => (
    <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-2">
      <p className="font-semibold">Efni: {efnislina(f)}</p>
      <p className="text-muted-foreground">Til: {f.email}{f.sent ? ` · sent ${synaTima(f.sent)}` : ""}</p>
      <pre className="whitespace-pre-wrap font-sans leading-relaxed">{postur(f)}</pre>
    </div>
  );

  const renderSvarKort = (f: HerferdFyrirtaeki) => {
    const s = f.svarandi;
    const simi = s?.simi || f.phone;
    const komid = iCrm(f);
    return (
      <div key={f.web + f.email} className={cn("rounded-xl border-2 bg-card shadow-sm p-4 space-y-2", CARD_RING[f.stada] || "border-border")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-bold text-base">{f.name}</h3>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", STADA_PILL[f.stada])}>{STADA_LABEL[f.stada]}</span>
              {komid && <span className="text-[11px] font-bold uppercase rounded px-1.5 py-0.5 bg-primary text-primary-foreground">Á hringilista</span>}
            </div>
            <p className="text-xs text-muted-foreground">{f.sector} · {f.what}</p>
            {(s?.nafn || f.person) && (
              <p className="text-sm font-medium text-primary mt-0.5">
                {s?.nafn || f.person}{(s?.titill || (!s?.nafn && f.title)) ? `, ${s?.titill || f.title}` : ""}
              </p>
            )}
          </div>
        </div>

        {f.samantekt && <p className="text-sm">{f.samantekt}</p>}
        {(f.svor || []).map((r, i) => (
          <div key={i} className="rounded-md bg-muted/50 border px-3 py-2 text-xs space-y-1">
            <p className="text-muted-foreground font-medium">{r.dags} · {r.fra}</p>
            <p>{r.samantekt}</p>
            {r.tilvitnun && (
              <p className="italic flex gap-1.5"><Quote className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground" />{r.tilvitnun}</p>
            )}
          </div>
        ))}
        {f.naest && <p className="text-xs font-semibold text-primary">Næst: {f.naest}</p>}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {simi && (
            <a href={`tel:${tel(simi)}`} className="inline-flex items-center gap-1 font-semibold hover:underline">
              <Phone className="w-3 h-3 text-destructive" />{simi}
              {!s?.simi && f.phone_note && <span className="font-normal text-muted-foreground">({f.phone_note})</span>}
            </a>
          )}
          <a href={`mailto:${s?.netfang || f.email}`} className="inline-flex items-center gap-1 font-medium hover:underline min-w-0 truncate">
            <Mail className="w-3 h-3 text-primary" />{s?.netfang || f.email}
          </a>
          <a href={`https://${f.web}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">
            <Globe className="w-3 h-3 text-muted-foreground" />{f.web}
          </a>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 border-t">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => toggle(opinnPostur, f.email, setOpinnPostur)}>
            <Mail className="w-3.5 h-3.5" />{opinnPostur.has(f.email) ? "Fela póstinn" : "Pósturinn sem fór"}
          </Button>
          {(f.stada === "ja" || f.stada === "spurning") && (
            komid ? (
              <Button size="sm" variant="secondary" className="gap-1" onClick={() => navigate("/leads")}>
                <Check className="w-3.5 h-3.5" />Á hringilista
              </Button>
            ) : (
              <Button size="sm" className="gap-1" disabled={saving === f.web} onClick={() => setjaAHringilista(f)}>
                <PhoneCall className="w-3.5 h-3.5" />Setja á hringilista
              </Button>
            )
          )}
        </div>
        {opinnPostur.has(f.email) && renderPostur(f)}
      </div>
    );
  };

  const KPI: { key: (typeof FILTERS)[number]; label: string; n: number; cls?: string }[] = [
    { key: "allt", label: "Sent", n: sendir.length },
    { key: "svarad", label: "Svöruðu", n: counts.svarad || 0 },
    { key: "ja", label: "Já", n: counts.ja || 0, cls: "text-emerald-700 dark:text-emerald-400" },
    { key: "spurning", label: "Spurning", n: counts.spurning || 0, cls: "text-amber-700 dark:text-amber-400" },
    { key: "nei", label: "Nei", n: counts.nei || 0, cls: "text-red-700 dark:text-red-400" },
    { key: "skopp", label: "Skoppaði", n: counts.skopp || 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Til baka
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                <Clapperboard className="w-7 h-7 text-primary" />
                Myndbönd
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {HERFERD.heiti} · {allir.length} fyrirtæki, {sendir.length} send · frá {HERFERD.fra}
                {HERFERD.yfirfarid && <> · pósthólf yfirfarið {synaTima(HERFERD.yfirfarid)}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              aria-label="Geiri"
            >
              <option value="">Allir geirar</option>
              {geirar.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Leita..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-8 w-64 h-9 text-sm" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Hreinsa leit">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {KPI.map((k) => (
            <button
              key={k.key}
              onClick={() => setFilter(filter === k.key ? "allt" : k.key)}
              className={cn(
                "rounded-xl border-2 bg-card p-3 text-left shadow-sm transition-colors",
                filter === k.key && k.key !== "allt" ? "border-primary" : "border-border hover:border-primary/40"
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground">{k.label}</p>
              <p className={cn("text-2xl font-extrabold tabular-nums", k.cls)}>{k.n}</p>
            </button>
          ))}
        </div>

        {allir.length === 0 ? (
          <p className="text-muted-foreground">Enginn póstur farinn enn.</p>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-bold mb-3">Svör <span className="text-muted-foreground font-medium">({svor.length})</span></h2>
              {svor.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Engin svör enn.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{svor.map(renderSvarKort)}</div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <h2 className="text-lg font-bold">Öll fyrirtæki í herferðinni <span className="text-muted-foreground font-medium">({filtered.length})</span></h2>
                <div className="flex flex-wrap gap-1">
                  {FILTERS.map((k) => (
                    <button
                      key={k}
                      onClick={() => setFilter(k)}
                      className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", filter === k ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted")}
                    >
                      {k === "allt" ? "Allt" : k === "svarad" ? "Svöruðu" : STADA_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-card divide-y">
                {filtered.map((f) => {
                  const lykill = f.web + f.email;
                  const opid = open.has(lykill);
                  return (
                    <div key={lykill}>
                      <button
                        onClick={() => toggle(open, lykill, setOpen)}
                        className="w-full grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_auto_auto] items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
                      >
                        {opid ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <span className="min-w-0">
                          <span className="font-semibold">{f.name}</span>
                          <span className="block text-xs text-muted-foreground truncate">{f.sector}</span>
                        </span>
                        <span className="hidden md:block min-w-0 text-xs truncate">{f.person ? `${f.person}${f.title ? `, ${f.title}` : ""}` : "—"}</span>
                        <span className="hidden md:block min-w-0 text-xs truncate">
                          {f.email}{f.phone && <span className="text-muted-foreground"> · {f.phone}</span>}
                        </span>
                        <span className="hidden md:block text-xs tabular-nums text-muted-foreground" title="Líkur á já (1–10)">{f.score}/10</span>
                        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap", STADA_PILL[f.stada])}>{STADA_LABEL[f.stada]}</span>
                      </button>
                      {opid && (
                        <div className="px-10 pb-4 space-y-2 text-sm">
                          <p className="text-xs text-muted-foreground md:hidden">
                            {f.person ? `${f.person}${f.title ? `, ${f.title}` : ""} · ` : ""}{f.email}{f.phone ? ` · ${f.phone}` : ""}
                          </p>
                          <p><span className="font-semibold">Hvað þau gera:</span> {f.what}</p>
                          <p><span className="font-semibold">Af hverju valin ({f.score}/10):</span> {f.why}</p>
                          {f.samantekt && <p><span className="font-semibold">Samtalið:</span> {f.samantekt}</p>}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            {f.phone && <a href={`tel:${tel(f.phone)}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="w-3 h-3" />{f.phone}{f.phone_note ? ` (${f.phone_note})` : ""}</a>}
                            <a href={`https://${f.web}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><Globe className="w-3 h-3" />{f.web}</a>
                            {f.email_source && <a href={f.email_source} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">hvar netfangið fannst</a>}
                          </div>
                          {renderPostur(f)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
