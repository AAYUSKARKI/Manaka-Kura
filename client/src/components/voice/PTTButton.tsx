import { Button } from "@/components/ui/button";
import { Mic, Signal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PTTButtonProps {
  isTransmitting: boolean;
  onToggle: (e: React.PointerEvent) => void;
  disabled?: boolean;
}

export function PTTButton({ isTransmitting, onToggle, disabled }: PTTButtonProps) {
  return (
    <div className="mt-8 sm:mt-12 flex flex-col items-center gap-4 sm:gap-6">
      <p className="text-[var(--text-secondary)] font-semibold text-base sm:text-xl">
        {isTransmitting ? "Release to Silence" : "Hold to Broadcast"}
      </p>

      <Button
        onPointerDown={onToggle}
        onPointerUp={onToggle}
        onPointerLeave={onToggle}
        onPointerCancel={onToggle}
        disabled={disabled}
        className={cn(
          "ptt-button w-48 h-48 xs:w-52 xs:h-52 sm:w-60 sm:h-60 rounded-full bg-[var(--bg-secondary)] border-6 sm:border-8 border-[var(--accent)] flex flex-col items-center justify-center gap-3 sm:gap-5 text-[var(--accent)] transition-all duration-300 shadow-2xl",
          isTransmitting ? "bg-[var(--accent)] text-[var(--bg-primary)] scale-105 border-[var(--accent-hover)] animate-transmit-pulse" : "hover:scale-105"
        )}
      >
        <Mic className={cn("w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24", isTransmitting && "animate-pulse")} />
        <span className="text-sm xs:text-base sm:text-lg font-extrabold uppercase tracking-widest">
          {isTransmitting ? "BROADCASTING" : "HOLD TO TALK"}
        </span>
      </Button>

      <p className="text-[var(--text-secondary)] text-sm sm:text-base flex items-center gap-2 sm:gap-3 opacity-80 animate-glow">
        <Signal className={cn("w-5 h-5 sm:w-6 sm:h-6", isTransmitting ? "text-[var(--success)] animate-spin" : "opacity-60")} />
        {isTransmitting ? "Waves in Motion" : "Awaiting Your Voice"}
      </p>
    </div>
  );
}