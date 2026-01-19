import { useEffect, useRef, useState, useCallback } from 'react';
import { WebRTCManager } from '@/services/webrtc/WebRTCManager';

export const useWebRTC = (socket: any, userId: string | null) => {
  const managerRef = useRef<WebRTCManager | null>(null);
  const socketRef = useRef(socket);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<Map<string, MediaStream | null>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream | null>>(new Map());
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    const manager = new WebRTCManager();
    managerRef.current = manager;

    manager.initialize().then((success) => {
      if (success) setIsInitialized(true);
    });

    manager.onRemoteStream = (remoteId, stream) => {
      setRemoteStreams((prev) => new Map(prev).set(remoteId, stream));
    };

    manager.onRemoteVideoStream = (remoteId, stream) => {
      console.log('[useWebRTC] Remote video stream update for:', remoteId, 'stream:', stream ? 'present' : 'null');
      setRemoteVideoStreams((prev) => {
        const next = new Map(prev);
        if (stream === null) {
          next.set(remoteId, null);
        } else {
          next.set(remoteId, stream);
        }
        return next;
      });
    };

    manager.onRemoteScreenStream = (remoteId, stream) => {
      console.log('[useWebRTC] Remote screen stream update for:', remoteId, 'stream:', stream ? 'present' : 'null');
      setRemoteScreenStreams((prev) => {
        const next = new Map(prev);
        if (stream === null) {
          next.set(remoteId, null);
        } else {
          next.set(remoteId, stream);
        }
        return next;
      });
    };

    manager.onIceCandidate = (targetUserId, candidate) => {
      socketRef.current?.emit("message", {
        type: "signal",
        targetUserId,
        signal: { type: "ice-candidate", candidate }
      });
    };

    manager.onNeedRenegotiation = (targetUserId, offer) => {
      console.log('[useWebRTC] Sending renegotiation offer to:', targetUserId);
      socketRef.current?.emit("message", {
        type: "signal",
        targetUserId,
        signal: { type: "offer", offer }
      });
    };

    return () => manager.cleanup();
  }, []);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleSocketMessage = async (data: any) => {
      const message = data;
      if (message.type !== 'signal') return;

      const { fromUserId, signal } = message;
      const manager = managerRef.current;
      if (!manager) return;

      try {
        if (signal.type === 'offer') {
          console.log('[useWebRTC] Received offer from:', fromUserId);
          const answer = await manager.handleOffer(fromUserId, signal.offer);
          socketRef.current?.emit("message", {
            type: "signal",
            targetUserId: fromUserId,
            signal: { type: "answer", answer }
          });
        } 
        else if (signal.type === 'answer') {
          console.log('[useWebRTC] Received answer from:', fromUserId);
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

  const toggleVideo = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    if (!manager.isVideoEnabled) {
      console.log('[useWebRTC] Enabling video...');
      const stream = await manager.enableVideo();
      if (stream) {
        setLocalVideoStream(stream);
        setIsVideoEnabled(true);
      }
    } else {
      console.log('[useWebRTC] Disabling video...');
      await manager.disableVideo();
      setLocalVideoStream(null);
      setIsVideoEnabled(false);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    if (!manager.isScreenSharing) {
      console.log('[useWebRTC] Starting screen share...');
      const stream = await manager.startScreenShare();
      if (stream) {
        setLocalScreenStream(stream);
        setIsScreenSharing(true);
      }
    } else {
      console.log('[useWebRTC] Stopping screen share...');
      await manager.stopScreenShare();
      setLocalScreenStream(null);
      setIsScreenSharing(false);
    }
  }, []);

  const getPeerStatus = useCallback((userId: string) => {
    return managerRef.current?.getPeerStatus(userId) || 'disconnected';
  }, []);

  const removePeer = useCallback((userId: string) => {
    managerRef.current?.removePeer(userId);
    setRemoteVideoStreams((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    setRemoteScreenStreams((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
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
    isVideoEnabled,
    isScreenSharing,
    localVideoStream,
    localScreenStream,
    remoteStreams,
    remoteVideoStreams,
    remoteScreenStreams,
    startCalling,
    toggleTransmit,
    toggleVideo,
    toggleScreenShare,
    getAudioLevel,
    getRemoteAudioLevel,
    getPeerStatus,
    removePeer,
    getRemoteAudio,
    managerRef,
  };
};