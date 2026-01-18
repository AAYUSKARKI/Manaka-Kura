import { useEffect, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare } from "lucide-react";
import type { Socket } from "socket.io-client";
import { connectSocket } from "@/services/socket/socketService";
import { useWebRTC } from "@/hooks/useWebRTC";
import { LoginForm } from "../auth/LoginForm";
import { Header } from "../layout/Header";
import { ConnectionStatusBar } from "../layout/ConnectionStatusBar";
import { UserCard } from "../voice/UserCard";
import { PTTButton } from "../voice/PTTButton";
import { VolumeControl } from "../voice/VolumeControl";
import { ChatDrawer } from "../chat/ChatDrawer";
import { useAudioLevels } from "@/hooks/useAudioLevels";
import { useChat } from "@/hooks/useChat";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { Button } from "../ui/button";
import { PTTControls } from "../video/VideoToggle";

interface User {
  userId: string;
  username: string;
  status: string;
  connectionState?: string;
}

export default function ManakaKura() {
  const [currentUser, setCurrentUser] = useState<{ username: string; userId: string } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, User>>(new Map());
  const [userStatus, setUserStatus] = useState<"online" | "busy" | "away">("online");
  const [loginError, setLoginError] = useState("");
  const [connectionText, setConnectionText] = useState("Connecting...");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [animateJoin, setAnimateJoin] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [globalVolume, setGlobalVolume] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [audioStatus, setAudioStatus] = useState<{ state: string; message: string }>({
    state: "idle",
    message: "Ready to Transmit",
  });
  const socketRef = useRef<Socket | null>(null);

  const updateUserConnectionState = useCallback((userId: string, state: string) => {
    setOnlineUsers((prev) => {
      const newMap = new Map(prev);
      const user = newMap.get(userId);
      if (user) {
        user.connectionState = state;
      }
      return newMap;
    });
  }, []);

  const {
    isInitialized,
    isTransmitting,
    remoteStreams,
    startCalling,
    toggleTransmit,
    getAudioLevel,
    getRemoteAudioLevel,
    getPeerStatus,
    removePeer,
    getRemoteAudio,
    isVideoEnabled,
    localVideoStream,
    remoteVideoStreams,
    toggleVideo,
    managerRef,
  } = useWebRTC(socketRef.current, currentUser?.userId ?? null);

  const audioLevels = useAudioLevels(
    isInitialized,
    isTransmitting,
    currentUser?.username,
    onlineUsers,
    remoteStreams,
    getAudioLevel,
    getRemoteAudioLevel
  );

  const {
    messages,
    setMessages,
    typingUsers,
    setTypingUsers,
    sendMessage: chatSendMessage,
    handleTyping
  } = useChat(socketRef.current, currentUser?.username);

  const [newMessage, setNewMessage] = useState("");

  // Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("Service Worker registered:", registration.scope))
        .catch((error) => console.error("Service Worker registration failed:", error));
    }
  }, []);

  // Audio Context Unlock
  useEffect(() => {
    const unlock = () => {
      const audio = document.createElement("audio");
      audio.play().catch(() => { });
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  // ESC to close chat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsChatOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDarkMode]);

  // WebRTC Manager Events
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.onError = (err) => {
        setAudioStatus({ state: 'error', message: err.message });
      };
      managerRef.current.onConnectionStateChange = (userId, state) => {
        updateUserConnectionState(userId, state);
      };
    }
  }, [managerRef, updateUserConnectionState]);

  // Initiate Calls to New Users
  useEffect(() => {
    if (!isInitialized || !currentUser) return;
    onlineUsers.forEach((user) => {
      if (user.userId === currentUser.userId) return;
      if (getPeerStatus(user.userId) !== 'disconnected') return;
      // Avoid glare: initiate if my username > their username
      if (currentUser.username.localeCompare(user.userId) <= 0) return;
      console.log("🚀 Initiating offer to", user.userId);
      startCalling(user.userId);
    });
  }, [isInitialized, onlineUsers, currentUser, startCalling, getPeerStatus]);

  // Set Global Volume
  useEffect(() => {
    Array.from(remoteStreams.keys()).forEach((userId) => {
      const audio = getRemoteAudio(userId);
      if (audio) audio.volume = globalVolume;
    });
  }, [globalVolume, remoteStreams, getRemoteAudio]);

  const connectToServer = (username: string) => {
    const socket = connectSocket(username);
    socketRef.current = socket;
    socket.on("connect", () => {
      setIsConnected(true);
      setConnectionText("Connected");
      socket.emit("message", { type: "auth", username });
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
      setConnectionText("Disconnected");
    });
  };

  const handleLogin = async (username: string) => {
    if (!username || username.length < 2) {
      setLoginError("Username must be at least 2 characters");
      return;
    }
    setIsLoading(true);
    setLoginError("");
    try {
      const loginResponse = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      let user;
      if (loginResponse.status === 404) {
        const registerResponse = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (!registerResponse.ok) {
          const error = await registerResponse.json();
          throw new Error(error.error || "Registration failed");
        }
        const { data } = await registerResponse.json();
        user = { username: data.username, userId: data.userId };
      } else if (loginResponse.ok) {
        const { data } = await loginResponse.json();
        user = { username: data.username, userId: data.userId };
      } else {
        const error = await loginResponse.json();
        throw new Error(error.error || "Login failed");
      }
      setCurrentUser(user);
      connectToServer(username);
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(err.message);
      setIsLoading(false);
    }
  };

  const onAuthSuccess = (payload: any) => {
    setIsLoading(false);
    setCurrentUser({
      userId: payload.userId,
      username: payload.username,
    });
    if (payload.onlineUsers) {
      const newOnlineUsers = new Map<string, User>();
      for (const user of payload.onlineUsers) {
        if (user.userId !== payload.userId) {
          newOnlineUsers.set(user.userId, user);
        }
      }
      setOnlineUsers(newOnlineUsers);
    }
  };

  const onUserJoined = (payload: any) => {
    setAnimateJoin(payload.userId);
    setTimeout(() => setAnimateJoin(null), 1000);
    setOnlineUsers((prev) => {
      const newMap = new Map(prev);
      newMap.set(payload.userId, {
        userId: payload.userId,
        username: payload.username,
        status: "online",
      });
      return newMap;
    });
  };

  const onUserLeft = (userId: string) => {
    setOnlineUsers((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
    removePeer(userId);
  };

  const onStatusChanged = (payload: any) => {
    if (payload.userId === currentUser?.username) {
      setUserStatus(payload.status);
    }
    setOnlineUsers((prev) => {
      const newMap = new Map(prev);
      const user = newMap.get(payload.userId);
      if (user) user.status = payload.status;
      return newMap;
    });
  };

  const onChatMessage = (payload: any) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        userId: payload.fromUserId,
        content: payload.content,
        timestamp: new Date(),
      },
    ]);
  };

  const onTypingStart = (userId: string) => {
    setTypingUsers((prev) => new Set(prev).add(userId));
  };

  const onTypingStop = (userId: string) => {
    setTypingUsers((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  useSocketEvents({
    socket: socketRef.current,
    onAuthSuccess,
    onUserJoined,
    onUserLeft,
    onStatusChanged,
    onChatMessage,
    onTypingStart,
    onTypingStop,
  });

  const changeStatus = (status: "online" | "busy" | "away") => {
    setUserStatus(status);
    socketRef.current?.emit("message", { type: "status_change", status });
    setIsStatusModalOpen(false);
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setOnlineUsers(new Map());
    setCurrentUser(null);
    setUserStatus("online");
    setLoginError("");
    setMessages([]);
  };

  const togglePTT = (e: React.PointerEvent) => {
    if (audioStatus.state === "error") return;
    if (e.type === 'pointerdown') {
      toggleTransmit(true);
      setAudioStatus({ state: "transmitting", message: "Broadcasting Live" });
      if (navigator.vibrate) navigator.vibrate(50);
    } else if (e.type === 'pointerup' || e.type === 'pointerleave' || e.type === 'pointercancel') {
      toggleTransmit(false);
      setAudioStatus({ state: "idle", message: "Ready to Transmit" });
      if (navigator.vibrate) navigator.vibrate([30, 30]);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    chatSendMessage(newMessage);
    setNewMessage("");
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  const localUser: User | null = currentUser ? {
    userId: currentUser.userId,
    username: currentUser.username,
    status: userStatus,
    connectionState: 'connected'
  } : null;

  return (
    <div className="min-h-screen flex flex-col bg-background touch-none select-none overflow-hidden scroll-smooth antialiased">
      {!currentUser ? (
        <LoginForm onLogin={handleLogin} error={loginError} />
      ) : (
        <>
          <Header
            currentUser={currentUser}
            userStatus={userStatus}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            isStatusModalOpen={isStatusModalOpen}
            setIsStatusModalOpen={setIsStatusModalOpen}
            onChangeStatus={changeStatus}
            onLogout={handleDisconnect}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
            <ConnectionStatusBar
              isConnected={isConnected}
              connectionText={connectionText}
              audioStatus={audioStatus}
            />
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-3 text-foreground tracking-tight">
                Active Voices <Badge className="bg-primary/80 text-primary-foreground rounded-full px-3 py-1 text-sm shadow-sm">{onlineUsers.size + 1}</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {localUser && (
                  <UserCard
                    key={localUser.userId}
                    user={localUser}
                    audioLevel={audioLevels[localUser.userId] || 0}
                    isJoining={false}
                    videoStream={localVideoStream}
                    isAudioActive={audioLevels[localUser.userId] > 0.1 || isTransmitting}
                    isLocal={true}
                  />
                )}
                {onlineUsers.size === 0 && !localUser ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground animate-pulse text-lg">
                    <p className="font-medium">Silence in the air...</p>
                    <p className="text-sm mt-2">Invite your friends to join!</p>
                  </div>
                ) : (
                  Array.from(onlineUsers.values()).map((user) => (
                    <UserCard
                      key={user.userId}
                      user={user}
                      audioLevel={audioLevels[user.userId] || 0}
                      isJoining={animateJoin === user.userId}
                      videoStream={remoteVideoStreams.get(user.userId)}
                      isAudioActive={audioLevels[user.userId] > 0.1}
                    />
                  ))
                )}
              </div>
            </section>
            <PTTControls
              isTransmitting={isTransmitting}
              isVideoEnabled={isVideoEnabled}
              onTogglePTT={togglePTT}
              onToggleVideo={toggleVideo}
              disabled={audioStatus.state === "error"}
            />
            <VolumeControl volume={globalVolume} onVolumeChange={setGlobalVolume} />
            <Button
              onClick={toggleChat}
              className="fixed bottom-8 right-6 bg-primary/80 text-primary-foreground rounded-full p-3 shadow-md hover:scale-105 transition-all duration-200 hover:shadow-lg hover:bg-primary active:scale-95"
            >
              <MessageSquare className="w-6 h-6" />
            </Button>
            <ChatDrawer
              isOpen={isChatOpen}
              onClose={toggleChat}
              messages={messages}
              currentUser={currentUser}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={handleSendMessage}
              typingUsers={typingUsers}
              onTyping={handleTyping}
            />
          </main>
        </>
      )}
      {isLoading && (
        <div className="fixed inset-0 bg-background/95 flex items-center justify-center z-50">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
        </div>
      )}
    </div>
  );
}