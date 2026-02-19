import { Company } from "@/types";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { is } from "date-fns/locale";
import { Phone, Clock, AlertCircle } from "lucide-react";
import { StageBadge } from "./StageBadge";

interface CallScheduleProps {
  companies: Company[];
  onCompanyClick: (company: Company) => void;
}

export function CallSchedule({ companies, onCompanyClick }: CallScheduleProps) {
  const scheduled = companies
    .filter((c) => c.nextCallAt)
    .sort((a, b) => new Date(a.nextCallAt!).getTime() - new Date(b.nextCallAt!).getTime());

  const unscheduled = companies.filter((c) => !c.nextCallAt);

  const formatCallDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Í dag";
    if (isTomorrow(date)) return "Á morgun";
    return format(date, "dd.MM.yyyy");
  };

  const formatCallTime = (dateStr: string) => {
    return format(parseISO(dateStr), "HH:mm");
  };

  const getRowStyle = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isPast(date)) return "border-l-4 border-l-destructive bg-destructive/5";
    if (isToday(date)) return "border-l-4 border-l-primary bg-primary/5";
    if (isTomorrow(date)) return "border-l-4 border-l-amber-500 bg-amber-500/5";
    return "border-l-4 border-l-border";
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Schedule - 2/3 */}
      <div className="col-span-2 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Áætlun símtala</h2>
          <span className="text-sm text-muted-foreground ml-auto">{scheduled.length} skipulögð</span>
        </div>

        {scheduled.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Engin símtöl skipulögð</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduled.map((company) => (
              <div
                key={company.id}
                onClick={() => onCompanyClick(company)}
                className={`rounded-lg p-3 cursor-pointer hover:shadow-md transition-all ${getRowStyle(company.nextCallAt!)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm text-foreground">{company.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StageBadge stage={company.stage} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {company.estimatedPrice.toLocaleString("is-IS")} kr.
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isPast(parseISO(company.nextCallAt!)) ? "text-destructive" : "text-foreground"}`}>
                      {formatCallDate(company.nextCallAt!)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatCallTime(company.nextCallAt!)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unscheduled - 1/3 */}
      <div className="col-span-1 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">Óskipulögð</h2>
          <span className="text-sm text-muted-foreground ml-auto">{unscheduled.length}</span>
        </div>

        {unscheduled.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Öll fyrirtæki skipulögð! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unscheduled.map((company) => (
              <div
                key={company.id}
                onClick={() => onCompanyClick(company)}
                className="rounded-lg border p-3 cursor-pointer hover:shadow-md transition-all hover:bg-muted/30"
              >
                <p className="font-medium text-sm text-foreground">{company.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StageBadge stage={company.stage} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {company.estimatedPrice.toLocaleString("is-IS")} kr.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
