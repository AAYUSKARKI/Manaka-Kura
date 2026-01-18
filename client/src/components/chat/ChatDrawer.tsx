import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send } from "lucide-react";
import { ChatMessage } from "./ChatMessage";

interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  currentUser: { username: string } | null;
  newMessage: string;
  setNewMessage: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  typingUsers: Set<string>;
  onTyping: () => void;
}

export function ChatDrawer({
  isOpen,
  onClose,
  messages,
  currentUser,
  newMessage,
  setNewMessage,
  onSendMessage,
  typingUsers,
  onTyping,
}: ChatDrawerProps) {
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ml-auto w-full sm:w-[420px] h-full bg-[var(--bg-secondary)] shadow-2xl animate-slide-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)]/30">
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            Channel Chat 
            <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          </h2>
          <Button variant="ghost" onClick={onClose} className="hover:scale-105">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scroll-smooth"
        >
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              userId={msg.userId}
              content={msg.content}
              timestamp={msg.timestamp}
              isCurrentUser={msg.userId === currentUser?.username}
            />
          ))}

          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="text-xs text-[var(--text-secondary)] animate-pulse italic ml-2">
              {[...typingUsers].join(", ")} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={onSendMessage}
          className="p-3 sm:p-4 border-t border-[var(--border)]/30 bg-[var(--bg-tertiary)]/20"
        >
          <div className="flex gap-2 items-end">
            <Textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                onTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage(e);
                }
              }}
              placeholder="Type your message..."
              className="flex-1 bg-[var(--bg-tertiary)]/60 border-none rounded-[var(--radius-lg)] focus-visible:ring-1 ring-[var(--accent)] resize-none min-h-[44px] max-h-[120px]"
            />
            <Button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] h-[44px] w-[44px] p-0 rounded-xl"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}