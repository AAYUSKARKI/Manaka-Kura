import { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCManager } from '@/services/webrtc/WebRTCManager';
import { Socket } from 'socket.io-client';

interface UseWebRTCProps {
  socket: Socket | null;
  username: string | undefined;
  onConnectionStateChange?: (userId: string, state: string) => void;
}

export const useWebRTC = ({ socket, username, onConnectionStateChange }: UseWebRTCProps) => {
  const webrtc = useRef<WebRTCManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioStatus, setAudioStatus] = useState({
    state: "ready" as "ready" | "transmitting" | "receiving" | "error",
    message: "Initializing..."
  });
  
  // Track quality: { userId: "excellent" | "fair" | "poor" }
  const [connectionQuality, setConnectionQuality] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!username || !socket) return;

    const manager = new WebRTCManager();
    webrtc.current = manager;

    // ICE Candidate signaling
    manager.onIceCandidate = (targetUserId, candidate) => {
      socket?.emit("message", {
        type: "signal",
        targetUserId,
        signal: { type: "ice-candidate", candidate: candidate.toJSON() }
      });
    };

    // Remote stream handler
    manager.onRemoteStream = (userId, _stream, _audio) => {
      console.log(`[Hook] Receiving audio from:`, userId);
      setAudioStatus({ state: "receiving", message: `Receiving from ${userId}` });
    };

    // Error handler
    manager.onError = (error) => {
      console.error("[Hook] WebRTC error:", error);
      setAudioStatus({ state: "error", message: error.message });
    };

    // Connection state change if provided
    if (onConnectionStateChange) {
      manager.onConnectionStateChange = onConnectionStateChange;
    }

    manager.initialize().then((success) => {
      if (success) {
        setIsInitialized(true);
        setAudioStatus({ state: "ready", message: "Microphone ready" });
      } else {
        setAudioStatus({ state: "error", message: "Microphone access denied" });
      }
    });

    // Connection Quality Polling
    const qualityInterval = setInterval(async () => {
      if (!manager) return;
      const stats = await manager.getConnectionStats(); 
      // Assuming your Manager has a method to aggregate RTT/Packet Loss
      setConnectionQuality(stats);
    }, 3000);

    return () => {
      clearInterval(qualityInterval);
      manager.cleanup();
    };
  }, [username, socket, onConnectionStateChange]);

  /**
   * TIE-BREAKER LOGIC
   * We only create an offer if our username is "greater" than the target's.
   * This ensures only one side initiates the handshake.
   */
  const initiateOffer = useCallback(async (targetUserId: string) => {
    if (!webrtc.current || !isInitialized || !username || !targetUserId) return;

    if (username > targetUserId) {
      console.log(`[Tie-Breaker] I win (${username} > ${targetUserId}). Sending Offer.`);
      try {
        const offer = await webrtc.current.createOffer(targetUserId);
        socket?.emit("message", {
          type: "signal",
          targetUserId,
          signal: { type: "offer", offer }
        });
      } catch (err) {
        console.error("Offer error:", err);
      }
    } else {
      console.log(`[Tie-Breaker] I lose (${username} < ${targetUserId}). Waiting for Offer.`);
    }
  }, [username, socket, isInitialized]);

  const handleSignal = useCallback(async (fromUserId: string, signal: any) => {
    if (!webrtc.current) return;
    try {
      switch (signal.type) {
        case "offer":
          const answer = await webrtc.current.handleOffer(fromUserId, signal.offer);
          socket?.emit("message", {
            type: "signal",
            targetUserId: fromUserId,
            signal: { type: "answer", answer }
          });
          break;
        case "answer":
          await webrtc.current.handleAnswer(fromUserId, signal.answer);
          break;
        case "ice-candidate":
          await webrtc.current.handleIceCandidate(fromUserId, signal.candidate);
          break;
      }
    } catch (err) {
      console.error("Signaling handle error:", err);
    }
  }, [socket]);

  return {
    isInitialized,
    audioStatus,
    connectionQuality,
    initiateOffer,
    handleSignal,
    startTalking: () => {
      if (webrtc.current?.startTransmitting()) {
        setAudioStatus({ state: "transmitting", message: "Live" });
        socket?.emit("message", { type: "status_change", status: "busy" });
      }
    },
    stopTalking: () => {
      webrtc.current?.stopTransmitting();
      setAudioStatus({ state: "ready", message: "Ready" });
      socket?.emit("message", { type: "status_change", status: "online" });
    }
  };
};