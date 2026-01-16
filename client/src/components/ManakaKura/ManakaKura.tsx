import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Mic, Radio, LogOut, Signal, Moon, Sun, Volume2, MessageSquare, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Socket } from "socket.io-client";
import { connectSocket } from "@/services/socket/socketService";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

interface User {
  userId: string;
  username: string;
  status: string;
  connectionState?: string;
  audioLevel?: number;
}

interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
}

export default function ManakaKura() {
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    audioStatus,
    initiateOffer,
    handleSignal,
    startTalking,
    stopTalking,
    isInitialized
  } = useWebRTC({
    socket: socketRef.current,
    username: currentUser?.username,
    onConnectionStateChange: updateUserConnectionState
  });

  useEffect(() => {
    // Service Worker registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("Service Worker registered:", registration.scope))
        .catch((error) => console.error("Service Worker registration failed:", error));
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsChatOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);


  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDarkMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isInitialized && audioStatus.state === 'transmitting') {
        // Simulate audio levels for self and others
        setAudioLevels((prev) => ({
          ...prev,
          [currentUser?.username || 'self']: Math.random(),
          ...Array.from(onlineUsers.keys()).reduce((acc, userId) => {
            acc[userId] = Math.random() * 0.5;
            return acc;
          }, {} as Record<string, number>)
        }));
      } else {
        setAudioLevels({});
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isInitialized, audioStatus.state, currentUser, onlineUsers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = usernameInputRef.current?.value.trim();
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
        console.log(data.username, "registered successs");
        user = { username: data.username };
        console.log("New user registered:", username);
      } else if (loginResponse.ok) {
        const { data } = await loginResponse.json();
        console.log(data);
        user = { username: data.username };
        console.log("User logged in:", username);
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

    socket.on("message", (payload) => handleServerMessage(payload));
  };

  const handleServerMessage = async (message: any) => {
    switch (message.type) {
      case "auth_success":
        setIsLoading(false);
        if (message.onlineUsers) {
          const newOnlineUsers = new Map<string, User>();
          for (const user of message.onlineUsers) {
            if (user.userId !== currentUser?.username) {
              newOnlineUsers.set(user.userId, user);
              initiateOffer(user.userId);
            }
          }
          setOnlineUsers(newOnlineUsers);
        }
        break;

      case "user_joined":
        setAnimateJoin(message.userId);
        setTimeout(() => setAnimateJoin(null), 1000);
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.set(message.userId, {
            userId: message.userId,
            username: message.username,
            status: "online",
          });
          return newMap;
        });
        initiateOffer(message.userId);
        break;

      case "user_left":
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(message.userId);
          return newMap;
        });
        break;

      case "signal":
        if (message.signal) {
          await handleSignal(message.fromUserId, message.signal);
        }
        break;

      case "user_status_changed":
        if (message.userId === currentUser?.username) {
          setUserStatus(message.status);
        }
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          const user = newMap.get(message.userId);
          if (user) user.status = message.status;
          return newMap;
        });
        break;

      case "chat_message":
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            userId: message.fromUserId,
            content: message.content,
            timestamp: new Date(),
          },
        ]);
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
        break;

      case "typing_start":
        setTypingUsers((prev) => new Set(prev).add(message.userId));
        break;

      case "typing_stop":
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(message.userId);
          return next;
        });
        break;
    }
  };

  const changeStatus = (status: "online" | "busy" | "away") => {
    setUserStatus(status);
    socketRef.current?.emit("message", {
      type: "status_change",
      status
    });
    setIsStatusModalOpen(false);
  };

  const handleDisconnect = () => {
    const socket = socketRef.current;
    if (socket) {
      socket.disconnect();
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
      console.log("[App] PTT Toggle: ON");
      startTalking();
      if (navigator.vibrate) navigator.vibrate(50);
    } else if (e.type === 'pointerup' || e.type === 'pointerleave' || e.type === 'pointercancel') {
      console.log("[App] PTT Toggle: OFF");
      stopTalking();
      if (navigator.vibrate) navigator.vibrate([30, 30]);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    socketRef.current.emit("message", {
      type: "chat_message",
      content: newMessage,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        userId: currentUser?.username || "",
        content: newMessage,
        timestamp: new Date(),
      },
    ]);
    setNewMessage("");
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] touch-none select-none overflow-hidden">
      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
          <Card className="w-full max-w-md bg-[var(--bg-secondary)]/90 backdrop-blur-lg border-none shadow-2xl rounded-[var(--radius-2xl)] animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto mb-6 animate-glow">
                <Radio className="w-16 h-16 sm:w-24 sm:h-24 text-[var(--accent)]" />
              </div>
              <CardTitle className="text-3xl sm:text-4xl font-extrabold animate-glow">Manaka Kura</CardTitle>
              <p className="text-[var(--text-secondary)] mt-3 text-base sm:text-lg">Seamless Connections, Infinite Conversations</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  ref={usernameInputRef}
                  type="text"
                  placeholder="Choose your handle"
                  className="bg-[var(--bg-tertiary)]/60 border border-[var(--border)]/30 text-[var(--text-primary)] placeholder-[var(--text-secondary)] rounded-[var(--radius-lg)] focus:ring-[var(--ring)] transition-all duration-300 hover:border-[var(--accent)]/50 text-base sm:text-lg"
                />
                <Button type="submit" className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)] rounded-[var(--radius-lg)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(var(--accent-rgb),0.6)] hover:scale-105 text-base sm:text-lg">
                  Join the Wave
                </Button>
              </form>
              {loginError && <p className="text-[var(--danger)] text-center animate-bounce text-sm sm:text-base">{loginError}</p>}
              <p className="text-[var(--text-secondary)] text-center text-sm sm:text-base">
                Dive in – your voice awaits!
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <header className="bg-[var(--bg-secondary)]/90 backdrop-blur-xl p-3 sm:p-4 lg:p-6 flex justify-between items-center shadow-xl sticky top-0 z-50">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 bg-[var(--bg-tertiary)]/60 px-3 sm:px-5 py-2 sm:py-3 rounded-full backdrop-blur-md shadow-md">
                <div className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full status-indicator animate-pulse-border ${userStatus}`}></div>
                <span className="font-bold text-base sm:text-lg animate-glow">{currentUser.username}</span>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-4 items-center">
              <Switch
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
                className="data-[state=checked]:bg-[var(--accent)]"
              />
              {isDarkMode ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
              <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="p-2 sm:p-3 hover:bg-[var(--bg-tertiary)]/50 rounded-full transition-all hover:scale-110">
                    <Signal className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-none rounded-[var(--radius-2xl)] shadow-2xl max-w-[90vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-[var(--text-primary)] text-xl sm:text-2xl">Set Your Vibe</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4">
                    <Button onClick={() => changeStatus("online")} className="w-full justify-start gap-3 sm:gap-4 bg-[var(--bg-tertiary)]/50 hover:bg-[var(--accent-hover)]/30 rounded-[var(--radius-lg)] transition-all hover:scale-105 text-base sm:text-lg">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full status-indicator online animate-pulse"></div>
                      Online
                    </Button>
                    <Button onClick={() => changeStatus("busy")} className="w-full justify-start gap-3 sm:gap-4 bg-[var(--bg-tertiary)]/50 hover:bg-[var(--accent-hover)]/30 rounded-[var(--radius-lg)] transition-all hover:scale-105 text-base sm:text-lg">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full status-indicator busy animate-pulse"></div>
                      Busy
                    </Button>
                    <Button onClick={() => changeStatus("away")} className="w-full justify-start gap-3 sm:gap-4 bg-[var(--bg-tertiary)]/50 hover:bg-[var(--accent-hover)]/30 rounded-[var(--radius-lg)] transition-all hover:scale-105 text-base sm:text-lg">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full status-indicator away animate-pulse"></div>
                      Away
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" onClick={handleDisconnect} className="p-2 sm:p-3 hover:bg-[var(--bg-tertiary)]/50 rounded-full transition-all hover:scale-110">
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--danger)]" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full mx-auto w-full space-y-6 sm:space-y-8 overflow-y-auto">
            <div className={cn("flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-[var(--radius-xl)] shadow-lg", !isConnected && "text-[var(--danger)]")}>
              <div className={cn("w-3 h-3 sm:w-4 sm:h-4 rounded-full", isConnected ? "bg-[var(--status-online)] animate-blink" : "bg-[var(--danger)]")}></div>
              <span className="font-semibold text-base sm:text-lg">{connectionText}</span>
            </div>
            <div className={cn("p-4 sm:p-5 rounded-[var(--radius-xl)] text-center font-bold text-base sm:text-lg border-2 shadow-xl", `audio-status ${audioStatus.state}`)}>
              {audioStatus.message}
            </div>
            <section>
              <h2 className="text-xl sm:text-2xl font-extrabold mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4">
                Active Voices <Badge className="bg-[var(--accent)] text-[var(--bg-primary)] rounded-full px-3 sm:px-4 py-1 text-sm sm:text-base">{onlineUsers.size}</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {onlineUsers.size === 0 ? (
                  <div className="col-span-full text-center py-12 sm:py-16 text-[var(--text-secondary)] animate-pulse text-base sm:text-xl">
                    <p>Silence in the air...</p>
                    <p className="text-sm sm:text-base mt-2 sm:mt-3">Summon your squad!</p>
                  </div>
                ) : (
                  Array.from(onlineUsers.values()).map((user) => (
                    <Card
                      key={user.userId}
                      className={cn(
                        "user-card bg-[var(--bg-secondary)]/90 backdrop-blur-lg border-none rounded-[var(--radius-xl)] shadow-xl hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.4)] transition-all duration-300",
                        user.connectionState === "connected" && "border-l-6 sm:border-l-8 border-[var(--success)]",
                        animateJoin === user.userId && "animate-user-join"
                      )}
                    >
                      <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)] font-extrabold text-2xl sm:text-3xl relative shadow-2xl mb-3 sm:mb-4">
                          {user.username.charAt(0).toUpperCase()}
                          <div className={`absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-[var(--bg-secondary)] status-indicator animate-pulse-border ${user.status}`}></div>
                          {user.connectionState === "connected" && (
                            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-[var(--accent)] rounded-full border-2 border-[var(--bg-secondary)] animate-pulse-audio"></div>
                          )}
                        </div>
                        <p className="font-semibold text-lg sm:text-xl mb-1">{user.username}</p>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] capitalize mb-2 sm:mb-3">{user.status}</p>
                        {user.connectionState === "connected" && (
                          <div className="flex gap-1 h-5 sm:h-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className="audio-wave-bar w-1 sm:w-1.5"
                                style={{
                                  height: `${Math.random() * 100}%`,
                                  animationDelay: `${i * 0.2}s`,
                                  opacity: audioLevels[user.userId] || 0,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>
            <div className="mt-8 sm:mt-12 flex flex-col items-center gap-4 sm:gap-6">
              <p className="text-[var(--text-secondary)] font-semibold text-base sm:text-xl">
                {audioStatus.state === "transmitting" ? "Release to Silence" : "Hold to Broadcast"}
              </p>

              <Button
                onPointerDown={togglePTT}
                onPointerUp={togglePTT}
                onPointerLeave={togglePTT}
                onPointerCancel={togglePTT}
                disabled={audioStatus.state === "receiving" || audioStatus.state === "error"}
                className={cn(
                  "ptt-button w-48 h-48 xs:w-52 xs:h-52 sm:w-60 sm:h-60 rounded-full bg-[var(--bg-secondary)] border-6 sm:border-8 border-[var(--accent)] flex flex-col items-center justify-center gap-3 sm:gap-5 text-[var(--accent)] transition-all duration-300 shadow-2xl",
                  audioStatus.state === "transmitting" ? "bg-[var(--accent)] text-[var(--bg-primary)] scale-105 sm:scale-110 border-[var(--accent-hover)] shadow-[0_0_40px_rgba(var(--accent-rgb),0.8)] animate-transmit-pulse" : "hover:scale-105 hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.6)]"
                )}
              >
                <Mic className={cn("w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24", audioStatus.state === "transmitting" && "animate-pulse")} />
                <span className="text-sm xs:text-base sm:text-lg font-extrabold uppercase tracking-widest">
                  {audioStatus.state === "transmitting" ? "BROADCASTING" : "HOLD TO TALK"}
                </span>
              </Button>

              <div className="flex items-center gap-3 sm:gap-4 mt-3 sm:mt-4">
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--accent)]" />
                <Slider
                  value={[globalVolume * 100]}
                  onValueChange={(value) => setGlobalVolume(value[0] / 100)}
                  max={100}
                  step={1}
                  className="w-32 xs:w-40 sm:w-48"
                />
              </div>

              <p className="text-[var(--text-secondary)] text-sm sm:text-base flex items-center gap-2 sm:gap-3 opacity-80 animate-glow">
                <Signal className={cn("w-5 h-5 sm:w-6 sm:h-6", audioStatus.state === "transmitting" ? "text-[var(--success)] animate-spin" : "opacity-60")} />
                {audioStatus.state === "transmitting" ? "Waves in Motion" : "Awaiting Your Voice"}
              </p>
            </div>

            <Button
              onClick={toggleChat}
              className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 bg-[var(--accent)] text-[var(--bg-primary)] rounded-full p-3 sm:p-4 shadow-2xl hover:scale-110 transition-all animate-bounce"
            >
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8" />
            </Button>

            {isChatOpen && (
              <div
                className="fixed inset-0 z-40 flex bg-black/40 backdrop-blur-sm overflow-auto"
                onClick={() => setIsChatOpen(false)}
              >
                {/* Chat Drawer */}
                <div
                  className="ml-auto w-full sm:w-[420px] h-full bg-[var(--bg-secondary)] shadow-2xl animate-slide-in flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)]/30">
                    <h2 className="text-lg sm:text-xl font-bold">Channel Chat</h2>
                    <Button
                      variant="ghost"
                      onClick={() => setIsChatOpen(false)}
                      className="hover:scale-105 transition"
                    >
                      <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>

                  {/* Messages */}
                  <div
                    ref={chatRef}
                    className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4"
                  >
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "p-2 sm:p-3 rounded-[var(--radius-lg)] max-w-[80%] shadow-sm",
                          msg.userId === currentUser?.username
                            ? "bg-[var(--accent)]/30 ml-auto"
                            : "bg-[var(--bg-tertiary)]/80"
                        )}
                      >
                        <p className="text-xs sm:text-sm font-semibold">{msg.userId}</p>
                        <p className="text-sm sm:text-base">{msg.content}</p>
                        <p className="text-xs opacity-60 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {typingUsers.size > 0 && (
                      <div className="text-xs text-[var(--text-secondary)] animate-pulse">
                        {[...typingUsers].join(", ")} typing…
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={sendMessage}
                    className="p-3 sm:p-4 border-t border-[var(--border)]/30 flex gap-2"
                  >
                    <Textarea
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);

                        socketRef.current?.emit("message", { type: "typing_start" });

                        if (typingTimeoutRef.current) {
                          clearTimeout(typingTimeoutRef.current);
                        }

                        typingTimeoutRef.current = setTimeout(() => {
                          socketRef.current?.emit("message", { type: "typing_stop" });
                        }, 800);
                      }}
                      placeholder="Type your message..."
                      className="flex-1 bg-[var(--bg-tertiary)]/60 border-none rounded-[var(--radius-lg)] text-sm sm:text-base"
                    />
                    <Button type="submit" className="bg-[var(--accent)] text-sm sm:text-base">
                      Send
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </main>
        </>
      )}
      {isLoading && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/98 flex items-center justify-center z-50">
          <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 text-[var(--accent)] animate-spin" />
        </div>
      )}
    </div>
  );
}