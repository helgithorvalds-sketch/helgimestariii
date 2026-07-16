import { Company } from "@/types";
import { StageBadge } from "@/components/StageBadge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinancesPageProps {
  companies: Company[];
}

function CircleProgress({ projected, earned }: { projected: number; earned: number }) {
  const size = 280;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = projected > 0 ? Math.min(earned / projected, 1) : 0;
  const offset = circumference - progress * circumference;

  const formatPrice = (n: number) => n.toLocaleString("is-IS") + " kr.";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(150, 60%, 45%)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-3xl font-bold text-foreground">{formatPrice(earned)}</p>
        <p className="text-sm text-muted-foreground">af {formatPrice(projected)}</p>
        <p className="text-lg font-semibold mt-1" style={{ color: "hsl(150, 60%, 45%)" }}>
          {Math.round(progress * 100)}%
        </p>
      </div>
    </div>
  );
}

export default function Finances({ companies }: FinancesPageProps) {
  const navigate = useNavigate();

  const totalProjected = companies.reduce((sum, c) => sum + (c.projectedEarnings || 0), 0);
  const totalEarned = companies.filter((c) => c.amountPaid).reduce((sum, c) => sum + (c.amountPaid || 0), 0);
  const remaining = totalProjected - totalEarned;

  const formatPrice = (n: number) => n.toLocaleString("is-IS") + " kr.";

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fjárhagur</h1>
            <p className="text-sm text-muted-foreground">Áætlaður hagnaður og innleystur</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Circle */}
        <div className="flex justify-center mb-10 relative">
          <CircleProgress projected={totalProjected} earned={totalEarned} />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border bg-card p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Áætlaður hagnaður</p>
            <p className="text-xl font-bold text-primary">{formatPrice(totalProjected)}</p>
          </div>
          <div className="rounded-xl border bg-card p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Innleyst</p>
            <p className="text-xl font-bold" style={{ color: "hsl(150, 60%, 45%)" }}>{formatPrice(totalEarned)}</p>
          </div>
          <div className="rounded-xl border bg-card p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Eftir</p>
            <p className="text-xl font-bold text-muted-foreground">{formatPrice(remaining)}</p>
          </div>
        </div>

        {/* Company breakdown table */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-bold text-foreground mb-4">Sundurliðun eftir fyrirtækjum</h2>
          <div className="space-y-1">
            <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground px-2 pb-2">
              <span>Fyrirtæki</span>
              <span className="text-right">Áætlað</span>
              <span className="text-right">Greitt</span>
              <span className="text-right">Eftir</span>
              <span className="text-right">Staða</span>
            </div>
            {companies.map((c) => {
              const compRemaining = (c.projectedEarnings || 0) - (c.amountPaid || 0);
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-5 items-center py-2.5 px-2 rounded-md hover:bg-muted/50 text-sm border-b last:border-0"
                >
                  <div>
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.owner}</p>
                  </div>
                  <p className="text-right text-muted-foreground">{formatPrice(c.projectedEarnings || 0)}</p>
                  <p className="text-right font-medium">{c.amountPaid ? formatPrice(c.amountPaid) : "—"}</p>
                  <p className="text-right text-muted-foreground">{formatPrice(Math.max(0, compRemaining))}</p>
                  <div className="flex justify-end">
                    <StageBadge stage={c.stage} />
                  </div>
                </div>
              );
            })}
            {companies.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Engin fyrirtæki skráð ennþá</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
