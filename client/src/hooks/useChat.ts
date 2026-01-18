import { useState, useRef, useCallback, useEffect } from 'react';
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

  // inside useChat.ts
useEffect(() => {
  if (!socket) return;

  const handleSocketMessage = (data: any) => {
    const myId = currentUserName || "Me";
    switch (data.type) {
      case "chat_message":
        // Only add if it's from someone else (to avoid duplicates from optimistic UI)
      //   if (data.fromUserId !== myId) {
      //   addMessage(data.username || data.fromUserId, data.content);
      // }
        break;

      case "typing_start":
        if (data.fromUserId !== myId) {
          setTypingUsers((prev) => new Set(prev).add(data.username || data.fromUserId));
        }
        break;

      case "typing_stop":
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.username || data.fromUserId);
          return next;
        });
        break;
    }
  };

  socket.on("message", handleSocketMessage);

  return () => {
    socket.off("message", handleSocketMessage);
  };
}, [socket, currentUserName, addMessage]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !socket) return;

    socket.emit("message", {
      type: "chat_message",
      content,
      fromUserId: currentUserName || "Me",
      username: currentUserName || "Me",
    });

    // Optimistically add own message
    // addMessage(currentUserName || "Me", content);
  }, [socket, currentUserName, addMessage]);

  const handleTyping = useCallback(() => {
    if (!socket) return;
    const payload = { 
    fromUserId: currentUserName, // Changed from userId
    username: currentUserName    // Added username
  };
    socket.emit("message", { type: "typing_start", ...payload });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("message", { type: "typing_stop", ...payload });
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