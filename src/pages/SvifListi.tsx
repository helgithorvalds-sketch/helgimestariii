import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Search, X, Phone, Mail, Globe, ExternalLink, MapPin, Pencil, Plus, Plane,
  Building, Facebook, Tag,
} from "lucide-react";
import { Company } from "@/types";
import { fetchCompanies, updateCompany, deleteCompany, addCompany } from "@/services/companyService";
import { CompanyModal } from "@/components/CompanyModal";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SVIF_FYRIRTAEKI_SOURCE = "svif_fyrirtæki";

export default function SvifListi() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [addOpen, setAddOpen] = useState(false);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return svifFyrirtæki;
    return svifFyrirtæki.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.owner || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.companyId || "").includes(q) ||
      (c.address || "").toLowerCase().includes(q) ||
      (c.category || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.notes || "").toLowerCase().includes(q)
    );
  }, [svifFyrirtæki, search]);

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

  const renderCard = (c: Company) => (
    <div key={c.id} className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-base truncate">{c.name}</h3>
          {c.owner && <p className="text-sm font-medium text-primary truncate">{c.owner}</p>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSelected(c)} aria-label="Breyta">
          <Pencil className="w-4 h-4" />
        </Button>
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
          <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
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
            <div key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs bg-muted/40 rounded-md px-2 py-1">
              {p.name && <span className="font-semibold truncate">{p.name}</span>}
              {p.phone && <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>}
              {p.email && <a href={`mailto:${p.email}`} className="text-primary hover:underline truncate">{p.email}</a>}
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
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted"
        >
          <Building className="w-3 h-3" />Fyrirtækjaskrá<ExternalLink className="w-3 h-3" />
        </a>
        {c.finnaUrl && (
          <a href={c.finnaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
            finna.is<ExternalLink className="w-3 h-3" />
          </a>
        )}
        {c.facebookUrl && !c.facebookUrl.toLowerCase().includes("search") && (
          <a href={c.facebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
            <Facebook className="w-3 h-3" />Facebook<ExternalLink className="w-3 h-3" />
          </a>
        )}
        {c.websiteUrl && (
          <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
            <Globe className="w-3 h-3" />Vefur<ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {c.notes && (
        <div className="rounded-md bg-muted/40 border text-xs p-2 whitespace-pre-wrap">
          <span className="font-semibold block mb-0.5">Glósur</span>
          {c.notes}
        </div>
      )}
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
              <p className="text-sm text-muted-foreground mt-0.5">{svifFyrirtæki.length} fyrirtæki</p>
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
                <Button variant="ghost" size="icon" onClick={() => setSearch("")} className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <Button onClick={() => setAddOpen(true)} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Nýtt fyrirtæki
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Hleð...</p></div>
        ) : filtered.length === 0 ? (
          <div className={cn("rounded-xl border-2 border-dashed p-12 text-center", search && "border-muted")}>
            <Plane className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold text-lg">Engin fyrirtæki í Svif fyrirtæki</p>
            <p className="text-sm text-muted-foreground mt-1">Skráðu fyrsta fyrirtækið með „Nýtt fyrirtæki“.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(renderCard)}
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