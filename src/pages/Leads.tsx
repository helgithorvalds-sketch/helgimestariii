import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search, X, Phone, Mail, ExternalLink, Globe, MapPin, Tag, Calendar, Pencil, Facebook, User, Building, PhoneCall, Ban, Trash2, RotateCcw } from "lucide-react";
import { Company, LeadSource, ContactPerson } from "@/types";
import { fetchCompanies, updateCompany, deleteCompany } from "@/services/companyService";
import { CompanyModal } from "@/components/CompanyModal";
import { addCallLog } from "@/services/callLogService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SectionDef = {
  source: LeadSource;
  title: string;
  emoji: string;
  accent: string; // tailwind classes for accent bar / badge
  ring: string;
};

const SECTIONS: SectionDef[] = [
  {
    source: "facebook",
    title: "Facebook / án vefsíðu",
    emoji: "🔵",
    accent: "bg-blue-500 text-white",
    ring: "border-blue-300 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-800",
  },
  {
    source: "new_company",
    title: "Nýskráð fyrirtæki",
    emoji: "🟢",
    accent: "bg-emerald-500 text-white",
    ring: "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-800",
  },
  {
    source: "restaurant",
    title: "Veitingastaðir",
    emoji: "🟠",
    accent: "bg-orange-500 text-white",
    ring: "border-orange-300 bg-orange-50/40 dark:bg-orange-950/20 dark:border-orange-800",
  },
];

export default function Leads() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [callTarget, setCallTarget] = useState<Company | null>(null);
  const [callName, setCallName] = useState("");
  const [callPhone, setCallPhone] = useState("");
  const [callEmail, setCallEmail] = useState("");
  const [callNote, setCallNote] = useState("");
  const [savingCall, setSavingCall] = useState(false);

  const load = async () => {
    const all = await fetchCompanies();
    setCompanies(all);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const leads = useMemo(() => companies.filter((c) => c.stage === "lead"), [companies]);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.owner || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.companyId || "").includes(q)
    );
  }, [leads, search]);

  const bySource = (s: LeadSource) => filtered.filter((c) => c.leadSource === s);

  const persist = async (updated: Company, successMsg?: string) => {
    const res = await updateCompany(updated);
    if (res) {
      setCompanies((prev) => prev.map((c) => (c.id === res.id ? res : c)));
      if (successMsg) toast.success(successMsg);
      return res;
    }
    toast.error("Villa við vistun");
    return null;
  };

  const openCall = (c: Company) => {
    const first = (c.contacts || [])[0];
    setCallTarget(c);
    setCallName(first?.name || c.owner || "");
    setCallPhone(first?.phone || c.phone || "");
    setCallEmail(first?.email || c.email || "");
    setCallNote("");
  };

  const closeCall = () => {
    setCallTarget(null);
    setCallName(""); setCallPhone(""); setCallEmail(""); setCallNote("");
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
      // Update / add contact on company
      const c = callTarget;
      let contacts = c.contacts ? [...c.contacts] : [];
      if (name || phone || email) {
        const idx = contacts.findIndex((x) => (phone && x.phone === phone) || (name && x.name === name));
        if (idx >= 0) {
          contacts[idx] = { ...contacts[idx], name: name || contacts[idx].name, phone: phone || contacts[idx].phone, email: email || contacts[idx].email };
        } else {
          contacts.push({ id: crypto.randomUUID(), name, phone, email: email || undefined });
        }
      }
      const stamp = new Date().toLocaleDateString("is-IS");
      const mergedNotes = note
        ? (c.notes ? `${c.notes}\n\n[${stamp}] ${note}` : `[${stamp}] ${note}`)
        : c.notes;
      const updated: Company = {
        ...c,
        contacts,
        owner: c.owner || name,
        phone: c.phone || phone,
        email: c.email || email || undefined,
        notes: mergedNotes,
      };
      const saved = await persist(updated);
      if (saved && note) {
        await addCallLog(c.id, note);
      }
      if (saved) {
        toast.success("Símtal skráð");
        closeCall();
      }
    } finally {
      setSavingCall(false);
    }
  };

  const handleRemoveContact = async (c: Company, contactId: string) => {
    const updated: Company = {
      ...c,
      contacts: (c.contacts || []).filter((x) => x.id !== contactId),
    };
    await persist(updated, "Tengilið fjarlægður");
  };

  const handleToggleOff = async (c: Company) => {
    const updated: Company = {
      ...c,
      rejected: !c.rejected,
      rejectedAt: !c.rejected ? new Date().toISOString() : undefined,
    };
    await persist(updated, !c.rejected ? "Merkt sem off" : "Endurvirkjað");
  };

  const handleUpdate = async (updated: Company) => {
    const res = await updateCompany(updated);
    if (res) {
      setCompanies((prev) => prev.map((c) => (c.id === res.id ? res : c)));
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

  const renderCard = (c: Company, accentRing: string) => (
    <div
      key={c.id}
      className={cn(
        "rounded-xl border-2 shadow-sm hover:shadow-md transition-all p-4 space-y-2 bg-card",
        c.rejected
          ? "border-red-400 bg-red-50/70 dark:bg-red-950/30 dark:border-red-800"
          : accentRing
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={cn("font-bold text-base truncate", c.rejected ? "text-red-700 dark:text-red-300" : "text-foreground")}>
            {c.name}
            {c.rejected && <span className="ml-2 text-xs font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-red-600 text-white align-middle">OFF</span>}
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
        {c.category && (
          <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{c.category}</span>
        )}
        {c.registeredDate && (
          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{c.registeredDate}</span>
        )}
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
                {p.phone && <a href={`tel:${p.phone}`} className="text-foreground hover:underline">{p.phone}</a>}
                {p.email && <a href={`mailto:${p.email}`} className="text-primary hover:underline truncate">{p.email}</a>}
              </div>
              <button
                onClick={() => handleRemoveContact(c, p.id)}
                className="text-muted-foreground hover:text-destructive p-0.5"
                aria-label="Fjarlægja"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {c.companyId && (
          <a href={`https://www.skatturinn.is/fyrirtaekjaskra/leit/kennitala/${c.companyId}`} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-300">
            <Building className="w-3 h-3" />Fyrirtækjaskrá (eigendur)<ExternalLink className="w-3 h-3" />
          </a>
        )}
        {c.finnaUrl && (
          <a href={c.finnaUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
            finna.is<ExternalLink className="w-3 h-3" />
          </a>
        )}
        <a
          href={c.jaUrl || `https://ja.is/leit/?q=${encodeURIComponent(c.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300"
        >
          <User className="w-3 h-3" />Eigandi / uppl. (já.is)<ExternalLink className="w-3 h-3" />
        </a>
        <a href="https://1819.is" target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
          1819.is<ExternalLink className="w-3 h-3" />
        </a>
        {c.googleUrl && (
          <a href={c.googleUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
            Google<ExternalLink className="w-3 h-3" />
          </a>
        )}
        {c.facebookUrl && !c.facebookUrl.toLowerCase().includes("search") && (
          <a href={c.facebookUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
            <Facebook className="w-3 h-3" />Facebook<ExternalLink className="w-3 h-3" />
          </a>
        )}
        {c.websiteUrl && (
          <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
            <Globe className="w-3 h-3" />Vefur<ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {c.pitch && (
        <div className="rounded-md bg-muted/60 border text-xs text-foreground p-2 whitespace-pre-wrap">
          <span className="font-semibold text-muted-foreground block mb-0.5">Söluhugmynd</span>
          {c.pitch}
        </div>
      )}

      {c.notes && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-foreground p-2 whitespace-pre-wrap">
          <span className="font-semibold text-amber-700 dark:text-amber-300 block mb-0.5">Glósur</span>
          {c.notes}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
        <Button
          size="sm"
          className="gap-1 flex-1 min-w-[100px]"
          onClick={() => openCall(c)}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Hringja
        </Button>
        <Button
          size="sm"
          variant={c.rejected ? "default" : "destructive"}
          className="gap-1 flex-1 min-w-[100px]"
          onClick={() => handleToggleOff(c)}
        >
          {c.rejected ? <><RotateCcw className="w-3.5 h-3.5" />Endurvirkja</> : <><Ban className="w-3.5 h-3.5" />Off</>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Til baka
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Til að hringja</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{leads.length} fyrirtæki bíða símtals</p>
            </div>
          </div>
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Hleð...</p></div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SECTIONS.filter((s) => s.source !== "restaurant").map((s) => {
                const list = bySource(s.source);
                return (
                  <section key={s.source}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm", s.accent)}>
                        <span>{s.emoji}</span>
                        {s.title}
                        <span className="ml-1 bg-white/25 rounded-full px-2 text-xs">{list.length}</span>
                      </span>
                    </div>
                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic px-1">Engin fyrirtæki.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {list.map((c) => renderCard(c, s.ring))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            {(() => {
              const s = SECTIONS.find((x) => x.source === "restaurant")!;
              const list = bySource("restaurant");
              return (
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm", s.accent)}>
                      <span>{s.emoji}</span>
                      {s.title}
                      <span className="ml-1 bg-white/25 rounded-full px-2 text-xs">{list.length}</span>
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic px-1">Engin fyrirtæki.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {list.map((c) => renderCard(c, s.ring))}
                    </div>
                  )}
                </section>
              );
            })()}

            {filtered.some((c) => !c.leadSource) && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-muted text-foreground">
                    Óflokkað
                    <span className="ml-1 bg-background rounded-full px-2 text-xs">{filtered.filter((c) => !c.leadSource).length}</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.filter((c) => !c.leadSource).map((c) => renderCard(c, "border-border"))}
                </div>
              </section>
            )}
          </div>
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
    </div>
  );
}