import { useEffect } from 'react';
import type { Socket } from "socket.io-client";

interface SocketEventsProps {
  socket: Socket | null;
  onAuthSuccess: (data: any) => void;
  onUserJoined: (data: any) => void;
  onUserLeft: (userId: string) => void;
  onStatusChanged: (data: any) => void;
  onChatMessage: (data: any) => void;
  onTypingStart: (userId: string) => void;
  onTypingStop: (userId: string) => void;
}

export const useSocketEvents = ({
  socket,
  onAuthSuccess,
  onUserJoined,
  onUserLeft,
  onStatusChanged,
  onChatMessage,
  onTypingStart,
  onTypingStop,
}: SocketEventsProps) => {
  
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (payload: any) => {
      switch (payload.type) {
        case "auth_success":
          onAuthSuccess(payload);
          break;
        case "user_joined":
          onUserJoined(payload);
          break;
        case "user_left":
          onUserLeft(payload.userId);
          break;
        case "user_status_changed":
          onStatusChanged(payload);
          break;
        case "chat_message":
          onChatMessage(payload);
          break;
        case "typing_start":
          onTypingStart(payload.fromUserId);
          break;
        case "typing_stop":
          onTypingStop(payload.fromUserId);
          break;
        default:
          break;
      }
    };

    socket.on("message", handleMessage);
    return () => {
      socket.off("message", handleMessage);
    };
  }, [socket, onAuthSuccess, onUserJoined, onUserLeft, onStatusChanged, onChatMessage, onTypingStart, onTypingStop]);
};