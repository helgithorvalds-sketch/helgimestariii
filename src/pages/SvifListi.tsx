import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Search, X, Phone, Mail, Globe, ExternalLink, MapPin, Pencil, Plus, Plane,
  PhoneCall, Ban, RotateCcw, Trash2, Star, StarOff, Building, Tag, Sparkles, ListChecks,
  StickyNote, Check, BookmarkCheck, Bookmark, Download, ChevronDown, ChevronUp, MessageSquareQuote, Inbox,
} from "lucide-react";
import { Company } from "@/types";
import { fetchCompanies, updateCompany, deleteCompany, addCompany, addCompanies } from "@/services/companyService";
import { CompanyModal } from "@/components/CompanyModal";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CallSchedule } from "@/components/CallSchedule";
import { CallLog, addCallLog, fetchCompaniesWithCallLogs, fetchCallLogsForCompanies } from "@/services/callLogService";
import { Task, fetchAllTasks, addTask, toggleTaskCompleted, deleteTask } from "@/services/taskService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SVOR, FLOKKAR, VERD, TIER_LABEL, GEIRA_ROD, SVIF_FYRIRTAEKI_SOURCE,
  Flokkur, FlokkurTier, normName, svarToCompany, flokkurFor, matchesSvar, enrichWithSvar, svarFor, tierFor, verdFor,
} from "@/data/svifFyrirtaekiSvor";

/** Svarstaðan er geymd í símtalaútkomunni: já = interested, spyr = call_again, nei = rejected. */
const OUTCOMES: { value: string; label: string; cls: string }[] = [
  { value: "interested", label: "Já", cls: "border-emerald-400 text-emerald-700 dark:text-emerald-300" },
  { value: "call_again", label: "Spyr", cls: "border-amber-400 text-amber-700 dark:text-amber-300" },
  { value: "no_answer", label: "Bíður", cls: "border-slate-400 text-slate-700 dark:text-slate-300" },
  { value: "rejected", label: "Nei", cls: "border-red-400 text-red-700 dark:text-red-300" },
];

type Stada = "ja" | "spyr" | "bidur" | "nei";
type Sia = "allir" | "skrad" | Stada;

const SIUR: { value: Sia; label: string }[] = [
  { value: "allir", label: "Allir" },
  { value: "ja", label: "Já" },
  { value: "spyr", label: "Spyr" },
  { value: "bidur", label: "Bíða" },
  { value: "nei", label: "Nei" },
  { value: "skrad", label: "Skráð í bækling" },
];

function stadaOf(c: Company): Stada {
  if (c.rejected || c.lastCallOutcome === "rejected") return "nei";
  if (c.lastCallOutcome === "interested") return "ja";
  if (c.lastCallOutcome === "call_again") return "spyr";
  return "bidur";
}

const STADA_PILL: Record<Stada, { label: string; cls: string }> = {
  ja: { label: "Já", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" },
  spyr: { label: "Spyr", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  bidur: { label: "Bíður", cls: "bg-muted text-muted-foreground" },
  nei: { label: "Nei", cls: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" },
};

/** Grænt: eitt fyrirtæki. Gult: tvö keppa. Rautt: þrjú eða fleiri. Grátt: enginn enn. */
const TIER_PILL: Record<FlokkurTier, string> = {
  laus: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  einn: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  tveir: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  margir: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
};
const TIER_ROW: Record<FlokkurTier, string> = {
  laus: "border-l-slate-300",
  einn: "border-l-emerald-500",
  tveir: "border-l-amber-400",
  margir: "border-l-red-500",
};

const kr = (n: number) => n.toLocaleString("is-IS");
const tel = (p: string) => p.replace(/\s/g, "");
const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

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
  const [showSvor, setShowSvor] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [callRefresh, setCallRefresh] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  /** Símtöl hvers fyrirtækis á síðunni, nýjustu fyrst. */
  const [logs, setLogs] = useState<Record<string, CallLog[]>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Símtalsgluggi
  const [callTarget, setCallTarget] = useState<Company | null>(null);
  const [callName, setCallName] = useState("");
  const [callPhone, setCallPhone] = useState("");
  const [callEmail, setCallEmail] = useState("");
  const [callNote, setCallNote] = useState("");
  const [callNextDate, setCallNextDate] = useState("");
  const [callNextTime, setCallNextTime] = useState("");
  const [callTaskDesc, setCallTaskDesc] = useState("");
  const [callTaskDate, setCallTaskDate] = useState("");
  const [callTaskTime, setCallTaskTime] = useState("");
  const [savingCall, setSavingCall] = useState(false);

  const toggleSet = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const load = async () => {
    const [list, logged, taskList] = await Promise.all([
      fetchCompanies(),
      fetchCompaniesWithCallLogs(),
      fetchAllTasks(),
    ]);
    setCompanies(list);
    setLoggedIds(new Set(logged));
    setTasks(taskList);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pageIds = useMemo(
    () => companies.filter((c) => c.stage === "svif_fyrirtæki" && c.leadSource === SVIF_FYRIRTAEKI_SOURCE).map((c) => c.id),
    [companies]
  );
  const idsKey = pageIds.join(",");
  // Sækir símtölin aftur þegar fyrirtækjum fjölgar eða símtal er skráð í áætluninni.
  useEffect(() => {
    if (!pageIds.length) return;
    fetchCallLogsForCompanies(pageIds).then((all) => {
      const map: Record<string, CallLog[]> = {};
      for (const l of all) (map[l.companyId] ||= []).push(l);
      setLogs(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, callRefresh]);

  const svifFyrirtæki = useMemo(
    () => companies.filter((c) => c.stage === "svif_fyrirtæki" && c.leadSource === SVIF_FYRIRTAEKI_SOURCE),
    [companies]
  );

  /** Svör sem vantar á síðuna, og fyrirtæki sem eru hér en vantar geira, svarið eða verð. */
  const { missingSvor, enrichable } = useMemo(() => {
    const missing: typeof SVOR = [];
    const enrich: { c: Company; s: typeof SVOR[number] }[] = [];
    for (const s of SVOR) {
      const c = svifFyrirtæki.find((x) => matchesSvar(x, s));
      if (!c) missing.push(s);
      else if (!c.category || !flokkurFor(c.category) || !c.pitch || !c.estimatedPrice) enrich.push({ c, s });
    }
    return { missingSvor: missing, enrichable: enrich };
  }, [svifFyrirtæki]);
  const importCount = missingSvor.length + enrichable.length;

  const matchesSearch = (c: Company, q: string) =>
    c.name.toLowerCase().includes(q) ||
    (c.owner || "").toLowerCase().includes(q) ||
    (c.phone || "").includes(q) ||
    (c.email || "").toLowerCase().includes(q) ||
    (c.category || "").toLowerCase().includes(q) ||
    (c.industry || "").toLowerCase().includes(q) ||
    (c.pitch || "").toLowerCase().includes(q) ||
    (c.notes || "").toLowerCase().includes(q) ||
    (c.contacts || []).some((p) => (p.name || "").toLowerCase().includes(q) || (p.phone || "").includes(q));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? svifFyrirtæki.filter((c) => matchesSearch(c, q)) : svifFyrirtæki;
  }, [svifFyrirtæki, search]);

  /** Svörin í herferðarkaflanum, með stöðusíu. */
  const svorList = useMemo(
    () => filtered.filter((c) => {
      if (sia === "allir") return true;
      if (sia === "skrad") return !!c.registeredInSvif;
      return stadaOf(c) === sia;
    }),
    [filtered, sia]
  );

  const counts = useMemo(() => {
    const n = { skrad: 0, ja: 0, spyr: 0, bidur: 0, nei: 0 };
    for (const c of svifFyrirtæki) {
      if (c.registeredInSvif) n.skrad++;
      n[stadaOf(c)]++;
    }
    return n;
  }, [svifFyrirtæki]);

  // Kaflarnir eins og á Svif-síðunni. Valin = þau sem þú ætlar að vinna áfram með.
  const chosen = filtered.filter((c) => c.chosenV2 && !c.rejected && !c.registeredInSvif && !c.specialOffer);
  const specialOffers = filtered.filter((c) => c.specialOffer && !c.rejected && !c.registeredInSvif);
  const registered = filtered.filter((c) => c.registeredInSvif && !c.rejected);
  const rest = filtered.filter((c) => !c.rejected && !c.registeredInSvif && !c.specialOffer && !c.chosenV2);
  const hasCall = (c: Company) =>
    loggedIds.has(c.id) ||
    !!c.nextCallAt ||
    /(?:^|\n)\[\d{1,2}\.\d{1,2}\.\d{4}\]/.test(c.notes || "");
  const scheduleCompanies = filtered.filter(
    (c) => !c.rejected && (c.chosenV2 || c.specialOffer || hasCall(c))
  );
  const chosenTasks = useMemo(() => {
    const ids = new Set([...chosen, ...specialOffers].map((c) => c.id));
    return tasks
      .filter((t) => ids.has(t.companyId))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
  }, [tasks, chosen, specialOffers]);

  /** Fyrirtæki í hverjum flokki, eftir flokksheiti (normað). */
  const byUndir = useMemo(() => {
    const map = new Map<string, Company[]>();
    for (const c of svifFyrirtæki) {
      const key = normName(c.category || "");
      if (!key) continue;
      map.set(key, [...(map.get(key) || []), c]);
    }
    return map;
  }, [svifFyrirtæki]);

  /** Hve mörg sækja um flokkinn, án þeirra sem sögðu nei. Þetta ræður lit og verði. */
  const countIn = (undirgeiri?: string) =>
    (byUndir.get(normName(undirgeiri || "")) || []).filter((c) => stadaOf(c) !== "nei").length;

  /** Flokkakortið: hvert pláss með þeim sem sækja um það, þeim sem bjóða það líka, fjölda og verði. */
  const flokkayfirlit = useMemo(() => {
    const known = new Set(FLOKKAR.map((f) => normName(f.undirgeiri)));
    const extra: Flokkur[] = [...byUndir.keys()]
      .filter((k) => !known.has(k))
      .map((k) => ({ geiri: byUndir.get(k)![0].industry || "Annað", undirgeiri: byUndir.get(k)![0].category!, lysing: "" }));
    const all: Flokkur[] = [...FLOKKAR, ...extra];
    const geirar = [...GEIRA_ROD, ...all.map((f) => f.geiri).filter((g) => !GEIRA_ROD.includes(g))];
    const rows = all.map((f) => {
      const companies = byUndir.get(normName(f.undirgeiri)) || [];
      const einnig = svifFyrirtæki.filter((c) => {
        if (companies.includes(c)) return false;
        const s = svarFor(c);
        return !!s?.einnig?.some((e) => normName(e) === normName(f.undirgeiri));
      });
      const count = companies.filter((c) => stadaOf(c) !== "nei").length;
      return { ...f, companies, einnig, count, tier: tierFor(count), verd: verdFor(count) };
    });
    const groups = geirar
      .map((geiri) => ({ geiri, rows: rows.filter((r) => r.geiri === geiri) }))
      .filter((g) => g.rows.length > 0);
    const summary = { laus: 0, einn: 0, tveir: 0, margir: 0 };
    for (const r of rows) summary[r.tier]++;
    return { groups, summary };
  }, [byUndir, svifFyrirtæki]);

  const manadartekjur = useMemo(
    () => svifFyrirtæki.reduce((sum, c) => sum + (c.registeredInSvif ? verdFor(countIn(c.category)).ein : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [svifFyrirtæki, byUndir]
  );

  const persist = async (updated: Company, msg?: string) => {
    const res = await updateCompany({ ...updated, stage: "svif_fyrirtæki", leadSource: SVIF_FYRIRTAEKI_SOURCE });
    if (res) {
      setCompanies((prev) => prev.map((c) => (c.id === res.id ? res : c)));
      if (msg) toast.success(msg);
      return res;
    }
    toast.error("Villa við vistun");
    return null;
  };

  const handleImport = async () => {
    if (importCount === 0) return;
    setImporting(true);
    try {
      const created = await addCompanies(missingSvor.map(svarToCompany));
      if (!created) {
        toast.error("Innflutningur mistókst");
        return;
      }
      const saved: Company[] = [];
      for (const { c, s } of enrichable) {
        const res = await updateCompany(enrichWithSvar(c, s));
        if (res) saved.push(res);
      }
      setCompanies((prev) => [...prev.map((c) => saved.find((x) => x.id === c.id) || c), ...created]);
      if (saved.length < enrichable.length) toast.error(`${enrichable.length - saved.length} fyrirtæki tókst ekki að uppfæra`);
      toast.success(
        [created.length ? `${created.length} svör flutt inn` : "", saved.length ? `${saved.length} fyrirtæki uppfærð` : ""]
          .filter(Boolean).join(" · ")
      );
    } finally {
      setImporting(false);
    }
  };

  const handleAdd = async (company: Omit<Company, "id" | "createdAt">) => {
    const created = await addCompany({ ...company, stage: "svif_fyrirtæki", leadSource: SVIF_FYRIRTAEKI_SOURCE });
    if (created) {
      setCompanies((prev) => [...prev, created]);
      toast.success("Fyrirtæki skráð í Svif fyrirtæki");
    } else {
      toast.error("Villa við vistun");
    }
    setAddOpen(false);
  };

  const handleUpdate = async (updated: Company) => {
    await persist(updated, "Vistað!");
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

  /** Lítil uppfærsla á einum dálki, með afturköllun ef vistun bregst. */
  const patch = async (c: Company, fields: Partial<Company>, row: Record<string, unknown>, msg: string) => {
    setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...fields } : x)));
    const { error } = await supabase.from("companies").update(row).eq("id", c.id);
    if (error) {
      setCompanies((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      toast.error("Villa við vistun");
      return false;
    }
    toast.success(msg);
    return true;
  };

  const toggleChosen = (c: Company) =>
    patch(c, { chosenV2: !c.chosenV2 }, { chosen_v2: !c.chosenV2 }, !c.chosenV2 ? "Sett í Valin" : "Fjarlægt úr Valin");

  const toggleRegistered = (c: Company) =>
    patch(c, { registeredInSvif: !c.registeredInSvif }, { registered_in_svif: !c.registeredInSvif },
      !c.registeredInSvif ? `${c.name} skráð í bæklinginn` : `${c.name} tekið úr bæklingnum`);

  const toggleSpecialOffer = (c: Company) =>
    patch(c, { specialOffer: !c.specialOffer }, { special_offer: !c.specialOffer }, !c.specialOffer ? "Sett í sértilboð" : "Fjarlægt úr sértilboði");

  const toggleOff = (c: Company) => {
    const rejected = !c.rejected;
    const rejectedAt = rejected ? new Date().toISOString() : undefined;
    return patch(c, { rejected, rejectedAt }, { rejected, rejected_at: rejectedAt || null }, rejected ? "Merkt sem off" : "Endurvirkjað");
  };

  const setOutcome = (c: Company, outcome: string) => {
    const next = (c.lastCallOutcome === outcome ? undefined : outcome) as Company["lastCallOutcome"];
    return patch(c, { lastCallOutcome: next }, { last_call_outcome: next || null },
      next ? `Svar: ${OUTCOMES.find((o) => o.value === next)?.label}` : "Svarstaða hreinsuð");
  };

  const saveNotes = (c: Company, value: string) => {
    setCompanies((prev) => prev.map((x) => (x.id === c.id ? { ...x, notes: value } : x)));
    clearTimeout(timers.current[c.id]);
    timers.current[c.id] = setTimeout(async () => {
      const { error } = await supabase.from("companies").update({ notes: value }).eq("id", c.id);
      if (error) toast.error("Villa við vistun glósu");
    }, 700);
  };

  const handleRemoveContact = async (c: Company, contactId: string) => {
    await persist({ ...c, contacts: (c.contacts || []).filter((x) => x.id !== contactId) }, "Tengilið fjarlægður");
  };

  const handleToggleTask = async (t: Task) => {
    const ok = await toggleTaskCompleted(t.id, !t.completed);
    if (!ok) return toast.error("Villa við vistun");
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)));
  };

  const handleDeleteTask = async (t: Task) => {
    const ok = await deleteTask(t.id);
    if (!ok) return toast.error("Villa við eyðingu");
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
  };

  const openCall = (c: Company) => {
    const first = (c.contacts || [])[0];
    setCallTarget(c);
    setCallName(first?.name || c.owner || "");
    setCallPhone(first?.phone || c.phone || "");
    setCallEmail(first?.email || c.email || "");
    setCallNote("");
    if (c.nextCallAt) {
      const d = new Date(c.nextCallAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setCallNextDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setCallNextTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setCallNextDate("");
      setCallNextTime("09:00");
    }
  };

  const closeCall = () => {
    setCallTarget(null);
    setCallName(""); setCallPhone(""); setCallEmail(""); setCallNote("");
    setCallNextDate(""); setCallNextTime("");
    setCallTaskDesc(""); setCallTaskDate(""); setCallTaskTime("");
  };

  const handleSaveCall = async () => {
    if (!callTarget) return;
    const name = callName.trim();
    const phone = callPhone.trim();
    const email = callEmail.trim();
    const note = callNote.trim();
    if (!name && !phone && !email && !note && !callTaskDesc.trim()) {
      toast.error("Skrifaðu eitthvað fyrst");
      return;
    }
    setSavingCall(true);
    try {
      const c = callTarget;
      const contacts = c.contacts ? [...c.contacts] : [];
      if (name || phone || email) {
        const idx = contacts.findIndex((x) => (phone && x.phone === phone) || (name && x.name === name));
        if (idx >= 0) {
          contacts[idx] = { ...contacts[idx], name: name || contacts[idx].name, phone: phone || contacts[idx].phone, email: email || contacts[idx].email };
        } else {
          contacts.push({ id: crypto.randomUUID(), name, phone, email: email || undefined });
        }
      }
      const stamp = new Date().toLocaleDateString("is-IS");
      const mergedNotes = note ? (c.notes ? `${c.notes}\n\n[${stamp}] ${note}` : `[${stamp}] ${note}`) : c.notes;
      let nextCallAt = c.nextCallAt;
      if (callNextDate) {
        const [y, m, d] = callNextDate.split("-").map(Number);
        const [hh, mm] = (callNextTime || "09:00").split(":").map(Number);
        nextCallAt = new Date(y, (m || 1) - 1, d || 1, hh || 9, mm || 0).toISOString();
      }
      const saved = await persist({
        ...c,
        contacts,
        owner: c.owner || name,
        phone: c.phone || phone,
        email: c.email || email || undefined,
        notes: mergedNotes,
        nextCallAt,
      });
      if (saved) {
        const callLog = await addCallLog(c.id, note || "Símtal skráð");
        if (!callLog && !note && !callNextDate) {
          toast.error("Ekki tókst að vista símtalaskrá");
          return;
        }
        if (callLog) setLogs((prev) => ({ ...prev, [c.id]: [callLog, ...(prev[c.id] || [])] }));
        setLoggedIds((prev) => new Set(prev).add(c.id));
        setCallRefresh((n) => n + 1);
      }
      const taskDesc = callTaskDesc.trim();
      if (saved && taskDesc) {
        let deadline: string | null = null;
        if (callTaskDate) {
          const [y, m, d] = callTaskDate.split("-").map(Number);
          const [hh, mm] = (callTaskTime || "09:00").split(":").map(Number);
          deadline = new Date(y, (m || 1) - 1, d || 1, hh || 9, mm || 0).toISOString();
        }
        const created = await addTask(c.id, taskDesc, deadline);
        if (created) setTasks((prev) => [created, ...prev]);
        else toast.error("Ekki tókst að vista verkefni");
      }
      if (saved) {
        toast.success(taskDesc ? "Símtal og verkefni skráð" : "Símtal skráð");
        closeCall();
      }
    } finally {
      setSavingCall(false);
    }
  };

  const sameSlot = (c: Company) =>
    c.category
      ? svifFyrirtæki.filter((x) => x.id !== c.id && normName(x.category || "") === normName(c.category || "") && stadaOf(x) !== "nei")
      : [];

  /** Geiri › flokkur með fjölda sem keppir og verðinu sem það gefur. */
  const renderSlot = (c: Company) => {
    if (!c.industry && !c.category) return null;
    const count = countIn(c.category);
    const tier = tierFor(count);
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {c.industry && <span className="inline-flex items-center gap-1 text-muted-foreground"><Tag className="w-3 h-3" />{c.industry}</span>}
        {c.category && <span className="font-semibold">› {c.category}</span>}
        {c.category && (
          <span className={cn("font-bold px-2 py-0.5 rounded-full", TIER_PILL[tier])}>
            {count <= 1 ? TIER_LABEL[tier] : `${count} keppa`} · {kr(verdFor(count).ein)} kr.
          </span>
        )}
      </div>
    );
  };

  /** Hvað fyrirtækið gerir nákvæmlega, úr svaralistanum. */
  const renderThjonusta = (c: Company) => {
    const s = svarFor(c);
    return s?.thjonusta ? <p className="text-xs text-muted-foreground">{s.thjonusta}</p> : null;
  };

  /** Síðustu þrjú símtölin við fyrirtækið. */
  const renderLogs = (c: Company) => {
    const list = logs[c.id] || [];
    if (list.length === 0) return null;
    return (
      <div className="space-y-1 rounded-md border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 p-2">
        <span className="text-xs font-bold block">Símtöl ({list.length})</span>
        {list.slice(0, 3).map((l) => (
          <div key={l.id} className="text-xs">
            <span className="font-semibold">{new Date(l.calledAt).toLocaleDateString("is-IS")}:</span>{" "}
            <span className="whitespace-pre-wrap">{l.notes}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderQuote = (c: Company) =>
    c.pitch ? (
      <div className="rounded-md border-l-4 border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30 text-sm p-2">
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 mb-0.5"><MessageSquareQuote className="w-3 h-3" />Svarið</span>
        {c.pitch}
      </div>
    ) : null;

  const renderLinks = (c: Company) => (
    <div className="flex flex-wrap gap-1.5">
      {c.websiteUrl && (
        <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300">
          <Globe className="w-3 h-3" />{host(c.websiteUrl)}<ExternalLink className="w-3 h-3" />
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
      <a
        href={`https://1819.is/?q=${encodeURIComponent(c.owner || c.name)}`}
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted"
      >
        <Phone className="w-3 h-3" />1819<ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );

  const renderContacts = (c: Company, removable: boolean) =>
    (c.contacts || []).length > 0 ? (
      <div className="space-y-1 pt-1 border-t border-dashed">
        {(c.contacts || []).map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-md px-2 py-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              {p.name && <span className="font-semibold">{p.name}</span>}
              {p.phone && <a href={`tel:${tel(p.phone)}`} className="hover:underline">{p.phone}</a>}
              {p.email && <a href={`mailto:${p.email}`} className="text-primary hover:underline truncate">{p.email}</a>}
            </div>
            {removable && (
              <button onClick={() => handleRemoveContact(c, p.id)} className="text-muted-foreground hover:text-destructive p-0.5" aria-label="Fjarlægja">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    ) : null;

  const registerButton = (c: Company) => (
    <Button
      size="sm"
      className={cn(
        "gap-1 flex-1 min-w-[80px]",
        c.registeredInSvif
          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
          : "bg-background text-emerald-700 border border-emerald-500/60 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
      )}
      onClick={() => toggleRegistered(c)}
    >
      {c.registeredInSvif ? <><BookmarkCheck className="w-3.5 h-3.5" />Skráð ✓</> : <><Bookmark className="w-3.5 h-3.5" />Skrá í bækling</>}
    </Button>
  );

  /** Svarkort: þétt kort í herferðarkaflanum með öllu sem þarf til að hringja. */
  const renderSvarCard = (c: Company) => {
    const stada = stadaOf(c);
    const keppni = sameSlot(c);
    return (
      <div
        key={c.id}
        className={cn(
          "rounded-xl border-2 bg-card shadow-sm p-3 space-y-2",
          c.registeredInSvif
            ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/15 dark:border-emerald-600"
            : c.chosenV2
              ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/15 dark:border-amber-700"
              : stada === "nei"
                ? "border-red-200 opacity-70 dark:border-red-900"
                : "border-indigo-200 dark:border-indigo-900"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-bold text-sm">{c.name}</h3>
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", STADA_PILL[stada].cls)}>{STADA_PILL[stada].label}</span>
              {c.chosenV2 && <span className="text-[11px] font-bold uppercase rounded px-1.5 py-0.5 bg-amber-500 text-white">Valin</span>}
              {c.registeredInSvif && <span className="text-[11px] font-bold uppercase rounded px-1.5 py-0.5 bg-emerald-600 text-white">Skráð</span>}
            </div>
            {c.owner && <p className="text-xs font-medium text-primary">{c.owner}</p>}
            {renderThjonusta(c)}
          </div>
          <div className="flex items-center flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleSet(openNotes, c.id, setOpenNotes)} aria-label="Glósa">
              <StickyNote className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(c)} aria-label="Breyta">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {renderSlot(c)}
        {keppni.length > 0 && (
          <p className="text-xs text-orange-700 dark:text-orange-300">Sækja um sama pláss: {keppni.map((x) => x.name).join(", ")}</p>
        )}
        {renderQuote(c)}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {c.phone && <a href={`tel:${tel(c.phone)}`} className="inline-flex items-center gap-1 font-medium hover:underline"><Phone className="w-3 h-3 text-destructive" />{c.phone}</a>}
          {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 font-medium hover:underline min-w-0 truncate"><Mail className="w-3 h-3 text-primary" />{c.email}</a>}
        </div>
        {(c.contacts || []).length > 1 && renderContacts(c, false)}
        {renderLinks(c)}

        <div className="flex flex-wrap gap-1 pt-1">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              onClick={() => setOutcome(c, o.value)}
              className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border-2", o.cls, c.lastCallOutcome === o.value ? "bg-muted" : "bg-transparent")}
            >
              {o.label}
            </button>
          ))}
        </div>

        {openNotes.has(c.id) ? (
          <Textarea value={c.notes || ""} onChange={(e) => saveNotes(c, e.target.value)} rows={4} placeholder="Glósa…" className="text-sm" />
        ) : (
          c.notes && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs p-2 whitespace-pre-wrap">
              {c.notes}
            </div>
          )
        )}
        {c.nextCallAt && (
          <p className="text-xs font-semibold text-primary">
            Næsta símtal: {new Date(c.nextCallAt).toLocaleString("is-IS", { dateStyle: "short", timeStyle: "short" })}
          </p>
        )}
        {renderLogs(c)}

        <div className="flex flex-wrap gap-1.5 pt-1 border-t">
          <Button size="sm" className="gap-1 flex-1 min-w-[80px]" onClick={() => openCall(c)}>
            <PhoneCall className="w-3.5 h-3.5" />Hringja
          </Button>
          <Button size="sm" variant={c.chosenV2 ? "secondary" : "outline"} className="gap-1 flex-1 min-w-[80px]" onClick={() => toggleChosen(c)}>
            {c.chosenV2 ? <><StarOff className="w-3.5 h-3.5" />Úr Valin</> : <><Star className="w-3.5 h-3.5" />Velja</>}
          </Button>
          {registerButton(c)}
        </div>
      </div>
    );
  };

  /** Fullt kort eins og á Svif-síðunni, fyrir Valin, Sértilboð, Skráð og Öll fyrirtæki. */
  const renderCard = (c: Company) => {
    const stada = stadaOf(c);
    return (
      <div
        key={c.id}
        className={cn(
          "rounded-xl border-2 bg-card shadow-sm hover:shadow-md transition-all p-4 space-y-2",
          c.rejected
            ? "border-red-400 bg-red-50/70 dark:bg-red-950/30 dark:border-red-800"
            : c.registeredInSvif
              ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-300/50 dark:bg-emerald-950/15 dark:border-emerald-600 dark:ring-emerald-800/60"
              : c.specialOffer
                ? "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800"
                : c.chosenV2
                  ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800"
                  : "border-border"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cn("font-bold text-base", c.rejected && "text-red-700 dark:text-red-300")}>
              {c.name}
              {c.registeredInSvif && <span className="ml-2 text-xs font-bold uppercase rounded px-1.5 py-0.5 bg-emerald-600 text-white align-middle">SKRÁÐ</span>}
              {c.rejected && <span className="ml-2 text-xs font-bold uppercase rounded px-1.5 py-0.5 bg-red-600 text-white align-middle">OFF</span>}
              {c.specialOffer && <span className="ml-2 text-xs font-bold uppercase rounded px-1.5 py-0.5 bg-purple-600 text-white align-middle">SÉRTILBOÐ</span>}
              {c.chosenV2 && !c.rejected && <span className="ml-2 text-xs font-bold uppercase rounded px-1.5 py-0.5 bg-amber-500 text-white align-middle">VALIN</span>}
              <span className={cn("ml-2 text-xs font-bold px-2 py-0.5 rounded-full align-middle", STADA_PILL[stada].cls)}>{STADA_PILL[stada].label}</span>
            </h3>
            {c.owner && <p className="text-sm font-medium text-primary">{c.owner}</p>}
            {renderThjonusta(c)}
          </div>
          <button onClick={() => setSelected(c)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted" aria-label="Breyta">
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {renderSlot(c)}
        {renderQuote(c)}

        {c.address && (
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{c.address}</span>
          </div>
        )}
        {c.phone && (
          <div className="flex items-center gap-1.5 text-sm">
            <Phone className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
            <a href={`tel:${tel(c.phone)}`} className="font-medium hover:underline">{c.phone}</a>
          </div>
        )}
        {c.email && (
          <div className="flex items-center gap-1.5 text-sm">
            <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <a href={`mailto:${c.email}`} className="font-medium hover:underline truncate">{c.email}</a>
          </div>
        )}
        {renderContacts(c, true)}
        {renderLinks(c)}

        {c.nextCallAt && (
          <p className="text-xs font-semibold text-primary">
            Næsta símtal: {new Date(c.nextCallAt).toLocaleString("is-IS", { dateStyle: "short", timeStyle: "short" })}
          </p>
        )}
        {c.notes && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs p-2 whitespace-pre-wrap">
            <span className="font-semibold text-amber-700 dark:text-amber-300 block mb-0.5">Glósur / símtöl</span>
            {c.notes}
          </div>
        )}
        {renderLogs(c)}

        <div className="flex flex-wrap gap-1.5 pt-2 border-t">
          <Button size="sm" className="gap-1 flex-1 min-w-[80px]" onClick={() => openCall(c)}>
            <PhoneCall className="w-3.5 h-3.5" />Hringja
          </Button>
          <Button size="sm" variant={c.chosenV2 ? "secondary" : "outline"} className="gap-1 flex-1 min-w-[80px]" onClick={() => toggleChosen(c)}>
            {c.chosenV2 ? <><StarOff className="w-3.5 h-3.5" />Úr Valin</> : <><Star className="w-3.5 h-3.5" />Velja</>}
          </Button>
          <Button size="sm" variant={c.specialOffer ? "default" : "outline"} className="gap-1 flex-1 min-w-[80px]" onClick={() => toggleSpecialOffer(c)}>
            <Sparkles className="w-3.5 h-3.5" />{c.specialOffer ? "Í boði" : "Sértilboð"}
          </Button>
          {registerButton(c)}
          <Button size="sm" variant={c.rejected ? "default" : "outline"} className="gap-1 flex-1 min-w-[80px]" onClick={() => toggleOff(c)}>
            {c.rejected ? <><RotateCcw className="w-3.5 h-3.5" />Endurvirkja</> : <><Ban className="w-3.5 h-3.5" />Off</>}
          </Button>
        </div>
      </div>
    );
  };

  const sectionPill = (label: string, count: number, cls: string, icon: React.ReactNode) => (
    <div className="flex items-center gap-3 mb-3">
      <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm", cls)}>
        {icon}
        {label}
        <span className="ml-1 bg-white/25 rounded-full px-2 text-xs">{count}</span>
      </span>
    </div>
  );

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
                {svifFyrirtæki.length} fyrirtæki · {chosen.length} valin · {specialOffers.length} í sértilboði · {counts.skrad} skráð í bækling
                {counts.skrad > 0 && <> · {kr(manadartekjur)} kr. á mánuði</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Leita..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-8 w-64 h-9 text-sm" />
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
                  : [missingSvor.length ? `Flytja inn ${missingSvor.length} svör` : "", enrichable.length ? `uppfæra ${enrichable.length}` : ""].filter(Boolean).join(" · ")}
              </Button>
            )}
            <Button onClick={() => setAddOpen(true)} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Nýtt fyrirtæki
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
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
            {/* Flokkar og verð: hvað hver flokkur er, hverjir keppa um hann og hvað það gefur í verði */}
            <section className="rounded-2xl border-2 border-border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button onClick={() => setShowFlokkar((v) => !v)} className="flex items-center gap-3 text-left flex-wrap">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-foreground text-background">
                    <Tag className="w-3.5 h-3.5" />
                    Flokkar og verð
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {flokkayfirlit.summary.laus} lausir · {flokkayfirlit.summary.einn} með einn · {flokkayfirlit.summary.tveir} með tvo · {flokkayfirlit.summary.margir} með þrjá eða fleiri
                  </span>
                  {showFlokkar ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  <span><span className={cn("font-bold px-2 py-0.5 rounded-full", TIER_PILL.einn)}>Einn</span> {kr(VERD.einn.ein)} kr.</span>
                  <span><span className={cn("font-bold px-2 py-0.5 rounded-full", TIER_PILL.tveir)}>Tveir</span> {kr(VERD.keppni.ein)} kr.</span>
                  <span><span className={cn("font-bold px-2 py-0.5 rounded-full", TIER_PILL.margir)}>3+</span> {kr(VERD.keppni.ein)} kr.</span>
                  <span><span className={cn("font-bold px-2 py-0.5 rounded-full", TIER_PILL.laus)}>Laus</span> selja á {kr(VERD.einn.ein)} kr.</span>
                </div>
              </div>

              {showFlokkar && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Fjöldinn sem ræður verðinu er þeir sem sögðu já, spyrja eða bíða; þeir sem sögðu nei eru yfirstrikaðir og telja ekki. Tvær síður: {kr(VERD.einn.tvaer)} kr. ef einn, {kr(VERD.keppni.tvaer)} kr. ef fleiri. „Bjóða þetta líka“ eru fyrirtæki með þetta sem aukaþjónustu; þau telja ekki en gott að vita af þeim.
                  </p>
                  {flokkayfirlit.groups.map((g) => (
                    <div key={g.geiri}>
                      <h3 className="text-sm font-bold mb-1.5">{g.geiri}</h3>
                      <div className="space-y-1.5">
                        {g.rows.map((f) => (
                          <div key={f.undirgeiri} className={cn("rounded-lg border border-l-4 bg-background px-3 py-2 text-sm", TIER_ROW[f.tier])}>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-semibold">{f.undirgeiri}</span>
                              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap", TIER_PILL[f.tier])}>
                                {f.count === 0 ? "Laus" : f.count === 1 ? "1 fyrirtæki" : `${f.count} keppa`} · {kr(f.verd.ein)} kr.
                              </span>
                              {f.lysing && <span className="text-xs text-muted-foreground">{f.lysing}</span>}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {f.companies.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Enginn sækir um. Hægt að selja plássið.</span>
                              ) : f.companies.map((c) => {
                                const s = stadaOf(c);
                                const sv = svarFor(c);
                                return (
                                  <button
                                    key={c.id}
                                    onClick={() => { setSearch(c.name); setSia("allir"); setShowSvor(true); }}
                                    title={[STADA_PILL[s].label, sv?.thjonusta].filter(Boolean).join(" · ")}
                                    className={cn(
                                      "text-xs rounded-md border px-2 py-1 text-left hover:bg-muted max-w-full",
                                      c.registeredInSvif && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                                      s === "nei" && "line-through text-muted-foreground",
                                    )}
                                  >
                                    <span className="font-semibold">
                                      {c.registeredInSvif && <Check className="inline w-3 h-3 mr-0.5 text-emerald-600" />}
                                      {c.name}
                                      {s === "spyr" && <span className="text-amber-600"> ?</span>}
                                      {s === "bidur" && <span className="text-muted-foreground"> (bíður)</span>}
                                    </span>
                                    {sv?.thjonusta && <span className="block text-[11px] text-muted-foreground no-underline">{sv.thjonusta}</span>}
                                  </button>
                                );
                              })}
                              {f.einnig.map((c) => (
                                <button
                                  key={"e" + c.id}
                                  onClick={() => { setSearch(c.name); setSia("allir"); setShowSvor(true); }}
                                  className="text-xs rounded-md border border-dashed px-2 py-1 text-muted-foreground hover:bg-muted"
                                  title="Býður þetta líka, en sækir um annan flokk"
                                >
                                  {c.name} <span className="opacity-70">býður þetta líka</span>
                                </button>
                              ))}
                            </div>
                            {f.skipting && <p className="text-xs text-muted-foreground mt-1.5"><span className="font-semibold">Má skipta:</span> {f.skipting}</p>}
                            {f.note && <p className="text-xs text-muted-foreground mt-1">{f.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Svör úr herferðinni: sérkafli, aðskilinn frá hinum köflunum */}
            <section className="rounded-2xl border-2 border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button onClick={() => setShowSvor((v) => !v)} className="flex items-center gap-3 text-left">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-indigo-600 text-white">
                    <Inbox className="w-3.5 h-3.5" />
                    Svör úr herferðinni
                    <span className="ml-1 bg-white/25 rounded-full px-2 text-xs">{svifFyrirtæki.length}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{counts.ja} já · {counts.spyr} spyrja · {counts.bidur} bíða · {counts.nei} nei</span>
                  {showSvor ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>

              {showSvor && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {SIUR.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setSia(s.value)}
                        className={cn(
                          "text-xs font-bold px-3 py-1 rounded-full border-2 transition-all",
                          sia === s.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-card border-border hover:bg-muted"
                        )}
                      >
                        {s.label}
                        <span className="ml-1 opacity-70">{s.value === "allir" ? svifFyrirtæki.length : s.value === "skrad" ? counts.skrad : counts[s.value]}</span>
                      </button>
                    ))}
                  </div>
                  {svorList.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1">Ekkert svar passar við síuna.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {svorList.map(renderSvarCard)}
                    </div>
                  )}
                </>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <section className="lg:col-span-2">
                {sectionPill("Valin", chosen.length, "bg-amber-500 text-white", <Star className="w-3.5 h-3.5" />)}
                {chosen.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic px-1">Engin valin fyrirtæki — ýttu á „Velja“ á svarkorti.</p>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{chosen.map(renderCard)}</div>
                )}
              </section>

              <section>
                {sectionPill("Verkefni", chosenTasks.filter((t) => !t.completed).length, "bg-blue-500 text-white", <ListChecks className="w-3.5 h-3.5" />)}
                <div className="rounded-xl border-2 bg-card shadow-sm p-4 space-y-2">
                  {chosenTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Engin verkefni fyrir valin fyrirtæki — skráðu verkefni þegar þú vistar símtal.</p>
                  ) : (
                    chosenTasks.map((t) => {
                      const company = companies.find((c) => c.id === t.companyId);
                      const overdue = !t.completed && t.deadline && new Date(t.deadline) < new Date();
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border p-2 text-sm",
                            t.completed ? "opacity-60 border-border" : overdue ? "border-red-300 bg-red-50/60 dark:bg-red-950/20 dark:border-red-800" : "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800"
                          )}
                        >
                          <input type="checkbox" checked={t.completed} onChange={() => handleToggleTask(t)} className="mt-1 h-4 w-4 accent-emerald-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className={cn("font-semibold break-words", t.completed && "line-through")}>{t.description}</p>
                            {company && <p className="text-xs text-primary font-medium truncate">{company.name}</p>}
                            {t.deadline && (
                              <p className={cn("text-xs", overdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                                {new Date(t.deadline).toLocaleString("is-IS", { dateStyle: "short", timeStyle: "short" })}
                              </p>
                            )}
                          </div>
                          <button onClick={() => handleDeleteTask(t)} className="text-muted-foreground hover:text-destructive p-0.5" aria-label="Eyða verkefni">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <section>
              {sectionPill("Sértilboð", specialOffers.length, "bg-purple-500 text-white", <Sparkles className="w-3.5 h-3.5" />)}
              {specialOffers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic px-1">Engin fyrirtæki í sértilboði — ýttu á „Sértilboð“ á korti.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{specialOffers.map(renderCard)}</div>
              )}
            </section>

            <CallSchedule
              companies={scheduleCompanies}
              refreshKey={callRefresh}
              onCompanyClick={setSelected}
              onCompanyUpdate={async (updated) => {
                await persist(updated);
                setLoggedIds((prev) => new Set(prev).add(updated.id));
                setCallRefresh((n) => n + 1);
              }}
            />

            <section>
              {sectionPill("Skráð í bækling", registered.length, "bg-emerald-600 text-white", <BookmarkCheck className="w-3.5 h-3.5" />)}
              {registered.length === 0 ? (
                <p className="text-sm text-muted-foreground italic px-1">Ekkert fyrirtæki skráð í bæklinginn enn — ýttu á „Skrá í bækling“ á korti.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{registered.map(renderCard)}</div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-3 mb-3">
                <button onClick={() => setShowAll((v) => !v)} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-muted text-foreground">
                  Öll fyrirtæki
                  <span className="ml-1 bg-background rounded-full px-2 text-xs">{rest.length}</span>
                  {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {!showAll && <span className="text-xs text-muted-foreground">Þau sem eru hvorki valin, í sértilboði né skráð. Sömu fyrirtæki og í svörunum efst.</span>}
              </div>
              {showAll && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{rest.map(renderCard)}</div>
              )}
            </section>
          </>
        )}
      </main>

      {selected && (
        <CompanyModal company={selected} open={!!selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
      )}

      <AddCompanyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        existingNames={companies.map((c) => c.name)}
        existingCompanyIds={companies.map((c) => c.companyId).filter(Boolean)}
      />

      <Dialog open={!!callTarget} onOpenChange={(o) => { if (!o) closeCall(); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nýtt símtal — {callTarget?.name}</DialogTitle>
          </DialogHeader>
          {callTarget && (
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-sm">
              {callTarget.owner && <p><span className="text-muted-foreground">Svaraði:</span> <span className="font-medium">{callTarget.owner}</span></p>}
              {callTarget.category && (
                <p>
                  <span className="text-muted-foreground">Flokkur:</span> {callTarget.category} · {kr(verdFor(countIn(callTarget.category)).ein)} kr.
                  {countIn(callTarget.category) > 1 && <span className="text-muted-foreground"> ({countIn(callTarget.category)} keppa)</span>}
                </p>
              )}
              {callTarget.websiteUrl && (
                <a href={callTarget.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Globe className="w-3.5 h-3.5" />{host(callTarget.websiteUrl)}<ExternalLink className="w-3 h-3" />
                </a>
              )}
              {callTarget.pitch && <p className="text-xs border-l-2 border-indigo-400 pl-2 text-muted-foreground">{callTarget.pitch}</p>}
            </div>
          )}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nafn</Label>
              <Input value={callName} onChange={(e) => setCallName(e.target.value)} placeholder="Nafn tengiliðs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Símanúmer</Label>
                <Input value={callPhone} onChange={(e) => setCallPhone(e.target.value)} placeholder="555 1234" />
              </div>
              <div className="space-y-1.5">
                <Label>Netfang</Label>
                <Input value={callEmail} onChange={(e) => setCallEmail(e.target.value)} placeholder="nafn@fyrirtaeki.is" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Glósa um símtalið</Label>
              <Textarea rows={4} value={callNote} onChange={(e) => setCallNote(e.target.value)} placeholder="Hvað var sagt?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Næsta símtal — dagur</Label>
                <Input type="date" value={callNextDate} onChange={(e) => setCallNextDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tími</Label>
                <Input type="time" value={callNextTime} onChange={(e) => setCallNextTime(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                  Verkefni á eftir <span className="text-xs font-normal text-muted-foreground">(valfrjálst)</span>
                </Label>
                <Textarea rows={2} value={callTaskDesc} onChange={(e) => setCallTaskDesc(e.target.value)} placeholder="Hvað þarf að gera fyrir fyrirtækið?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Skiladagur</Label>
                  <Input type="date" value={callTaskDate} onChange={(e) => setCallTaskDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tími</Label>
                  <Input type="time" value={callTaskTime} onChange={(e) => setCallTaskTime(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCall}>Hætta</Button>
            <Button onClick={handleSaveCall} disabled={savingCall}>{savingCall ? "Vista..." : "Vista símtal"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
