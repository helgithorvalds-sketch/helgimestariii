import { Mic, Square } from "lucide-react";
import { useVoiceDictation } from "@/hooks/useVoiceDictation";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  onAppend: (text: string) => void;
  onInterim?: (text: string) => void;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

export function MicButton({ onAppend, onInterim, size = "md", className, title }: MicButtonProps) {
  const { supported, recording, start, stop } = useVoiceDictation(onAppend, onInterim);
  if (!supported) return null;
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <button
      type="button"
      onClick={() => (recording ? stop() : start())}
      title={title || (recording ? "Stöðva" : "Tala inn glósu")}
      className={cn(
        "relative shrink-0 rounded-full flex items-center justify-center glass border-white/10 transition-all",
        recording ? "text-orange-300 border-orange-400/60" : "text-muted-foreground hover:text-foreground",
        dim,
        className,
      )}
    >
      {recording && (
        <>
          <span className="absolute inset-0 rounded-full bg-ember opacity-30 animate-ping" />
          <span className="absolute -inset-0.5 rounded-full ring-2 ring-orange-400/60 animate-pulse" />
        </>
      )}
      {recording ? <Square className={cn(icon, "relative")} /> : <Mic className={cn(icon, "relative")} />}
    </button>
  );
}