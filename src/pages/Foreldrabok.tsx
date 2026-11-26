import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Search, Phone, ChevronDown, ChevronRight, StickyNote, Baby, Check, ExternalLink, User, MapPin, Gift, BadgeCheck, CircleDashed,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Foreldrabók: fyrirtæki sem gætu keypt pláss í bæklingi fyrir nýbakaða foreldra.
 * Hver röð í `companies` (lead_source = "foreldrabok") er eitt fyrirtæki í einum flokki.
 * Sama fyrirtæki getur verið í mörgum flokkum; hringingar og glósur fylgja fyrirtækinu í alla flokka þess.
 * industry = „G7 · Heilsa barna“, category = „G7-09 · Barnatannlæknar“, address = svæði,
 * pitch = lýsing (lína 1) og svo línur eins og „Afsláttur: …“, „Tegund: …“, „Staðfest: já“, „Lykill: …“.
 */
const LEAD_SOURCE = "foreldrabok";

interface Row {
  id: string;
  name: string;
  owner: string;
  phone: string | null;
  website_url: string | null;
  ja_url: string | null;
  industry: string | null;
  category: string | null;
  address: string | null;
  pitch: string | null;
  notes: string;
  svif_valid: boolean;
  last_call_outcome: string | null;
}

interface Info {
  desc: string;
  offer: string;
  type: string;
  verified: boolean;
  phone2: string;
  phoneSrc: string;
  ownerSrc: string;
  key: string;
}

const OUTCOMES: { value: string; label: string; cls: string }[] = [
  { value: "answered", label: "Svaraði", cls: "border-blue-400 text-blue-700 dark:text-blue-300" },
  { value: "no_answer", label: "Svaraði ekki", cls: "border-amber-400 text-amber-700 dark:text-amber-300" },
  { value: "interested", label: "Áhugi", cls: "border-emerald-400 text-emerald-700 dark:text-emerald-300" },
  { value: "rejected", label: "Ekki áhugi", cls: "border-red-400 text-red-700 dark:text-red-300" },
  { value: "call_again", label: "Hringja aftur", cls: "border-purple-400 text-purple-700 dark:text-purple-300" },
];
const outcomeLabel = (v?: string | null) => OUTCOMES.find((o) => o.value === v)?.label || null;

const fold = (s: string) =>
  (s || "").toLowerCase().replace(/þ/g, "th").replace(/ð/g, "d").replace(/æ/g, "ae").replace(/ö/g, "o")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");

const NORTH = /akureyri|norðurland|nordurland|húsavík|husavik|siglufj|dalvík|dalvik|ólafsfj|olafsfj/i;

function parsePitch(p: string | null, fallbackKey: string): Info {
  const info: Info = { desc: "", offer: "", type: "", verified: false, phone2: "", phoneSrc: "", ownerSrc: "", key: fallbackKey };
  (p || "").split("\n").forEach((line, i) => {
    if (i === 0) { info.desc = line.trim(); return; }
    const m = line.match(/^(Afsláttur|Tegund|Staðfest|Sími 2|Sími frá|Eigandi frá|Lykill):\s*(.*)$/);
    if (!m) return;
    const v = m[2].trim();
    if (m[1] === "Afsláttur") info.offer = v;
    else if (m[1] === "Tegund") info.type = v;
    else if (m[1] === "Staðfest") info.verified = v.toLowerCase().startsWith("já");
    else if (m[1] === "Sími 2") info.phone2 = v;
    else if (m[1] === "Sími frá") info.phoneSrc = v;
    else if (m[1] === "Eigandi frá") info.ownerSrc = v;
    else if (m[1] === "Lykill" && v) info.key = v;
  });
  return info;
}

/** „G7-09 · Barnatannlæknar“ → { id: "G7-09", title: "Barnatannlæknar" } */
function splitLabel(s: string | null) {
  const m = (s || "").match(/^([A-Z0-9-]+)\s*·\s*(.*)$/);
  return m ? { id: m[1], title: m[2] } : { id: "", title: s || "Óflokkað" };
}

const telHref = (p: string) => `tel:+354${p.replace(/\D/g, "")}`;
const natural = (a: string, b: string) => a.localeCompare(b, "is", { numeric: true });

export default function Foreldrabok() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [onlyPhone, setOnlyPhone] = useState(false);
  const [onlyNorth, setOnlyNorth] = useState(false);
  const [onlyOffer, setOnlyOffer] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyChosen, setOnlyChosen] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [closedSectors, setClosedSectors] = useState<Set<string>>(new Set());
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = async () => {
    const all: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("companies")
        .select("id,name,owner,phone,website_url,ja_url,industry,category,address,pitch,notes,svif_valid,last_call_outcome")
        .eq("lead_source", LEAD_SOURCE)
        .order("category", { ascending: true })
        .order("name", { ascending: true })
        .range(from, from + 999);
      if (error) {
        console.error(error);
        toast.error("Villa við að hlaða listanum");
        break;
      }
      all.push(...((data || []) as unknown as Row[]));
      if (!data || data.length < 1000) break;
    }
    setRows(all);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const infoById = useMemo(() => {
    const m = new Map<string, Info>();
    rows.forEach((r) => m.set(r.id, parsePitch(r.pitch, "n:" + fold(r.name))));
    return m;
  }, [rows]);
  const infoOf = (r: Row) => infoById.get(r.id) as Info;

  const siblingIds = (r: Row) => {
    const key = infoOf(r).key;
    return rows.filter((x) => infoOf(x).key === key).map((x) => x.id);
  };

  const hasFilter = !!search.trim() || !!sector || onlyPhone || onlyNorth || onlyOffer || onlyVerified || onlyChosen;

  const filtered = useMemo(() => {
    const q = fold(search).trim().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      const i = infoById.get(r.id) as Info;
      if (sector && r.industry !== sector) return false;
      if (onlyPhone && !r.phone) return false;
      if (onlyNorth && !NORTH.test(r.address || "")) return false;
      if (onlyOffer && !i.offer) return false;
      if (onlyVerified && !i.verified) return false;
      if (onlyChosen && !r.svif_valid) return false;
      if (q.length) {
        const hay = fold([r.name, r.owner, r.phone, r.category, r.industry, i.desc, i.offer, r.address, r.notes].join(" "));
        return q.every((t) => hay.includes(t));
      }
      return true;
    });
  }, [rows, infoById, search, sector, onlyPhone, onlyNorth, onlyOffer, onlyVerified, onlyChosen]);

  const sectors = useMemo(
    () => [...new Set(rows.map((r) => r.industry || "Óflokkað"))].sort(natural),
    [rows]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Map<string, Row[]>>();
    for (const r of filtered) {
      const s = r.industry || "Óflokkað";
      const c = r.category || "Óflokkað";
      if (!map.has(s)) map.set(s, new Map());
      const cm = map.get(s)!;
      if (!cm.has(c)) cm.set(c, []);
      cm.get(c)!.push(r);
    }
    return [...map.entries()]
      .sort((a, b) => natural(a[0], b[0]))
      .map(([s, cm]) => ({
        sector: s,
        cats: [...cm.entries()]
          .sort((a, b) => natural(a[0], b[0]))
          .map(([c, rs]) => ({
            category: c,
            rows: [...rs].sort((a, b) => Number(infoById.get(b.id)?.verified) - Number(infoById.get(a.id)?.verified) || a.name.localeCompare(b.name, "is")),
          })),
      }));
  }, [filtered, infoById]);

  const catCount = groups.reduce((n, g) => n + g.cats.length, 0);
  const autoOpen = hasFilter && catCount <= 40;

  const companies = useMemo(() => new Set(rows.map((r) => infoById.get(r.id)?.key)).size, [rows, infoById]);
  const chosenCount = rows.filter((r) => r.svif_valid).length;
  const calledCount = useMemo(
    () => new Set(rows.filter((r) => r.last_call_outcome).map((r) => infoById.get(r.id)?.key)).size,
    [rows, infoById]
  );

  const patchMany = (ids: string[], changes: Partial<Row>) => {
    const set = new Set(ids);
    setRows((prev) => prev.map((r) => (set.has(r.id) ? { ...r, ...changes } : r)));
  };

  const toggleValid = async (r: Row) => {
    const next = !r.svif_valid;
    patchMany([r.id], { svif_valid: next });
    const { error } = await supabase.from("companies").update({ svif_valid: next }).eq("id", r.id);
    if (error) {
      patchMany([r.id], { svif_valid: r.svif_valid });
      toast.error("Villa við vistun");
    }
  };

  const setOutcome = async (r: Row, outcome: string) => {
    const next = r.last_call_outcome === outcome ? null : outcome;
    const ids = siblingIds(r);
    patchMany(ids, { last_call_outcome: next });
    const { error } = await supabase.from("companies").update({ last_call_outcome: next }).in("id", ids);
    if (error) {
      patchMany(ids, { last_call_outcome: r.last_call_outcome });
      return toast.error("Villa við vistun");
    }
    if (next) {
      const { error: cErr } = await supabase.from("communications").insert({
        company_id: r.id,
        channel: "símtal",
        direction: "outbound",
        subject: `Símtal – ${outcomeLabel(next)}`,
        body: `Útkoma: ${outcomeLabel(next)}`,
      });
      if (cErr) console.error("communications insert", cErr);
      toast.success(`Skráð: ${outcomeLabel(next)}${ids.length > 1 ? ` (á öll ${ids.length} flokkapláss fyrirtækisins)` : ""}`);
    }
  };

  const saveNotes = (r: Row, value: string) => {
    const key = infoOf(r).key;
    const ids = siblingIds(r);
    patchMany(ids, { notes: value });
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from("companies").update({ notes: value }).in("id", ids);
      if (error) toast.error("Villa við vistun glósu");
    }, 700);
  };

  const toggleIn = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const clearFilters = () => {
    setSearch(""); setSector(""); setOnlyPhone(false); setOnlyNorth(false); setOnlyOffer(false); setOnlyVerified(false); setOnlyChosen(false);
  };

  const toggles: { label: string; value: boolean; set: (v: boolean) => void }[] = [
    { label: "Með númeri", value: onlyPhone, set: setOnlyPhone },
    { label: "Akureyri / Norðurland", value: onlyNorth, set: setOnlyNorth },
    { label: "Með afslætti", value: onlyOffer, set: setOnlyOffer },
    { label: "Staðfest á vef", value: onlyVerified, set: setOnlyVerified },
    { label: "Valin", value: onlyChosen, set: setOnlyChosen },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Til baka">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                <Baby className="w-6 h-6 text-primary" />
                FORELDRABÓK
              </h1>
              <p className="text-sm text-muted-foreground">Fyrirtæki fyrir nýbakaða foreldra, flokkuð eftir vandamáli foreldra</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">{chosenCount} valin af {rows.length} plássum</span>
            <span className="px-3 py-1 rounded-full bg-muted">{companies} fyrirtæki</span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{calledCount} hringd</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Leita eftir fyrirtæki, eiganda, númeri, flokki, lýsingu…"
                className="pl-9"
              />
            </div>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm sm:max-w-xs"
              aria-label="Geiri"
            >
              <option value="">Allir geirar</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {toggles.map((t) => (
              <label key={t.label} className="inline-flex items-center gap-2 cursor-pointer select-none">
                <Checkbox checked={t.value} onCheckedChange={(v) => t.set(v === true)} />
                {t.label}
              </label>
            ))}
            {hasFilter && (
              <button onClick={clearFilters} className="text-primary font-semibold hover:underline">Hreinsa síur</button>
            )}
            <span className="ml-auto text-muted-foreground">{filtered.length} pláss · {catCount} flokkar</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <p className="text-muted-foreground">Hleð…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">Engin fyrirtæki hafa verið flutt inn í Foreldrabók ennþá.</p>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground">Ekkert passar við leitina. Prófaðu færri orð eða hreinsaðu síurnar.</p>
        ) : (
          groups.map((g) => {
            const sectorClosed = closedSectors.has(g.sector) && !hasFilter;
            const sectorRows = g.cats.reduce((n, c) => n + c.rows.length, 0);
            return (
              <section key={g.sector} className="space-y-3">
                <button
                  onClick={() => toggleIn(closedSectors, g.sector, setClosedSectors)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  {sectorClosed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  <h2 className="text-xl font-extrabold flex-1">{g.sector}</h2>
                  <span className="text-sm text-muted-foreground">{g.cats.length} flokkar · {sectorRows} pláss</span>
                </button>

                {!sectorClosed && g.cats.map((c) => {
                  const lab = splitLabel(c.category);
                  const isOpen = openCats.has(c.category) !== autoOpen;
                  const chosen = c.rows.filter((r) => r.svif_valid).length;
                  return (
                    <div key={c.category} className="rounded-2xl border-2 bg-card shadow-sm overflow-hidden">
                      <button
                        onClick={() => toggleIn(openCats, c.category, setOpenCats)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {lab.id && <span className="text-xs font-mono text-muted-foreground">{lab.id}</span>}
                        <h3 className="font-bold text-base flex-1">{lab.title}</h3>
                        <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          {chosen}/{c.rows.length}
                        </span>
                      </button>

                      {isOpen && (
                        <ul className="divide-y">
                          {c.rows.map((r) => {
                            const i = infoOf(r);
                            const siblings = siblingIds(r).length - 1;
                            const notesOpen = openNotes.has(r.id);
                            return (
                              <li key={r.id} className={cn("px-4 py-3 space-y-2 transition-colors", r.svif_valid && "bg-emerald-50/60 dark:bg-emerald-950/20")}>
                                <div className="flex items-start gap-3">
                                  <Checkbox checked={r.svif_valid} onCheckedChange={() => toggleValid(r)} className="mt-1" aria-label="Velja fyrirtæki í þennan flokk" />
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {r.website_url ? (
                                        <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline inline-flex items-center gap-1">
                                          {r.name}
                                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                                        </a>
                                      ) : (
                                        <span className="font-bold">{r.name}</span>
                                      )}
                                      {i.verified ? (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1" title="Staðfest á vef fyrirtækisins">
                                          <BadgeCheck className="w-3 h-3" /> Staðfest
                                        </span>
                                      ) : (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1" title="Fannst annars staðar; kanna áður en hringt er">
                                          <CircleDashed className="w-3 h-3" /> Ókannað
                                        </span>
                                      )}
                                      {i.type && <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{i.type}</span>}
                                      {r.address && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted inline-flex items-center gap-1">
                                          <MapPin className="w-3 h-3" /> {r.address}
                                        </span>
                                      )}
                                      {r.last_call_outcome && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted inline-flex items-center gap-1">
                                          <Check className="w-3 h-3" /> {outcomeLabel(r.last_call_outcome)}
                                        </span>
                                      )}
                                      {siblings > 0 && (
                                        <span className="text-xs text-muted-foreground">Líka í {siblings} {siblings === 1 ? "öðrum flokki" : "öðrum flokkum"}</span>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                      {r.owner ? (
                                        <span className="inline-flex items-center gap-1 text-muted-foreground" title={i.ownerSrc ? `Heimild: ${i.ownerSrc}` : undefined}>
                                          <User className="w-3.5 h-3.5" /> {r.owner}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-muted-foreground/70 italic"><User className="w-3.5 h-3.5" /> eigandi ekki fundinn</span>
                                      )}
                                      {r.phone ? (
                                        <a href={telHref(r.phone)} className="inline-flex items-center gap-1 text-primary font-semibold hover:underline" title={i.phoneSrc ? `Heimild: ${i.phoneSrc}` : undefined}>
                                          <Phone className="w-3.5 h-3.5" /> {r.phone}
                                        </a>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-muted-foreground/70 italic"><Phone className="w-3.5 h-3.5" /> númer ekki fundið</span>
                                      )}
                                      {i.phone2 && (
                                        <a href={telHref(i.phone2)} className="inline-flex items-center gap-1 text-primary hover:underline">
                                          <Phone className="w-3.5 h-3.5" /> {i.phone2}
                                        </a>
                                      )}
                                      {r.ja_url && (
                                        <a href={r.ja_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline self-center">skráning</a>
                                      )}
                                    </div>

                                    {i.desc && <p className="text-sm">{i.desc}</p>}
                                    {i.offer && (
                                      <p className="text-sm rounded-lg bg-primary/10 text-primary px-2.5 py-1.5 inline-flex items-start gap-1.5">
                                        <Gift className="w-4 h-4 mt-0.5 shrink-0" /> <span><b>Afsláttur:</b> {i.offer}</span>
                                      </p>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => toggleIn(openNotes, r.id, setOpenNotes)} aria-label="Glósa">
                                    <StickyNote className={cn("w-4 h-4", r.notes && "text-primary")} />
                                  </Button>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pl-8">
                                  {OUTCOMES.map((o) => (
                                    <button
                                      key={o.value}
                                      onClick={() => setOutcome(r, o.value)}
                                      className={cn(
                                        "text-xs font-bold px-2.5 py-1 rounded-full border-2 transition-all hover:scale-[1.03]",
                                        o.cls,
                                        r.last_call_outcome === o.value ? "bg-muted" : "bg-transparent"
                                      )}
                                    >
                                      {o.label}
                                    </button>
                                  ))}
                                </div>

                                {notesOpen && (
                                  <div className="pl-8">
                                    <Textarea value={r.notes || ""} onChange={(e) => saveNotes(r, e.target.value)} rows={4} placeholder="Glósa…" className="text-sm" />
                                    <p className="text-xs text-muted-foreground mt-1">Vistast sjálfkrafa{siblings > 0 ? " og gilda fyrir fyrirtækið í öllum flokkum þess" : ""}</p>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
