import { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCManager } from '@/services/webrtc/WebRTCManager';

export const useWebRTC = (socket: any, userId: string | null) => {
  const managerRef = useRef<WebRTCManager | null>(null);
  const socketRef = useRef(socket);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // 1. Initialize the Manager
  useEffect(() => {
    const manager = new WebRTCManager();
    managerRef.current = manager;

    manager.initialize().then((success) => {
      if (success) setIsInitialized(true);
    });

    // Handle incoming remote streams
    manager.onRemoteStream = (remoteId, stream) => {
      setRemoteStreams((prev) => new Map(prev).set(remoteId, stream));
    };

    // Send ICE candidates to the server
    manager.onIceCandidate = (targetUserId, candidate) => {
      socketRef.current?.emit("message", {
        type: "signal",
        targetUserId,
        signal: { type: "ice-candidate", candidate }
      });
    };

    return () => manager.cleanup();
  }, []);

  // 2. Handle Signaling Logic
  useEffect(() => {
    if (!socket || !userId) return;

    const handleSocketMessage = async (data: any) => {
      const message = data as any; // Cast to your expected type
      if (message.type !== 'signal') return;

      const { fromUserId, signal } = message;
      const manager = managerRef.current;
      if (!manager) return;

      try {
        if (signal.type === 'offer') {
          const answer = await manager.handleOffer(fromUserId, signal.offer);
          socketRef.current?.emit("message", {
            type: "signal",
            targetUserId: fromUserId,
            signal: { type: "answer", answer }
          });
        } 
        else if (signal.type === 'answer') {
          await manager.handleAnswer(fromUserId, signal.answer);
        } 
        else if (signal.type === 'ice-candidate') {
          await manager.handleIceCandidate(fromUserId, signal.candidate);
        }
      } catch (err) {
        console.error("[useWebRTC] Signaling error:", err);
      }
    };

    socket.on("message", handleSocketMessage);
    return () => { socket.off("message", handleSocketMessage); };
  }, [socket, userId]);

  // 3. PTT Actions
  const startCalling = useCallback(async (targetUserId: string) => {
    const manager = managerRef.current;
    if (!manager || !isInitialized) return;

    try {
      const offer = await manager.createOffer(targetUserId);
      if (offer) {
        socketRef.current?.emit("message", {
          type: "signal",
          targetUserId,
          signal: { type: "offer", offer }
        });
      }
    } catch (err) {
      console.error("[useWebRTC] Failed to start calling:", err);
    }
  }, [isInitialized]);

  const toggleTransmit = useCallback((transmit: boolean) => {
    const manager = managerRef.current;
    if (!manager) return;

    if (transmit) {
      manager.startTransmitting();
    } else {
      manager.stopTransmitting();
    }
    setIsTransmitting(manager.isTransmitting);
  }, []);

  const getPeerStatus = useCallback((userId: string) => {
    return managerRef.current?.getPeerStatus(userId) || 'disconnected';
  }, []);

  const removePeer = useCallback((userId: string) => {
    managerRef.current?.removePeer(userId);
  }, []);

  const getRemoteAudio = useCallback((userId: string) => {
    return managerRef.current?.getRemoteAudio(userId) || null;
  }, []);

  const getAudioLevel = useCallback(() => {
    return managerRef.current?.getAudioLevel() || 0;
  }, []);

  const getRemoteAudioLevel = useCallback((userId: string) => {
    return managerRef.current?.getRemoteAudioLevel(userId) || 0;
  }, []);

  return {
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
    managerRef, // Expose for onError setting
  };
};