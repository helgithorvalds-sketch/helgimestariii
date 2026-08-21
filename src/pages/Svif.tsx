import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Search, X, Phone, Mail, Globe, ExternalLink, MapPin, Pencil, Plus, Plane,
  PhoneCall, Ban, RotateCcw, Trash2, Star, StarOff, Building, Facebook, Tag, Sparkles, ListChecks,
} from "lucide-react";
import { Company } from "@/types";
import { fetchCompanies, updateCompany, deleteCompany, addCompany } from "@/services/companyService";
import { CompanyModal } from "@/components/CompanyModal";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CallSchedule } from "@/components/CallSchedule";
import { addCallLog, fetchCompaniesWithCallLogs } from "@/services/callLogService";
import { Task, fetchAllTasks, addTask, toggleTaskCompleted, deleteTask } from "@/services/taskService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


export default function Svif() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [callRefresh, setCallRefresh] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Call dialog state
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


  const svif = useMemo(() => companies.filter((c) => c.stage === "svif"), [companies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return svif;
    return svif.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.owner || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.companyId || "").includes(q)
    );
  }, [svif, search]);

  const chosen = filtered.filter((c) => c.lastCallOutcome === "interested" && !c.rejected && !c.specialOffer);
  const specialOffers = filtered.filter((c) => c.specialOffer && !c.rejected);
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

  const handleToggleTask = async (t: Task) => {
    const ok = await toggleTaskCompleted(t.id, !t.completed);
    if (!ok) return toast.error("Villa við vistun");
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !t.completed } : x)));
  };

  const handleDeleteTask = async (t: Task) => {
    const ok = await deleteTask(t.id);
    if (!ok) return toast.error("Villa við eyðingu");
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
  };

  const hasCall = (c: Company) =>
    loggedIds.has(c.id) ||
    !!c.nextCallAt ||
    /(?:^|\n)\[\d{1,2}\.\d{1,2}\.\d{4}\]/.test(c.notes || "");
  const scheduleCompanies = filtered.filter(
    (c) => !c.rejected && (c.lastCallOutcome === "interested" || c.specialOffer || hasCall(c))
  );
  const rest = filtered.filter(
    (c) => !c.rejected && !c.specialOffer && c.lastCallOutcome !== "interested" && !hasCall(c)
  );

  const persist = async (updated: Company, msg?: string) => {
    const res = await updateCompany(updated);
    if (res) {
      setCompanies((prev) => prev.map((c) => (c.id === res.id ? res : c)));
      if (msg) toast.success(msg);
      return res;
    }
    toast.error("Villa við vistun");
    return null;
  };

  const handleAdd = async (company: Omit<Company, "id" | "createdAt">) => {
    const created = await addCompany({ ...company, stage: "svif" });
    if (created) {
      setCompanies((prev) => [...prev, created]);
      toast.success("Fyrirtæki skráð í Svif");
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

  const handleToggleChosen = async (c: Company) => {
    const isChosen = c.lastCallOutcome === "interested";
    await persist(
      { ...c, lastCallOutcome: isChosen ? undefined : "interested" },
      isChosen ? "Fjarlægt úr Valin" : "Sett í Valin"
    );
  };

  const handleToggleOff = async (c: Company) => {
    await persist(
      { ...c, rejected: !c.rejected, rejectedAt: !c.rejected ? new Date().toISOString() : undefined },
      !c.rejected ? "Merkt sem off" : "Endurvirkjað"
    );
  };

  const handleToggleSpecialOffer = async (c: Company) => {
    await persist(
      { ...c, specialOffer: !c.specialOffer },
      !c.specialOffer ? "Sett í sértilboð" : "Fjarlægt úr sértilboði"
    );
  };

  const handleRemoveContact = async (c: Company, contactId: string) => {
    await persist({ ...c, contacts: (c.contacts || []).filter((x) => x.id !== contactId) }, "Tengilið fjarlægður");
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
  };

  const handleSaveCall = async () => {
    if (!callTarget) return;
    const name = callName.trim();
    const phone = callPhone.trim();
    const email = callEmail.trim();
    const note = callNote.trim();
    if (!name && !phone && !email && !note) {
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
          contacts[idx] = {
            ...contacts[idx],
            name: name || contacts[idx].name,
            phone: phone || contacts[idx].phone,
            email: email || contacts[idx].email,
          };
        } else {
          contacts.push({ id: crypto.randomUUID(), name, phone, email: email || undefined });
        }
      }
      const stamp = new Date().toLocaleDateString("is-IS");
      const mergedNotes = note
        ? (c.notes ? `${c.notes}\n\n[${stamp}] ${note}` : `[${stamp}] ${note}`)
        : c.notes;
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
        setLoggedIds((prev) => new Set(prev).add(c.id));
        setCallRefresh((n) => n + 1);
      }
      if (saved) {
        toast.success("Símtal skráð");
        closeCall();
      }
    } finally {
      setSavingCall(false);
    }
  };

  const renderCard = (c: Company) => {
    const isChosen = c.lastCallOutcome === "interested" && !c.rejected;
    return (
      <div
        key={c.id}
        className={cn(
          "rounded-xl border-2 bg-card shadow-sm hover:shadow-md transition-all p-4 space-y-2",
          c.rejected
            ? "border-red-400 bg-red-50/70 dark:bg-red-950/30 dark:border-red-800"
            : c.specialOffer
              ? "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800"
              : isChosen
                ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800"
                : "border-border"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cn("font-bold text-base truncate", c.rejected && "text-red-700 dark:text-red-300")}>
              {c.name}
              {c.rejected && <span className="ml-2 text-xs font-bold uppercase rounded px-1.5 py-0.5 bg-red-600 text-white align-middle">OFF</span>}
              {c.specialOffer && <span className="ml-2 text-xs font-bold uppercase rounded px-1.5 py-0.5 bg-purple-600 text-white align-middle">SÉRTILBOÐ</span>}
              {isChosen && <span className="ml-2 text-xs font-bold uppercase rounded px-1.5 py-0.5 bg-emerald-600 text-white align-middle">VALIN</span>}
            </h3>
            {c.owner && <p className="text-sm font-medium text-primary truncate">{c.owner}</p>}
          </div>
          <button
            onClick={() => setSelected(c)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
            aria-label="Breyta"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {c.companyId && <span className="font-mono">{c.companyId}</span>}
          {c.industry && <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{c.industry}</span>}
        </div>

        {c.address && (
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{c.address}</span>
          </div>
        )}
        {c.phone && (
          <div className="flex items-center gap-1.5 text-sm">
            <Phone className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
            <a href={`tel:${c.phone}`} className="font-medium hover:underline">{c.phone}</a>
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
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs bg-muted/40 rounded-md px-2 py-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                  {p.name && <span className="font-semibold truncate">{p.name}</span>}
                  {p.phone && <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>}
                  {p.email && <a href={`mailto:${p.email}`} className="text-primary hover:underline truncate">{p.email}</a>}
                </div>
                <button onClick={() => handleRemoveContact(c, p.id)} className="text-muted-foreground hover:text-destructive p-0.5" aria-label="Fjarlægja">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          <a
            href={c.companyId
              ? `https://www.skatturinn.is/fyrirtaekjaskra/leit/kennitala/${c.companyId}`
              : `https://www.rsk.is/fyrirtaekjaskra/leit/?nafn=${encodeURIComponent(c.name)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-300"
          >
            <Building className="w-3 h-3" />Fyrirtækjaskrá<ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={`https://1819.is/?q=${encodeURIComponent(c.owner || c.name)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300"
          >
            <Phone className="w-3 h-3" />1819 — sími eiganda<ExternalLink className="w-3 h-3" />
          </a>
          {c.finnaUrl && (
            <a href={c.finnaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
              finna.is<ExternalLink className="w-3 h-3" />
            </a>
          )}
          {c.facebookUrl && !c.facebookUrl.toLowerCase().includes("search") && (
            <a href={c.facebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
              <Facebook className="w-3 h-3" />Facebook<ExternalLink className="w-3 h-3" />
            </a>
          )}
          {c.websiteUrl && (
            <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
              <Globe className="w-3 h-3" />Vefur<ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

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

        <div className="flex flex-wrap gap-1.5 pt-2 border-t">
          <Button size="sm" className="gap-1 flex-1 min-w-[80px]" onClick={() => openCall(c)}>
            <PhoneCall className="w-3.5 h-3.5" />Hringja
          </Button>
          <Button
            size="sm"
            variant={isChosen ? "secondary" : "outline"}
            className="gap-1 flex-1 min-w-[80px]"
            onClick={() => handleToggleChosen(c)}
          >
            {isChosen ? <><StarOff className="w-3.5 h-3.5" />Úr Valin</> : <><Star className="w-3.5 h-3.5" />Velja</>}
          </Button>
          <Button
            size="sm"
            variant={c.specialOffer ? "default" : "outline"}
            className="gap-1 flex-1 min-w-[80px]"
            onClick={() => handleToggleSpecialOffer(c)}
          >
            {c.specialOffer ? <><Sparkles className="w-3.5 h-3.5" />Í boði</> : <><Sparkles className="w-3.5 h-3.5" />Sértilboð</>}
          </Button>
          <Button
            size="sm"
            variant={c.rejected ? "default" : "destructive"}
            className="gap-1 flex-1 min-w-[80px]"
            onClick={() => handleToggleOff(c)}
          >
            {c.rejected ? <><RotateCcw className="w-3.5 h-3.5" />Endurvirkja</> : <><Ban className="w-3.5 h-3.5" />Off</>}
          </Button>
        </div>
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
                Svif
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{svif.length} fyrirtæki · {chosen.length} valin · {specialOffers.length} í sértilboði</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Leita..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 w-64 h-9 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-12 text-center">
            <Plane className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold text-lg">Engin fyrirtæki í Svifi</p>
            <p className="text-sm text-muted-foreground mt-1">Skráðu fyrsta fyrirtækið með „Nýtt fyrirtæki“.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <section className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-emerald-500 text-white">
                    <Star className="w-3.5 h-3.5" />
                    Valin
                    <span className="ml-1 bg-white/25 rounded-full px-2 text-xs">{chosen.length}</span>
                  </span>
                </div>
                {chosen.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic px-1">Engin valin fyrirtæki — ýttu á „Velja“ á korti.</p>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {chosen.map(renderCard)}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-blue-500 text-white">
                    <ListChecks className="w-3.5 h-3.5" />
                    Verkefni
                    <span className="ml-1 bg-white/25 rounded-full px-2 text-xs">{chosenTasks.filter((t) => !t.completed).length}</span>
                  </span>
                </div>
                <div className="rounded-xl border-2 bg-card shadow-sm p-4 space-y-2">
                  {chosenTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Engin verkefni fyrir valin fyrirtæki — skráðu verkefni þegar þú vistar símtal.
                    </p>
                  ) : (
                    chosenTasks.map((t) => {
                      const company = companies.find((c) => c.id === t.companyId);
                      const overdue = !t.completed && t.deadline && new Date(t.deadline) < new Date();
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border p-2 text-sm",
                            t.completed
                              ? "opacity-60 border-border"
                              : overdue
                                ? "border-red-300 bg-red-50/60 dark:bg-red-950/20 dark:border-red-800"
                                : "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => handleToggleTask(t)}
                            className="mt-1 h-4 w-4 accent-emerald-600 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className={cn("font-semibold break-words", t.completed && "line-through")}>{t.description}</p>
                            {company && <p className="text-xs text-primary font-medium truncate">{company.name}</p>}
                            {t.deadline && (
                              <p className={cn("text-xs", overdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                                {new Date(t.deadline).toLocaleString("is-IS", { dateStyle: "short", timeStyle: "short" })}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteTask(t)}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                            aria-label="Eyða verkefni"
                          >
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
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-purple-500 text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sértilboð
                  <span className="ml-1 bg-white/25 rounded-full px-2 text-xs">{specialOffers.length}</span>
                </span>
              </div>
              {specialOffers.length === 0 ? (
                <p className="text-sm text-muted-foreground italic px-1">Engin fyrirtæki í sértilboði — ýttu á „Sértilboð“ á korti.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {specialOffers.map(renderCard)}
                </div>
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
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-muted text-foreground">
                  Öll fyrirtæki
                  <span className="ml-1 bg-background rounded-full px-2 text-xs">{rest.length}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rest.map(renderCard)}
              </div>
            </section>
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

      <Dialog open={!!callTarget} onOpenChange={(o) => { if (!o) closeCall(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nýtt símtal — {callTarget?.name}</DialogTitle>
          </DialogHeader>
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
                <Textarea
                  rows={2}
                  value={callTaskDesc}
                  onChange={(e) => setCallTaskDesc(e.target.value)}
                  placeholder="Hvað þarf að gera fyrir fyrirtækið?"
                />
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
