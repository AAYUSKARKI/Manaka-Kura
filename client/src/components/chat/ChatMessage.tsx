import { cn } from "@/lib/utils";

interface ChatMessageProps {
  userId: string;
  content: string;
  timestamp: Date;
  isCurrentUser: boolean;
}

export function ChatMessage({ userId, content, timestamp, isCurrentUser }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "p-2 sm:p-3 rounded-[var(--radius-lg)] max-w-[80%] shadow-sm transition-all duration-200 hover:scale-[1.02]",
        isCurrentUser
          ? "bg-[var(--accent)]/30 ml-auto border-r-4 border-[var(--accent)]"
          : "bg-[var(--bg-tertiary)]/80 border-l-4 border-[var(--border)]"
      )}
    >
      <p className="text-xs sm:text-sm font-bold opacity-80 mb-1">{userId}</p>
      <p className="text-sm sm:text-base break-words">{content}</p>
      <p className="text-[10px] opacity-50 mt-1 text-right">
        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}