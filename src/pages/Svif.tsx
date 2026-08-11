import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, X, Phone, Mail, Globe, ExternalLink, MapPin, Pencil, Plus, Plane } from "lucide-react";
import { Company } from "@/types";
import { fetchCompanies, updateCompany, deleteCompany, addCompany } from "@/services/companyService";
import { CompanyModal } from "@/components/CompanyModal";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { toast } from "sonner";

export default function Svif() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Company | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setCompanies(await fetchCompanies());
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
              <p className="text-sm text-muted-foreground mt-0.5">{svif.length} fyrirtæki</p>
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

      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Hleð...</p></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-12 text-center">
            <Plane className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold text-lg">Engin fyrirtæki í Svifi</p>
            <p className="text-sm text-muted-foreground mt-1">Skráðu fyrsta fyrirtækið með „Nýtt fyrirtæki“.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <div key={c.id} className="rounded-xl border-2 bg-card shadow-sm hover:shadow-md transition-all p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base truncate">{c.name}</h3>
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
                {c.companyId && <p className="text-xs font-mono text-muted-foreground">{c.companyId}</p>}
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
                {c.websiteUrl && (
                  <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-muted">
                    <Globe className="w-3 h-3" />Vefur<ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {c.notes && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs p-2 whitespace-pre-wrap">
                    {c.notes}
                  </div>
                )}
              </div>
            ))}
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
