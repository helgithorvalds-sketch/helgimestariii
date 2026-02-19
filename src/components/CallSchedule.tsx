import { useState } from "react";
import { Company } from "@/types";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { Phone, Clock, AlertCircle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { StageBadge } from "./StageBadge";
import { CallLog, fetchCallLogs } from "@/services/callLogService";
import { Button } from "@/components/ui/button";

interface CallScheduleProps {
  companies: Company[];
  onCompanyClick: (company: Company) => void;
}

export function CallSchedule({ companies, onCompanyClick }: CallScheduleProps) {
  const [expandedLogs, setExpandedLogs] = useState<Record<string, CallLog[] | null>>({});
  const [loadingLogs, setLoadingLogs] = useState<string | null>(null);

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

  const toggleCallLogs = async (companyId: string) => {
    if (expandedLogs[companyId] !== undefined) {
      setExpandedLogs((prev) => {
        const next = { ...prev };
        delete next[companyId];
        return next;
      });
      return;
    }
    setLoadingLogs(companyId);
    const logs = await fetchCallLogs(companyId);
    setExpandedLogs((prev) => ({ ...prev, [companyId]: logs }));
    setLoadingLogs(null);
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
            {scheduled.map((company) => {
              const isExpanded = expandedLogs[company.id] !== undefined;
              const logs = expandedLogs[company.id];
              return (
                <div
                  key={company.id}
                  className={`rounded-lg overflow-hidden transition-all ${getRowStyle(company.nextCallAt!)}`}
                >
                  <div
                    onClick={() => onCompanyClick(company)}
                    className="p-3 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{company.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StageBadge stage={company.stage} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {company.estimatedPrice.toLocaleString("is-IS")} kr.
                          </span>
                        </div>
                        {/* Phone number */}
                        {company.phone && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            <a
                              href={`tel:${company.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary font-medium hover:underline"
                            >
                              {company.phone}
                            </a>
                          </div>
                        )}
                        {company.owner && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Tengiliður: {company.owner}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isPast(parseISO(company.nextCallAt!)) ? "text-destructive" : "text-foreground"}`}>
                          {formatCallDate(company.nextCallAt!)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCallTime(company.nextCallAt!)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Previous calls toggle */}
                  <div className="px-3 pb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCallLogs(company.id);
                      }}
                      className="gap-1.5 text-xs text-muted-foreground h-7 px-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {loadingLogs === company.id ? "Hleð..." : "Fyrri símtöl"}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>

                    {isExpanded && logs && (
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-border">
                        {logs.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">Engin fyrri símtöl skráð</p>
                        ) : (
                          logs.map((log) => (
                            <div key={log.id} className="rounded-md bg-background p-2.5 border">
                              <p className="text-xs text-muted-foreground font-medium mb-0.5">
                                {format(parseISO(log.calledAt), "dd.MM.yyyy · HH:mm")}
                              </p>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{log.notes}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
