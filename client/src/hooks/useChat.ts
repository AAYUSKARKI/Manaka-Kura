import { useState, useRef, useCallback } from 'react';
import type { Socket } from "socket.io-client";

interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
}

export const useChat = (socket: Socket | null, currentUserName: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addMessage = useCallback((userId: string, content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        userId,
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !socket) return;

    socket.emit("message", {
      type: "chat_message",
      content,
    });

    // Optimistically add own message
    addMessage(currentUserName || "Me", content);
  }, [socket, currentUserName, addMessage]);

  const handleTyping = useCallback(() => {
    if (!socket) return;
    
    socket.emit("message", { type: "typing_start" });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("message", { type: "typing_stop" });
    }, 800);
  }, [socket]);

  return {
    messages,
    setMessages,
    typingUsers,
    setTypingUsers,
    sendMessage,
    handleTyping,
    addMessage
  };
};