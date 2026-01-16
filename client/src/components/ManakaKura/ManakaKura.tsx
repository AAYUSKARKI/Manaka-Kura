import { useEffect, useRef, useState } from "react";
import { WebRTCManager } from "@/services/webrtc/WebRTCManager"; // Assuming path
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Mic, Radio, LogOut, UserCircle, Signal, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils"; // Shadcn cn utility
import type { Socket } from "socket.io-client";
import { connectSocket } from "@/services/socket/socketService";

interface User {
  userId: string;
  username: string;
  status: string;
  connectionState?: string;
}

export default function ManakaKura() {
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, User>>(new Map());
  const [userStatus, setUserStatus] = useState<"online" | "busy" | "away">("online");
  const [isPTTPressed, setIsPTTPressed] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [connectionText, setConnectionText] = useState("Connecting...");
  const [isConnected, setIsConnected] = useState(false);
  const [audioStatusMessage, setAudioStatusMessage] = useState("Initializing audio...");
  const [audioStatusState, setAudioStatusState] = useState<"ready" | "transmitting" | "receiving" | "error">("ready");
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  console.log(audioStatusState)
  useEffect(() => {
    // Service Worker registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("Service Worker registered:", registration.scope))
        .catch((error) => console.error("Service Worker registration failed:", error));
    }
  }, []);

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
        console.log(data.username, "registered successs")
        user = data.username;
        console.log("New user registered:", username);
      } else if (loginResponse.ok) {
        const { data } = await loginResponse.json();
        console.log(data)
        user = data.username;
        console.log("User logged in:", username);
      } else {
        const error = await loginResponse.json();
        throw new Error(error.error || "Login failed");
      }
      setCurrentUser(user);
      await initializeAudio();
      connectToServer(user);
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(err.message);
      setIsLoading(false);
    }
  };

  const initializeAudio = async () => {
    try {
      webrtcRef.current = new WebRTCManager();
      webrtcRef.current.onConnectionStateChange = (userId, state) => {
        console.log(`[App] Peer ${userId} state:`, state);
        updateUserConnectionState(userId, state);
      };
      webrtcRef.current.onRemoteStream = (userId, stream, audio) => {
        console.log(`[App] Receiving audio from:`, userId);
        setAudioStatusMessage(`Receiving from ${userId}`);
        setAudioStatusState("receiving");
      };
      webrtcRef.current.onError = (error) => {
        console.error("[App] WebRTC error:", error);
        setAudioStatusMessage(error.message);
        setAudioStatusState("error");
      };
      webrtcRef.current.onIceCandidate = (userId, candidate) => {
        sendSignal(userId, { type: "ice-candidate", candidate: candidate.toJSON() });
      };
      const success = await webrtcRef.current.initialize();
      if (success) {
        setAudioStatusMessage("Microphone ready");
        setAudioStatusState("ready");
        console.log("[App] Audio initialized successfully");
      } else {
        setAudioStatusMessage("Microphone access denied");
        setAudioStatusState("error");
      }
    } catch (err) {
      console.error("[App] Failed to initialize audio:", err);
      setAudioStatusMessage("Audio initialization failed");
      setAudioStatusState("error");
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

    // Handle all server messages directly here
    socket.on("message", (payload) => handleServerMessage(payload));
  };

  const handleServerMessage = async (message: any) => {
    switch (message.type) {
      case "auth_success":
        console.log("Authentication successful");
        setIsLoading(false);
        setCurrentUser({ username: message.username });
        if (message.onlineUsers) {
          const newOnlineUsers = new Map<string, User>();
          for (const user of message.onlineUsers) {
            if (user.userId !== currentUser?.username) {
              newOnlineUsers.set(user.userId, user);
              // ONLY offer if my name is "greater" than theirs (Tie-breaker)
              if (message.username > user.userId) {
                await createWebRTCOffer(user.userId);
              }
            }
          }
          setOnlineUsers(newOnlineUsers);
        }
        if (message.onlineUsers) {
          const newOnlineUsers = new Map<string, User>();
          for (const user of message.onlineUsers) {
            if (user.userId !== currentUser?.username) {
              newOnlineUsers.set(user.userId, user);

              // TIE BREAKER: One side MUST start. 
              // If I just logged in and see "okk", and I am "me", 
              // and "me" > "okk", I send the offer.
              if (message.username > user.userId) {
                await createWebRTCOffer(user.userId);
              }
            }
          }
          setOnlineUsers(newOnlineUsers);
        }
        break;
      case "user_joined":
        console.log("User joined:", message.username);
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.set(message.userId, {
            userId: message.userId,
            username: message.username,
            status: "online",
          });
          return newMap;
        });
        if (currentUser && currentUser.username > message.userId) {
          await createWebRTCOffer(message.userId);
        }
        // TIE BREAKER: If "okk" just joined and I am already here.
        // If my name is "me" and "me" > "okk", I send the offer.
        if (currentUser && currentUser.username > message.userId) {
          await createWebRTCOffer(message.userId);
        }
        break;
      case "user_left":
        console.log("User left:", message.username);
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(message.userId);
          return newMap;
        });
        webrtcRef.current?.removePeer(message.userId);
        break;
      case "user_status_changed":
        console.log("User status changed:", message.userId, message.status);
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          const user = newMap.get(message.userId);
          if (user) {
            user.status = message.status;
          }
          return newMap;
        });
        break;
      case "signal":
        console.log("[App] Signal data check:", message.signal); // Look at this log!
        // If your server sends { type: 'signal', signal: { type: 'offer', ... } }
        // You need to pass message.signal
        if (message.signal) {
          await handleWebRTCSignal(message.fromUserId, message.signal);
        }
        break;
      case "error":
        console.error("Server error:", message.error);
        setLoginError(message.error);
        break;
      default:
        console.log("Unknown server message:", message);
    }
  };

  const createWebRTCOffer = async (userId: string) => {
    if (!webrtcRef.current) return;
    try {
      console.log("[App] Creating WebRTC offer for:", userId);
      const offer = await webrtcRef.current.createOffer(userId);
      sendSignal(userId, { type: "offer", offer });
    } catch (err) {
      console.error("[App] Failed to create offer:", err);
    }
  };

  const handleWebRTCSignal = async (fromUserId: string, signal: any) => {
    if (!webrtcRef.current) return;
    try {
      switch (signal.type) {
        case "offer":
          console.log("[App] Received offer from:", fromUserId);
          const answer = await webrtcRef.current.handleOffer(fromUserId, signal.offer);
          sendSignal(fromUserId, { type: "answer", answer });
          break;
        case "answer":
          console.log("[App] Received answer from:", fromUserId);
          await webrtcRef.current.handleAnswer(fromUserId, signal.answer);
          break;
        case "ice-candidate":
          console.log("[App] Received ICE candidate from:", fromUserId);
          await webrtcRef.current.handleIceCandidate(fromUserId, signal.candidate);
          break;
        default:
          console.log("[App] Unknown signal type:", signal);
      }
    } catch (err) {
      console.error("[App] Error handling signal:", err);
    }
  };

  const sendSignal = (targetUserId: string, signal: any) => {
    socketRef.current?.emit("message", {
      type: "signal",
      targetUserId,
      signal
    });
  };

  const startPTT = () => {
    console.log("Attempting to start PTT...");
    if (!webrtcRef.current) {
      console.error("WebRTC Manager not initialized!");
      return;
    }
    if (isPTTPressed || !webrtcRef.current) return;
    console.log("[App] PTT pressed");
    setIsPTTPressed(true);
    webrtcRef.current.startTransmitting();
    setAudioStatusMessage("Transmitting...");
    setAudioStatusState("transmitting");
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const stopPTT = () => {
    if (!isPTTPressed || !webrtcRef.current) return;
    console.log("[App] PTT released");
    setIsPTTPressed(false);
    webrtcRef.current.stopTransmitting();
    setAudioStatusMessage("Ready");
    setAudioStatusState("ready");
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const updateUserConnectionState = (userId: string, state: string) => {
    setOnlineUsers((prev) => {
      const newMap = new Map(prev);
      const user = newMap.get(userId);
      if (user) {
        user.connectionState = state;
      }
      return newMap;
    });
    if (state === "connected" && audioStatusState !== "transmitting") {
    setAudioStatusState("ready");
    setAudioStatusMessage("Microphone ready");
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
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
      webrtcRef.current = null;
    }
    setOnlineUsers(new Map());
    setCurrentUser(null);
    setUserStatus("online");
    setIsPTTPressed(false);
    setLoginError("");
  };

  const togglePTT = () => {
  if (!webrtcRef.current || audioStatusState === "error") return;

  if (!isPTTPressed) {
    // START TRANSMITTING
    console.log("[App] PTT Toggle: ON");
    setIsPTTPressed(true);
    webrtcRef.current.startTransmitting();
    setAudioStatusMessage("Transmitting...");
    setAudioStatusState("transmitting");
    if (navigator.vibrate) navigator.vibrate(50);
  } else {
    // STOP TRANSMITTING
    console.log("[App] PTT Toggle: OFF");
    setIsPTTPressed(false);
    webrtcRef.current.stopTransmitting();
    setAudioStatusMessage("Ready");
    setAudioStatusState("ready");
    if (navigator.vibrate) navigator.vibrate([30, 30]); // Double pulse for "off"
  }
};

  return (
    <div className="min-h-screen flex flex-col">
      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[var(--bg-secondary)] border-none shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 animate-pulse">
                <Radio className="w-20 h-20 text-[var(--accent)]" />
              </div>
              <CardTitle className="text-2xl font-bold">Manaka Kura</CardTitle>
              <p className="text-[var(--text-secondary)]">Everywhere, Every time</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  ref={usernameInputRef}
                  type="text"
                  placeholder="Enter your handle"
                  className="bg-[var(--bg-tertiary)] border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                />
                <Button type="submit" className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-primary)]">
                  Connect
                </Button>
              </form>
              {loginError && <p className="mt-2 text-[var(--danger)] text-center">{loginError}</p>}
              <p className="mt-4 text-[var(--text-secondary)] text-center text-sm">
                New user? Just enter a handle to create your account.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <header className="bg-[var(--bg-secondary)] p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] px-4 py-2 rounded-full">
                <div className={`w-2.5 h-2.5 rounded-full status-indicator ${userStatus}`}></div>
                <span className="font-semibold">{currentUser.username}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="p-2">
                    <Signal className="w-6 h-6" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[var(--bg-secondary)] border-none">
                  <DialogHeader>
                    <DialogTitle>Change Status</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Button onClick={() => changeStatus("online")} className="w-full justify-start gap-2">
                      <div className="w-4 h-4 rounded-full status-indicator online"></div>
                      Online
                    </Button>
                    <Button onClick={() => changeStatus("busy")} className="w-full justify-start gap-2">
                      <div className="w-4 h-4 rounded-full status-indicator busy"></div>
                      Busy
                    </Button>
                    <Button onClick={() => changeStatus("away")} className="w-full justify-start gap-2">
                      <div className="w-4 h-4 rounded-full status-indicator away"></div>
                      Away
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" onClick={handleDisconnect} className="p-2">
                <LogOut className="w-6 h-6" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
            <div className={cn("flex items-center gap-2 p-3 bg-[var(--bg-secondary)] rounded-lg mb-5", !isConnected && "text-[var(--danger)]")}>
              <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-[var(--status-online)] animate-blink" : "bg-[var(--danger)]")}></div>
              <span>{connectionText}</span>
            </div>
            <div className={cn("p-3 rounded-lg mb-5 text-center font-medium border-2", `audio-status ${audioStatusState}`)}>
              {audioStatusMessage}
            </div>
            <section className="mb-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Online Users <Badge className="bg-[var(--accent)] text-[var(--bg-primary)]">{onlineUsers.size}</Badge>
              </h2>
              <div className="space-y-3">
                {onlineUsers.size === 0 ? (
                  <div className="text-center p-10 text-[var(--text-secondary)]">
                    <p>No other users online</p>
                    <p className="text-xs mt-2">You're the first one here!</p>
                  </div>
                ) : (
                  Array.from(onlineUsers.values()).map((user) => (
                    <Card
                      key={user.userId}
                      className={cn(
                        "bg-[var(--bg-secondary)] border-none hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer",
                        user.connectionState === "connected" && "border-l-4 border-[var(--success)]"
                      )}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent)] font-bold relative">
                            {user.username.charAt(0).toUpperCase()}
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[var(--bg-secondary)] status-indicator ${user.status}`}></div>
                            {user.connectionState === "connected" && (
                              <div className="absolute top-[-0.5rem] right-[-0.5rem] w-4 h-4 bg-[var(--accent)] rounded-full border-2 border-[var(--bg-secondary)] animate-pulse-audio"></div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{user.username}</p>
                            <p className="text-xs text-[var(--text-secondary)] capitalize">{user.status}</p>
                            {user.connectionState === "connected" && (
                              <p className="text-xs text-[var(--success)] uppercase font-semibold">Audio Ready</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </section>
            <div className="mt-10 flex flex-col items-center gap-4">
  <p className="text-[var(--text-secondary)] font-medium">
    {isPTTPressed ? "Tap to Stop" : "Tap to Talk"}
  </p>
  
  <Button
    onClick={togglePTT}
    disabled={audioStatusState === "receiving" || audioStatusState === "error"}
    className={cn(
      "w-40 h-40 rounded-full bg-[var(--bg-secondary)] border-4 border-[var(--accent)] flex flex-col items-center justify-center gap-3 text-[var(--accent)] transition-all",
      isPTTPressed ? "bg-[var(--accent)] text-[var(--bg-primary)] scale-105 border-white shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)]" : "hover:scale-105"
    )}
  >
    {/* Use a Pulse icon or Mic icon based on state */}
    <Mic className={cn("w-12 h-12", isPTTPressed && "animate-pulse")} />
    <span className="text-xs font-bold uppercase tracking-widest">
      {isPTTPressed ? "LIVE" : "PUSH TO TALK"}
    </span>
  </Button>

  {/* Status indicators */}
  <p className="text-[var(--text-secondary)] text-xs flex items-center gap-2 opacity-70">
    <Signal className={cn("w-4 h-4", isPTTPressed ? "text-[var(--success)]" : "opacity-50")} />
    {isPTTPressed ? "Channel Open" : "Channel Standby"}
  </p>
</div>
          </main>
        </>
      )}
      {isLoading && (
        <div className="fixed inset-0 bg-[rgba(15,15,30,0.95)] flex items-center justify-center z-50">
          <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />
        </div>
      )}
    </div>
  );
}