import { cn } from "@/lib/utils";

interface ConnectionStatusBarProps {
  isConnected: boolean;
  connectionText: string;
  audioStatus: {
    state: string;
    message: string;
  };
}

export function ConnectionStatusBar({
  isConnected,
  connectionText,
  audioStatus,
}: ConnectionStatusBarProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Socket Connection Status */}
      <div
        className={cn(
          "flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-[var(--radius-xl)] shadow-lg transition-colors duration-300",
          !isConnected && "border-2 border-[var(--danger)]/50"
        )}
      >
        <div
          className={cn(
            "w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)]",
            isConnected 
              ? "bg-[var(--status-online)] animate-blink" 
              : "bg-[var(--danger)] shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          )}
        />
        <span className={cn(
          "font-semibold text-base sm:text-lg tracking-tight",
          !isConnected ? "text-[var(--danger)]" : "text-[var(--text-primary)]"
        )}>
          {connectionText}
        </span>
      </div>

      {/* Audio Engine Status */}
      <div
        className={cn(
          "p-4 sm:p-5 rounded-[var(--radius-xl)] text-center font-bold text-base sm:text-lg border-2 shadow-xl transition-all duration-500",
          `audio-status ${audioStatus.state}`
        )}
      >
        {audioStatus.message}
      </div>
    </div>
  );
}