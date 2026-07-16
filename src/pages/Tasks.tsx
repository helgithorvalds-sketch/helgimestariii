import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Trash2, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Task, fetchAllTasks, toggleTaskCompleted, deleteTask } from "@/services/taskService";
import { fetchCompanies } from "@/services/companyService";
import { Company } from "@/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "done">("all");

  useEffect(() => {
    Promise.all([fetchAllTasks(), fetchCompanies()]).then(([t, c]) => {
      setTasks(t);
      const map: Record<string, Company> = {};
      c.forEach((co) => (map[co.id] = co));
      setCompanies(map);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (task: Task) => {
    const newVal = !task.completed;
    const ok = await toggleTaskCompleted(task.id, newVal);
    if (ok) {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: newVal, completedAt: newVal ? new Date().toISOString() : null } : t));
      toast.success(newVal ? "Verkefni klárað!" : "Verkefni opnað aftur");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteTask(id);
    if (ok) setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const isOverdue = (task: Task) => !task.completed && task.deadline && new Date(task.deadline) < new Date();

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "overdue") return isOverdue(t);
    if (filter === "done") return t.completed;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const overdueCount = tasks.filter((t) => isOverdue(t)).length;

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="border-b bg-card shadow-sm px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="w-14 h-14 rounded-xl shadow-sm cursor-pointer" onClick={() => navigate("/")} />
            <div>
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Verkefni</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pendingCount} óklárað{overdueCount > 0 && <span className="text-destructive font-semibold"> · {overdueCount} tímabært</span>}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Til baka
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {([
            { key: "all", label: "Allt" },
            { key: "pending", label: "Óklárað" },
            { key: "overdue", label: "Tímabært" },
            { key: "done", label: "Klárað" },
          ] as const).map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-10">Hleð...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">Engin verkefni</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => {
              const company = companies[task.companyId];
              const overdue = isOverdue(task);
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                    task.completed && "opacity-60",
                    overdue && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggle(task)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium text-foreground", task.completed && "line-through text-muted-foreground")}>
                      {task.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{company?.name || "—"}</span>
                      {task.deadline && (
                        <span className={cn(
                          "text-xs flex items-center gap-1",
                          overdue ? "text-destructive font-semibold" : "text-muted-foreground"
                        )}>
                          {overdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {format(new Date(task.deadline), "dd.MM.yyyy HH:mm")}
                        </span>
                      )}
                      {task.completed && task.completedAt && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Klárað {format(new Date(task.completedAt), "dd.MM")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
