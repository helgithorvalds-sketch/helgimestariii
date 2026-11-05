import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Search, X, Phone, Mail, Globe, ExternalLink, MapPin, Pencil, Plus, Plane,
  Building, Tag, StickyNote, Check, BookmarkCheck, Bookmark, Download, ChevronDown, ChevronUp, MessageSquareQuote,
} from "lucide-react";
import { Company } from "@/types";
import { fetchCompanies, updateCompany, deleteCompany, addCompany, addCompanies } from "@/services/companyService";
import { CompanyModal } from "@/components/CompanyModal";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SVOR, FLOKKAR, VERD, TIER_LABEL, GEIRA_ROD, SVIF_FYRIRTAEKI_SOURCE,
  Flokkur, FlokkurTier, normName, svarToCompany, flokkurFor, matchesSvar, enrichWithSvar,
} from "@/data/svifFyrirtaekiSvor";

const OUTCOMES: { value: string; label: string; cls: string }[] = [
  { value: "interested", label: "Já / áhugi", cls: "border-emerald-400 text-emerald-700 dark:text-emerald-300" },
  { value: "call_again", label: "Spyr / fylgja eftir", cls: "border-amber-400 text-amber-700 dark:text-amber-300" },
  { value: "answered", label: "Svaraði", cls: "border-blue-400 text-blue-700 dark:text-blue-300" },
  { value: "no_answer", label: "Svaraði ekki", cls: "border-slate-400 text-slate-700 dark:text-slate-300" },
  { value: "rejected", label: "Nei", cls: "border-red-400 text-red-700 dark:text-red-300" },
];

const outcomeLabel = (v?: string | null) => OUTCOMES.find((o) => o.value === v)?.label || null;

type Sia = "allir" | "skrad" | "ja" | "spyr" | "bidur" | "nei";

const SIUR: { value: Sia; label: string }[] = [
  { value: "allir", label: "Allir" },
  { value: "skrad", label: "Skráð í bækling" },
  { value: "ja", label: "Já" },
  { value: "spyr", label: "Spyr" },
  { value: "bidur", label: "Bíða" },
  { value: "nei", label: "Nei" },
];

/** Staða svars eins og hún er lesin úr símtalaútkomu og off-merkingu. */
function stadaOf(c: Company): Exclude<Sia, "allir" | "skrad"> {
  if (c.rejected || c.lastCallOutcome === "rejected") return "nei";
  if (c.lastCallOutcome === "interested") return "ja";
  if (c.lastCallOutcome === "call_again") return "spyr";
  return "bidur";
}

const STADA_PILL: Record<Exclude<Sia, "allir" | "skrad">, { label: string; cls: string }> = {
  ja: { label: "Já", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" },
  spyr: { label: "Spyr", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  bidur: { label: "Bíður", cls: "bg-muted text-muted-foreground" },
  nei: { label: "Nei", cls: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" },
};

const TIER_PILL: Record<FlokkurTier, string> = {
  laus: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  einn: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  keppni: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
};

const kr = (n: number) => n.toLocaleString("is-IS");

export default function SvifListi() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sia, setSia] = useState<Sia>("allir");
  const [selected, setSelected] = useState<Company | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [showFlokkar, setShowFlokkar] = useState(true);
  const [importing, setImporting] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const toggleSet = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const load = async () => {
    const list = await fetchCompanies();
    setCompanies(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const svifFyrirtæki = useMemo(
    () => companies.filter((c) => c.stage === "svif_fyrirtæki" && c.leadSource === SVIF_FYRIRTAEKI_SOURCE),
    [companies]
  );

  /**
   * Svör úr herferðinni sem vantar á þessa síðu, og fyrirtæki sem eru þegar hér
   * (t.d. skráð eftir símtal) en vantar geira, undirgeira eða svarið sjálft.
   */
  const { missingSvor, enrichable } = useMemo(() => {
    const missing: typeof SVOR = [];
    const enrich: { c: Company; s: typeof SVOR[number] }[] = [];
    for (const s of SVOR) {
      const c = svifFyrirtæki.find((x) => matchesSvar(x, s));
      if (!c) missing.push(s);
      else if (!c.category || !c.pitch) enrich.push({ c, s });
    }
    return { missingSvor: missing, enrichable: enrich };
  }, [svifFyrirtæki]);
  const importCount = missingSvor.length + enrichable.length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return svifFyrirtæki.filter((c) => {
      if (sia === "skrad" && !c.registeredInSvif) return false;
      if (sia !== "allir" && sia !== "skrad" && stadaOf(c) !== sia) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.owner || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q) ||
        (c.industry || "").toLowerCase().includes(q) ||
        (c.pitch || "").toLowerCase().includes(q) ||
        (c.notes || "").toLowerCase().includes(q) ||
        (c.contacts || []).some((p) => (p.name || "").toLowerCase().includes(q) || (p.phone || "").includes(q))
      );
    });
  }, [svifFyrirtæki, search, sia]);

  const counts = useMemo(() => {
    const n = { skrad: 0, ja: 0, spyr: 0, bidur: 0, nei: 0 };
    for (const c of svifFyrirtæki) {
      if (c.registeredInSvif) n.skrad++;
      n[stadaOf(c)]++;
    }
    return n;
  }, [svifFyrirtæki]);

  /** Flokkakortið: hvert pláss með þeim sem sækja um það. */
  const flokkayfirlit = useMemo(() => {
    const byUndir = new Map<string, Company[]>();
    for (const c of svifFyrirtæki) {
      const key = normName(c.category || "");
      if (!key) continue;
      byUndir.set(key, [...(byUndir.get(key) || []), c]);
    }
    const known = new Set(FLOKKAR.map((f) => normName(f.undirgeiri)));
    const extra: Flokkur[] = [...byUndir.keys()]
      .filter((k) => !known.has(k))
      .map((k) => ({ geiri: byUndir.get(k)![0].industry || "Annað", undirgeiri: byUndir.get(k)![0].category!, tier: "einn" }));
    const all: Flokkur[] = [...FLOKKAR, ...extra];
    const geirar = [...GEIRA_ROD, ...all.map((f) => f.geiri).filter((g) => !GEIRA_ROD.includes(g))];
    return geirar
      .map((geiri) => ({
        geiri,
        rows: all
          .filter((f) => f.geiri === geiri)
          .map((f) => ({ ...f, companies: byUndir.get(normName(f.undirgeiri)) || [] })),
      }))
      .filter((g) => g.rows.length > 0);
  }, [svifFyrirtæki]);

  const manadartekjur = useMemo(() => {
    let sum = 0;
    for (const c of svifFyrirtæki) {
      if (!c.registeredInSvif) continue;
      const f = flokkurFor(c.category);
      sum += VERD[f?.tier || "einn"].ein;
    }
    return sum;
  }, [svifFyrirtæki]);

  const handleImport = async () => {
    if (importCount === 0) return;
    setImporting(true);
    try {
      const created = await addCompanies(missingSvor.map(svarToCompany));
      if (!created) {
        toast.error("Innflutningur mistókst");
        return;
      }
      let updated = 0;
      const saved: Company[] = [];
      for (const { c, s } of enrichable) {
        const res = await updateCompany(enrichWithSvar(c, s));
        if (res) { saved.push(res); updated++; }
      }
      setCompanies((prev) => [
        ...prev.map((c) => saved.find((x) => x.id === c.id) || c),
        ...created,
      ]);
      if (updated < enrichable.length) toast.error(`${enrichable.length - updated} fyrirtæki tókst ekki að uppfæra`);
      toast.success(
        [created.length ? `${created.length} svör flutt inn` : "", updated ? `${updated} fyrirtæki uppfærð` : ""]
          .filter(Boolean).join(" · ")
      );
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = async (company: Omit<Company, "id" | "createdAt">) => {
    const created = await addCompany({
      ...company,
      stage: "svif_fyrirtæki",
      leadSource: SVIF_FYRIRTAEKI_SOURCE,
    });
    if (created) {
      setCompanies((prev) => [...prev, created]);
      toast.success("Fyrirtæki skráð í Svif fyrirtæki");
    } else {
      toast.error("Villa við vistun");
    }
    setAddOpen(false);
  };

  const handleUpdate = async (updated: Company) => {
    const saved = await updateCompany({
      ...updated,
      stage: "svif_fyrirtæki",
      leadSource: SVIF_FYRIRTAEKI_SOURCE,
    });
    if (saved) {
      setCompanies((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      toast.success("Vistað!");
    } else {
      toast.error("Villa við vistun");
    }
    setSelected(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteCompany(id);
    if (ok) {
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      toast.success("Eytt");
    } else {
      toast.error("Villa við eyðingu");
    }
    setSelected(null);
  };

  const toggleRegistered = async (c: Company) => {
    const next = !c.registeredInSvif;
    setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, registeredInSvif: next } : x)));
    const { error } = await supabase.from("companies").update({ registered_in_svif: next }).eq("id", c.id);
    if (error) {
      setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, registeredInSvif: c.registeredInSvif } : x)));
      return toast.error("Villa við vistun");
    }
    toast.success(next ? `${c.name} skráð í bæklinginn` : `${c.name} tekið úr bæklingnum`);
  };

  const setOutcome = async (c: Company, outcome: string) => {
    const next = (c.lastCallOutcome === outcome ? null : outcome) as Company["lastCallOutcome"];
    setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, lastCallOutcome: next } : x)));
    const { error } = await supabase.from("companies").update({ last_call_outcome: next }).eq("id", c.id);
    if (error) {
      setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, lastCallOutcome: c.lastCallOutcome } : x)));
      return toast.error("Villa við vistun");
    }
    if (next) {
      const { error: cErr } = await supabase.from("communications").insert({
        company_id: c.id,
        channel: "símtal",
        direction: "outbound",
        subject: `Símtal – ${outcomeLabel(next)}`,
        body: `Útkoma: ${outcomeLabel(next)}`,
      });
      if (cErr) console.error("communications insert", cErr);
      toast.success(`Skráð: ${outcomeLabel(next)}`);
    }
  };

  const saveNotes = (c: Company, value: string) => {
    setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, notes: value } : x)));
    clearTimeout(timers.current[c.id]);
    timers.current[c.id] = setTimeout(async () => {
      const { error } = await supabase.from("companies").update({ notes: value }).eq("id", c.id);
      if (error) toast.error("Villa við vistun glósu");
    }, 700);
  };

  const renderCard = (c: Company) => {
    const stada = stadaOf(c);
    const flokkur = flokkurFor(c.category);
    const tier = flokkur?.tier;
    const sameSlot = tier
      ? svifFyrirtæki.filter((x) => x.id !== c.id && normName(x.category || "") === normName(c.category || "") && stadaOf(x) !== "nei")
      : [];
    return (
      <div
        key={c.id}
        className={cn(
          "rounded-xl border-2 bg-card shadow-sm p-4 space-y-3",
          c.registeredInSvif
            ? "border-emerald-500 ring-2 ring-emerald-300/50 bg-emerald-50/40 dark:bg-emerald-950/15 dark:border-emerald-600 dark:ring-emerald-800/60"
            : stada === "nei"
              ? "border-red-200 opacity-75 dark:border-red-900"
              : "border-border"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base truncate">{c.name}</h3>
              {c.registeredInSvif && (
                <span className="text-xs font-bold uppercase rounded px-1.5 py-0.5 bg-emerald-600 text-white">Skráð</span>
              )}
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", STADA_PILL[stada].cls)}>{STADA_PILL[stada].label}</span>
            </div>
            {c.owner && <p className="text-sm font-medium text-primary">{c.owner}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => toggleSet(openNotes, c.id, setOpenNotes)} aria-label="Glósa">
              <StickyNote className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSelected(c)} aria-label="Breyta">
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {(c.industry || c.category) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Tag className="w-3 h-3" />{c.industry}</span>
            {c.category && <span className="font-semibold">› {c.category}</span>}
            {tier && (
              <span className={cn("font-bold px-2 py-0.5 rounded-full", TIER_PILL[tier])}>
                {TIER_LABEL[tier]} · {kr(VERD[tier].ein)} kr.
              </span>
            )}
          </div>
        )}
        {sameSlot.length > 0 && (
          <p className="text-xs text-orange-700 dark:text-orange-300">
            Sækja um sama pláss: {sameSlot.map((x) => x.name).join(", ")}
          </p>
        )}

        {c.pitch && (
          <div className="rounded-md border-l-4 border-primary/50 bg-muted/40 text-sm p-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-0.5"><MessageSquareQuote className="w-3 h-3" />Svarið</span>
            {c.pitch}
          </div>
        )}

        {c.address && (
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{c.address}</span>
          </div>
        )}
        {c.phone && (
          <div className="flex items-center gap-1.5 text-sm">
            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="font-medium hover:underline">{c.phone}</a>
          </div>
        )}
        {c.email && (
          <div className="flex items-center gap-1.5 text-sm">
            <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <a href={`mailto:${c.email}`} className="font-medium hover:underline truncate">{c.email}</a>
          </div>
        )}

        {(c.contacts || []).length > 0 && (
          <div className="space-y-1 pt-1 border-t border-dashed">
            {(c.contacts || []).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs bg-muted/40 rounded-md px-2 py-1">
                {p.name && <span className="font-semibold">{p.name}</span>}
                {p.phone && <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="hover:underline">{p.phone}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="text-primary hover:underline truncate">{p.email}</a>}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {c.websiteUrl && (
            <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
              <Globe className="w-3 h-3" />{c.websiteUrl.replace(/^https?:\/\//, "")}<ExternalLink className="w-3 h-3" />
            </a>
          )}
          <a
            href={c.companyId
              ? `https://www.skatturinn.is/fyrirtaekjaskra/leit/kennitala/${c.companyId}`
              : `https://www.rsk.is/fyrirtaekjaskra/leit/?nafn=${encodeURIComponent(c.name)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted"
          >
            <Building className="w-3 h-3" />Fyrirtækjaskrá<ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex flex-wrap gap-1.5 pl-1">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              onClick={() => setOutcome(c, o.value)}
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-full border-2 transition-all hover:scale-[1.03]",
                o.cls,
                c.lastCallOutcome === o.value ? "bg-muted" : "bg-transparent"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        {openNotes.has(c.id) ? (
          <Textarea
            value={c.notes || ""}
            onChange={(e) => saveNotes(c, e.target.value)}
            rows={5}
            placeholder="Glósa…"
            className="text-sm"
          />
        ) : (
          c.notes && (
            <div className="rounded-md bg-muted/40 border text-xs p-2 whitespace-pre-wrap">
              <span className="font-semibold block mb-0.5">Glósur</span>
              {c.notes}
            </div>
          )
        )}

        <Button
          size="sm"
          className={cn(
            "w-full gap-1.5",
            c.registeredInSvif
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-background text-emerald-700 border border-emerald-500/60 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          )}
          onClick={() => toggleRegistered(c)}
        >
          {c.registeredInSvif
            ? <><BookmarkCheck className="w-4 h-4" />Skráð í bæklinginn</>
            : <><Bookmark className="w-4 h-4" />Skrá í bæklinginn</>}
        </Button>
      </div>
    );
  };

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
                <Plane className="w-7 h-7 text-primary" />
                Svif fyrirtæki
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {svifFyrirtæki.length} fyrirtæki · {counts.skrad} skráð í bækling · {counts.ja} já · {counts.spyr} spyrja · {counts.bidur} bíða · {counts.nei} nei
                {counts.skrad > 0 && <> · {kr(manadartekjur)} kr. á mánuði</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Leita..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 w-64 h-9 text-sm"
              />
              {search && (
                <Button variant="ghost" size="icon" onClick={() => setSearch("")} className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {importCount > 0 && (
              <Button variant="outline" onClick={handleImport} disabled={importing} className="gap-2">
                <Download className="w-4 h-4" />
                {importing
                  ? "Flyt inn..."
                  : [
                      missingSvor.length ? `Flytja inn ${missingSvor.length} svör` : "",
                      enrichable.length ? `uppfæra ${enrichable.length}` : "",
                    ].filter(Boolean).join(" · ")}
              </Button>
            )}
            <Button onClick={() => setAddOpen(true)} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Nýtt fyrirtæki
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Hleð...</p></div>
        ) : svifFyrirtæki.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-12 text-center">
            <Plane className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold text-lg">Engin fyrirtæki í Svif fyrirtæki</p>
            <p className="text-sm text-muted-foreground mt-1">
              {importCount > 0
                ? `Ýttu á „Flytja inn ${missingSvor.length} svör“ til að sækja svörin úr herferðinni, eða skráðu fyrirtæki með „Nýtt fyrirtæki“.`
                : "Skráðu fyrsta fyrirtækið með „Nýtt fyrirtæki“."}
            </p>
          </div>
        ) : (
          <>
            <section className="rounded-xl border bg-card shadow-sm">
              <button
                onClick={() => setShowFlokkar((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="font-bold">Flokkakort · hvað er laust og hverjir keppa</span>
                {showFlokkar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFlokkar && (
                <div className="px-4 pb-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Einn í flokki: {kr(VERD.einn.ein)} kr. (2 síður {kr(VERD.einn.tvaer)}). Keppni, tveir eða fleiri: {kr(VERD.keppni.ein)} kr. (2 síður {kr(VERD.keppni.tvaer)}). Lausir flokkar eru til sölu á {kr(VERD.laus.ein)} kr.
                  </p>
                  {flokkayfirlit.map((g) => (
                    <div key={g.geiri}>
                      <h3 className="text-sm font-bold mb-1.5">{g.geiri}</h3>
                      <div className="divide-y rounded-lg border">
                        {g.rows.map((f) => (
                          <div key={f.undirgeiri} className="grid grid-cols-1 md:grid-cols-[1.4fr_auto_2fr] gap-x-3 gap-y-1 px-3 py-2 text-sm items-start">
                            <div>
                              <span className="font-semibold">{f.undirgeiri}</span>
                              {f.note && <p className="text-xs text-muted-foreground">{f.note}</p>}
                            </div>
                            <span className={cn("justify-self-start text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap", TIER_PILL[f.tier])}>
                              {TIER_LABEL[f.tier]} · {kr(VERD[f.tier].ein)}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {f.companies.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Enginn sækir um</span>
                              ) : f.companies.map((c) => {
                                const s = stadaOf(c);
                                return (
                                  <button
                                    key={c.id}
                                    onClick={() => { setSearch(c.name); setSia("allir"); }}
                                    className={cn(
                                      "text-xs rounded-full border px-2 py-0.5 hover:bg-muted",
                                      c.registeredInSvif && "border-emerald-500 bg-emerald-50 font-semibold dark:bg-emerald-950/40",
                                      s === "nei" && "line-through text-muted-foreground",
                                    )}
                                    title={STADA_PILL[s].label}
                                  >
                                    {c.registeredInSvif && <Check className="inline w-3 h-3 mr-0.5 text-emerald-600" />}
                                    {c.name}
                                    {s === "spyr" && <span className="text-amber-600"> ?</span>}
                                    {s === "bidur" && <span className="text-muted-foreground"> (bíður)</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-wrap gap-1.5">
              {SIUR.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSia(s.value)}
                  className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full border-2 transition-all",
                    sia === s.value ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border hover:bg-muted"
                  )}
                >
                  {s.label}
                  <span className="ml-1 opacity-70">
                    {s.value === "allir" ? svifFyrirtæki.length : s.value === "skrad" ? counts.skrad : counts[s.value]}
                  </span>
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground italic px-1">Ekkert fyrirtæki passar við síuna.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map(renderCard)}
              </div>
            )}
          </>
        )}
      </main>

      {selected && (
        <CompanyModal
          company={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      <AddCompanyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        existingNames={companies.map((c) => c.name)}
        existingCompanyIds={companies.map((c) => c.companyId).filter(Boolean)}
      />
    </div>
  );
}
