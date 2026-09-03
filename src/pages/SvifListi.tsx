import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Search, Phone, Mail, ChevronDown, ChevronRight, StickyNote, BookOpen, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SvifRow {
  id: string;
  name: string;
  owner: string;
  phone: string | null;
  email: string | null;
  category: string | null;
  company_id: string | null;
  address: string | null;
  notes: string;
  svif_valid: boolean;
  last_call_outcome: string | null;
}

const OUTCOMES: { value: string; label: string; cls: string }[] = [
  { value: "answered", label: "Svaraði", cls: "border-blue-400 text-blue-700 dark:text-blue-300" },
  { value: "no_answer", label: "Svaraði ekki", cls: "border-amber-400 text-amber-700 dark:text-amber-300" },
  { value: "interested", label: "Áhugi", cls: "border-emerald-400 text-emerald-700 dark:text-emerald-300" },
  { value: "rejected", label: "Ekki áhugi", cls: "border-red-400 text-red-700 dark:text-red-300" },
  { value: "call_again", label: "Hringja aftur", cls: "border-purple-400 text-purple-700 dark:text-purple-300" },
];

const outcomeLabel = (v?: string | null) => OUTCOMES.find((o) => o.value === v)?.label || null;

function titleFromNotes(notes: string): string | null {
  const first = (notes || "").split("\n")[0]?.trim() || "";
  if (/^titill\s*:/i.test(first)) return first.replace(/^titill\s*:\s*/i, "");
  return null;
}

export default function SvifListi() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SvifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectRow, setSelectRow] = useState<SvifRow | null>(null);
  const [selectNotes, setSelectNotes] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,owner,phone,email,category,company_id,address,notes,svif_valid,last_call_outcome")
      .eq("lead_source", "svif")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      console.error(error);
      toast.error("Villa við að hlaða listanum");
    }
    setRows((data as SvifRow[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.owner || "").toLowerCase().includes(q) ||
      (r.category || "").toLowerCase().includes(q) ||
      (r.phone || "").includes(q) ||
      (r.email || "").toLowerCase().includes(q) ||
      (r.company_id || "").includes(q) ||
      (r.notes || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const groups = useMemo(() => {
    const map = new Map<string, SvifRow[]>();
    for (const r of filtered) {
      const key = r.category?.trim() || "Óflokkað";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "is"));
  }, [filtered]);

  const total = rows.length;
  const selectedCount = rows.filter((r) => r.svif_valid).length;
  const calledCount = rows.filter((r) => !!r.last_call_outcome).length;

  const patch = (id: string, changes: Partial<SvifRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const toggleValid = async (r: SvifRow, notesValue?: string) => {
    const next = !r.svif_valid;
    patch(r.id, { svif_valid: next, ...(notesValue !== undefined ? { notes: notesValue } : {}) });
    const payload: Record<string, unknown> = next
      ? { svif_valid: true, chosen_v2: true, stage: "svif" }
      : { svif_valid: false, chosen_v2: false };
    if (notesValue !== undefined) payload.notes = notesValue;
    const { error } = await supabase.from("companies").update(payload).eq("id", r.id);
    if (error) {
      patch(r.id, { svif_valid: r.svif_valid });
      toast.error("Villa við vistun");
    } else if (next) {
      toast.success("Sett í Valin v2 (Svif)");
    }
  };

  const handleCheck = (r: SvifRow) => {
    if (!r.svif_valid) {
      setSelectRow(r);
      setSelectNotes(r.notes || "");
    } else {
      toggleValid(r);
    }
  };




  const setOutcome = async (r: SvifRow, outcome: string) => {
    const next = r.last_call_outcome === outcome ? null : outcome;
    patch(r.id, { last_call_outcome: next });
    const { error } = await supabase.from("companies").update({ last_call_outcome: next }).eq("id", r.id);
    if (error) {
      patch(r.id, { last_call_outcome: r.last_call_outcome });
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
      toast.success(`Skráð: ${outcomeLabel(next)}`);
    }
  };

  const saveNotes = (r: SvifRow, value: string) => {
    patch(r.id, { notes: value });
    clearTimeout(timers.current[r.id]);
    timers.current[r.id] = setTimeout(async () => {
      const { error } = await supabase.from("companies").update({ notes: value }).eq("id", r.id);
      if (error) toast.error("Villa við vistun glósu");
    }, 700);
  };

  const toggleSet = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

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
                <BookOpen className="w-6 h-6 text-primary" />
                SVIF
              </h1>
              <p className="text-sm text-muted-foreground">Hringilisti – velkomstbók</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">
              {selectedCount} af {total} valin
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              {calledCount} hringd
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Leita eftir fyrirtæki, tengilið, flokki, síma…"
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <p className="text-muted-foreground">Hleð…</p>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground">Engin fyrirtæki fundust.</p>
        ) : (
          groups.map(([category, items]) => {
            const isCollapsed = collapsed.has(category);
            return (
              <section key={category} className="rounded-2xl border-2 bg-card shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSet(collapsed, category, setCollapsed)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <h2 className="font-bold text-lg flex-1">{category}</h2>
                  <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {items.filter((i) => i.svif_valid).length}/{items.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <ul className="divide-y">
                    {items.map((r) => {
                      const titill = titleFromNotes(r.notes || "");
                      const notesOpen = openNotes.has(r.id);
                      return (
                        <li
                          key={r.id}
                          className={cn(
                            "px-4 py-3 space-y-2 transition-colors",
                            r.svif_valid && "bg-emerald-50/60 dark:bg-emerald-950/20"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={r.svif_valid}
                              onCheckedChange={() => handleCheck(r)}
                              className="mt-1"
                              aria-label="Velja fyrirtæki"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("font-bold truncate", r.svif_valid && "line-through text-muted-foreground")}>
                                  {r.name}
                                </span>
                                {r.last_call_outcome && (
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    {outcomeLabel(r.last_call_outcome)}
                                  </span>
                                )}
                              </div>
                              {(r.owner || titill) && (
                                <p className="text-sm text-muted-foreground">
                                  {r.owner}
                                  {titill && <span className="italic"> · {titill}</span>}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                                {r.phone && (
                                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">
                                    <Phone className="w-3.5 h-3.5" /> {r.phone}
                                  </a>
                                )}
                                {r.email && (
                                  <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 text-primary hover:underline break-all">
                                    <Mail className="w-3.5 h-3.5" /> {r.email}
                                  </a>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleSet(openNotes, r.id, setOpenNotes)}
                              aria-label="Glósa"
                            >
                              <StickyNote className="w-4 h-4" />
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
                              <Textarea
                                value={r.notes || ""}
                                onChange={(e) => saveNotes(r, e.target.value)}
                                rows={5}
                                placeholder="Glósa…"
                                className="text-sm"
                              />
                              <p className="text-xs text-muted-foreground mt-1">Vistast sjálfkrafa</p>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </main>

      <Dialog open={!!selectRow} onOpenChange={(o) => !o && setSelectRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold">
              Glósa – {selectRow?.name}
            </DialogTitle>
            <DialogDescription>
              Skrifaðu glósu um fyrirtækið áður en þú byrjar. Fyrirtækið fer í Valin v2 (Svif).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={selectNotes}
            onChange={(e) => setSelectNotes(e.target.value)}
            rows={8}
            placeholder="Glósa um fyrirtækið…"
            className="text-sm"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectRow(null)}>
              Hætta við
            </Button>
            <Button
              onClick={() => {
                if (selectRow) toggleValid(selectRow, selectNotes);
                setSelectRow(null);
              }}
            >
              <Check className="w-4 h-4 mr-1" /> Vista og velja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
