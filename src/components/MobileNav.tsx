import { NavLink } from "react-router-dom";
import { Sun, PhoneCall, KanbanSquare, Coins, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Dagurinn", Icon: Sun },
  { to: "/leads", label: "Hringja", Icon: PhoneCall },
  { to: "/kanban", label: "Söluferli", Icon: KanbanSquare },
  { to: "/tasks", label: "Verkefni", Icon: ClipboardList },
  { to: "/finances", label: "Fjármál", Icon: Coins },
];

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="mx-3 mb-3 glass-strong rounded-2xl border-white/10 flex items-stretch">
        {ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive ? "text-orange-300" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-all", isActive && "ember-bg shadow-ember")}>
                  <Icon className={cn("w-4 h-4", isActive && "text-primary-foreground")} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}