import type { WebRTCConfig, WebRTCError } from "@/types/webRTC";

interface ExtendedRTCPeerConnection extends RTCPeerConnection {
  remoteAudio?: HTMLAudioElement;
  remoteAudioContext?: AudioContext;
  remoteAnalyser?: AnalyserNode;
  remoteVideoStream?: MediaStream;
  remoteScreenStream?: MediaStream;
}

export class WebRTCManager {
  private peers: Map<string, ExtendedRTCPeerConnection>;
  private localStream: MediaStream | null;
  private localVideoStream: MediaStream | null;
  private localScreenStream: MediaStream | null;
  private audioContext: AudioContext | null;
  private config: WebRTCConfig;
  private cameraTransceiverMids: Set<string> = new Set();
private screenTransceiverMids: Set<string> = new Set();
  public isMuted: boolean;
  public isTransmitting: boolean;
  public isVideoEnabled: boolean;
  public isScreenSharing: boolean;

  public onConnectionStateChange: ((userId: string, state: RTCPeerConnectionState) => void) | null = null;
  public onRemoteStream: ((userId: string, stream: MediaStream, audio: HTMLAudioElement) => void) | null = null;
  public onRemoteVideoStream: ((userId: string, stream: MediaStream | null) => void) | null = null;
  public onRemoteScreenStream: ((userId: string, stream: MediaStream | null) => void) | null = null;
  public onIceCandidate: ((userId: string, candidate: RTCIceCandidate) => void) | null = null;
  public onNeedRenegotiation: ((userId: string, offer: RTCSessionDescriptionInit) => void) | null = null;
  public onError: ((error: WebRTCError) => void) | null = null;

  constructor() {
    this.peers = new Map();
    this.localStream = null;
    this.localVideoStream = null;
    this.localScreenStream = null;
    this.audioContext = null;
    this.isMuted = true;
    this.isTransmitting = false;
    this.isVideoEnabled = false;
    this.isScreenSharing = false;

    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "1838bf5c0ad8bfb361e04eb3",
          credential: "ZVUZXHcb4C50XiKa",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "1838bf5c0ad8bfb361e04eb3",
          credential: "ZVUZXHcb4C50XiKa",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "1838bf5c0ad8bfb361e04eb3",
          credential: "ZVUZXHcb4C50XiKa",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "1838bf5c0ad8bfb361e04eb3",
          credential: "ZVUZXHcb4C50XiKa",
        },
      ]
    };
  }

  async initialize() {
    try {
      console.log('[WebRTC] Requesting microphone access...');
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });

      this.muteLocalStream();
      console.log('[WebRTC] Microphone access granted');
      return true;
    } catch (err) {
      console.error('[WebRTC] Failed to get microphone access:', err);
      if (this.onError) {
        this.onError({
          type: 'microphone',
          message: 'Microphone access denied or not available',
          error: err
        });
      }
      return false;
    }
  }

 async enableVideo() {
  try {
    console.log('[WebRTC] Requesting camera access...');
    this.localVideoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });

    this.isVideoEnabled = true;

    for (const [userId, pc] of this.peers.entries()) {
      this.localVideoStream?.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video' && s.track.label.includes('camera'));
        if (sender) {
          sender.replaceTrack(track);
        } else {
          const newSender = pc.addTrack(track, this.localVideoStream!);
          // Track that this is a camera sender
          const transceivers = pc.getTransceivers();
          const transceiver = transceivers.find(t => t.sender === newSender);
          if (transceiver && transceiver.mid) {
            this.cameraTransceiverMids.add(transceiver.mid);
            console.log('[WebRTC] 📹 Marked transceiver', transceiver.mid, 'as CAMERA');
          }
        }
      });

      await this.renegotiateConnection(userId);
    }

    console.log('[WebRTC] Camera enabled');
    return this.localVideoStream;
  } catch (err) {
    console.error('[WebRTC] Failed to enable camera:', err);
    if (this.onError) {
      this.onError({
        type: 'camera',
        message: 'Camera access denied or not available',
        error: err
      });
    }
    return null;
  }
}


  async disableVideo() {
    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach(track => {
        track.stop();
      });

      for (const [userId, pc] of this.peers.entries()) {
        const videoSenders = pc.getSenders().filter(s => s.track?.kind === 'video' && s.track.label.includes('camera'));
        videoSenders.forEach(sender => {
          if (sender.track) {
            sender.track.stop();
          }
          pc.removeTrack(sender);
        });

        await this.renegotiateConnection(userId);
      }

      this.localVideoStream = null;
      this.isVideoEnabled = false;
      console.log('[WebRTC] Camera disabled');
    }
  }

 async startScreenShare() {
  try {
    console.log('[WebRTC] 🖥️ Requesting screen share access...');
    
    this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: false
    });

    this.isScreenSharing = true;
    console.log('[WebRTC] ✅ Screen stream obtained:', this.localScreenStream.id);

    this.localScreenStream.getVideoTracks()[0].onended = () => {
      console.log('[WebRTC] Screen share stopped by user');
      this.stopScreenShare();
    };

    for (const [userId, pc] of this.peers.entries()) {
      console.log('[WebRTC] 🔄 Adding screen share to peer:', userId);
      
      this.localScreenStream?.getTracks().forEach(track => {
        console.log('[WebRTC] 📤 Adding screen track:', track.id);
        const sender = pc.addTrack(track, this.localScreenStream!);
        
        // CRITICAL: Mark this transceiver as screen share
        const transceivers = pc.getTransceivers();
        const transceiver = transceivers.find(t => t.sender === sender);
        if (transceiver) {
          // Store the mid mapping (will be set after negotiation)
          console.log('[WebRTC] 🖥️ Will mark transceiver as SCREEN (mid pending)');
          // We'll mark it in handleAnswer when mid is assigned
        }
      });

      await this.renegotiateConnection(userId);
      
      // After renegotiation, mark screen transceivers
      const transceivers = pc.getTransceivers();
      transceivers.forEach(t => {
        if (t.sender.track && this.localScreenStream?.getTracks().includes(t.sender.track)) {
          if (t.mid) {
            this.screenTransceiverMids.add(t.mid);
            console.log('[WebRTC] 🖥️ Marked transceiver', t.mid, 'as SCREEN');
          }
        }
      });
    }

    console.log('[WebRTC] ✅ Screen sharing enabled and sent to all peers');
    return this.localScreenStream;
  } catch (err) {
    console.error('[WebRTC] ❌ Failed to start screen share:', err);
    if (this.onError) {
      this.onError({
        type: 'screen',
        message: 'Screen share access denied or not available',
        error: err
      });
    }
    return null;
  }
}

// Replace stopScreenShare method:
async stopScreenShare() {
  if (this.localScreenStream) {
    console.log('[WebRTC] 🛑 Stopping screen share...');
    
    const screenTracks = this.localScreenStream.getTracks();
    console.log('[WebRTC] Screen tracks to stop:', screenTracks.map(t => t.id));
    
    // Stop all screen tracks
    screenTracks.forEach(track => {
      console.log('[WebRTC] Stopping screen track:', track.id);
      track.stop();
    });

    // Remove screen senders from all peer connections
    for (const [userId, pc] of this.peers.entries()) {
      console.log('[WebRTC] 🗑️ Removing screen share from peer:', userId);
      
      const senders = pc.getSenders();
      let removedCount = 0;
      
      for (const sender of senders) {
        if (sender.track && screenTracks.includes(sender.track)) {
          console.log('[WebRTC] Removing screen track sender:', sender.track.id);
          pc.removeTrack(sender);
          removedCount++;
        }
      }
      
      console.log('[WebRTC] Removed', removedCount, 'screen senders from peer:', userId);

      // Renegotiate to inform the other peer
      await this.renegotiateConnection(userId);
    }

    this.localScreenStream = null;
    this.isScreenSharing = false;
    console.log('[WebRTC] ✅ Screen sharing disabled');
  }
}

  private async renegotiateConnection(userId: string) {
  const pc = this.peers.get(userId);
  if (!pc) {
    console.error('[WebRTC] ❌ Cannot renegotiate: peer not found for', userId);
    return;
  }

  console.log('[WebRTC] 🔄 Renegotiation requested for:', userId);
  console.log('[WebRTC] Current signaling state:', pc.signalingState);

  if (pc.signalingState !== 'stable') {
    console.log('[WebRTC] ⏳ Waiting for stable state before renegotiation...');
    await new Promise(resolve => {
      const checkStable = () => {
        if (pc.signalingState === 'stable') {
          console.log('[WebRTC] ✅ Signaling state is now stable');
          resolve(true);
        } else {
          console.log('[WebRTC] Still waiting... state:', pc.signalingState);
          setTimeout(checkStable, 100);
        }
      };
      checkStable();
    });
  }

  try {
    console.log('[WebRTC] 📝 Creating offer for renegotiation...');
    
    // Log current transceivers
    const transceivers = pc.getTransceivers();
    console.log('[WebRTC] Current transceivers:', transceivers.map(t => ({
      mid: t.mid,
      direction: t.direction,
      sender_track: t.sender.track ? {
        kind: t.sender.track.kind,
        id: t.sender.track.id,
        enabled: t.sender.track.enabled
      } : null
    })));
    
    const offer = await pc.createOffer();
    console.log('[WebRTC] ✅ Offer created');
    console.log('[WebRTC] Offer SDP (first 200 chars):', offer.sdp?.substring(0, 200));
    
    await pc.setLocalDescription(offer);
    console.log('[WebRTC] ✅ Local description set');
    
    if (this.onNeedRenegotiation) {
      console.log('[WebRTC] 📤 Sending renegotiation offer to:', userId);
      this.onNeedRenegotiation(userId, offer);
    } else {
      console.error('[WebRTC] ❌ onNeedRenegotiation callback is null!');
    }
  } catch (err) {
    console.error('[WebRTC] ❌ Renegotiation failed for', userId, ':', err);
  }
}

  createPeerConnection(userId: string): ExtendedRTCPeerConnection {
    if (this.peers.has(userId)) {
      return this.peers.get(userId)!;
    }

    console.log('[WebRTC] Creating peer connection for:', userId);
    const pc = new RTCPeerConnection(this.config) as ExtendedRTCPeerConnection;

    // Add local audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Add local video tracks if enabled
    if (this.localVideoStream && this.isVideoEnabled) {
      this.localVideoStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localVideoStream!);
      });
    }

    // Add screen share tracks if active
    if (this.localScreenStream && this.isScreenSharing) {
      this.localScreenStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localScreenStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(userId, event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState, 'for:', userId);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, pc.connectionState);
      }

      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(userId);
      }
    };

   // In WebRTCManager.ts - Replace the ontrack handler

// CRITICAL FIX: The screen detection wasn't working properly
// Replace the pc.ontrack handler in createPeerConnection with this:

pc.ontrack = (event) => {
  console.log('[WebRTC] 🎯 ONTRACK EVENT FIRED!');
  console.log('[WebRTC] 📥 Received track from:', userId);
  console.log('[WebRTC] Track details:', {
    kind: event.track.kind,
    id: event.track.id,
    label: event.track.label,
    readyState: event.track.readyState
  });
  
  if (event.streams && event.streams[0]) {
    const remoteStream = event.streams[0];
    const streamId = remoteStream.id;

    if (event.track.kind === 'audio') {
      console.log('[WebRTC] 🔊 Processing AUDIO track');
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      (audio as any).playsinline = true;

      pc.remoteAudio = audio;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(remoteStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      pc.remoteAudioContext = ctx;
      pc.remoteAnalyser = analyser;

      if (this.onRemoteStream) {
        this.onRemoteStream(userId, remoteStream, audio);
      }

      audio.play().catch(err => {
        console.error('[WebRTC] Failed to play remote audio:', err);
      });
      
    } else if (event.track.kind === 'video') {
      // CRITICAL: Determine if screen or camera by transceiver count
      const transceivers = pc.getTransceivers();
      const videoTransceivers = transceivers.filter(t => t.receiver.track?.kind === 'video');
      const thisTransceiver = event.transceiver || transceivers.find(t => t.receiver.track === event.track);
      
      console.log('[WebRTC] 📹 Processing VIDEO track');
      console.log('[WebRTC] Total video transceivers:', videoTransceivers.length);
      console.log('[WebRTC] This transceiver mid:', thisTransceiver?.mid);
      
      // LOGIC: First video = camera, Second video = screen
      let isScreenTrack = false;
      
      if (videoTransceivers.length === 1) {
        // Only one video track = must be camera
        isScreenTrack = false;
        console.log('[WebRTC] 📹 Only 1 video track → CAMERA');
      } else if (videoTransceivers.length >= 2) {
        // Multiple video tracks: check which one this is
        const videoTrackIndex = videoTransceivers.findIndex(t => t.receiver.track === event.track);
        if (videoTrackIndex === 0) {
          isScreenTrack = false;
          console.log('[WebRTC] 📹 First video track → CAMERA');
        } else {
          isScreenTrack = true;
          console.log('[WebRTC] 🖥️ Second/later video track → SCREEN SHARE');
        }
      }
      
      console.log('[WebRTC] 🔍 Final decision: isScreenTrack =', isScreenTrack);
      
      if (isScreenTrack) {
        // ========== SCREEN SHARE ==========
        console.log('[WebRTC] 🖥️🖥️🖥️ CONFIRMED SCREEN SHARE from:', userId);
        
        if (!pc.remoteScreenStream || pc.remoteScreenStream.id !== streamId) {
          pc.remoteScreenStream = new MediaStream([event.track]);
          console.log('[WebRTC] ✅ Created NEW screen stream, ID:', streamId);
        } else {
          pc.remoteScreenStream.addTrack(event.track);
        }

        event.track.onended = () => {
          console.log('[WebRTC] ❌ Remote SCREEN track ended for:', userId);
          pc.remoteScreenStream = undefined;
          if (this.onRemoteScreenStream) {
            this.onRemoteScreenStream(userId, null);
          }
        };

        if (this.onRemoteScreenStream) {
          console.log('[WebRTC] 🔔 CALLING onRemoteScreenStream callback');
          this.onRemoteScreenStream(userId, pc.remoteScreenStream);
        }
        
      } else {
        // ========== CAMERA VIDEO ==========
        console.log('[WebRTC] 📹📹📹 CONFIRMED CAMERA VIDEO from:', userId);
        
        if (!pc.remoteVideoStream || pc.remoteVideoStream.id !== streamId) {
          pc.remoteVideoStream = new MediaStream([event.track]);
          console.log('[WebRTC] ✅ Created NEW camera video stream, ID:', streamId);
        } else {
          pc.remoteVideoStream.addTrack(event.track);
        }

        event.track.onended = () => {
          console.log('[WebRTC] ❌ Remote CAMERA track ended for:', userId);
          pc.remoteVideoStream = undefined;
          if (this.onRemoteVideoStream) {
            this.onRemoteVideoStream(userId, null);
          }
        };

        if (this.onRemoteVideoStream) {
          console.log('[WebRTC] 🔔 CALLING onRemoteVideoStream callback');
          this.onRemoteVideoStream(userId, pc.remoteVideoStream);
        }
      }
      
      event.track.onmute = () => {
        console.log(`[WebRTC] 🔇 ${isScreenTrack ? 'Screen' : 'Camera'} track MUTED:`, userId);
      };

      event.track.onunmute = () => {
        console.log(`[WebRTC] 🔊 ${isScreenTrack ? 'Screen' : 'Camera'} track UNMUTED:`, userId);
      };
    }
  }
};

    this.peers.set(userId, pc);
    return pc;
  }

  async createOffer(userId: string) {
    try {
      const pc = this.createPeerConnection(userId);
      if (pc.signalingState !== 'stable') {
        console.warn('[WebRTC] Signaling not stable, skipping offer for:', userId);
        return;
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error('[WebRTC] Failed to create offer:', err);
      throw err;
    }
  }

  async handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
  try {
    console.log('[WebRTC] 🔵 Handling offer from:', userId);
    console.log('[WebRTC] Offer type:', offer.type);
    console.log('[WebRTC] Offer SDP (first 300 chars):', offer.sdp?.substring(0, 300));
    
    const pc = this.createPeerConnection(userId);
    
    console.log('[WebRTC] Current signaling state:', pc.signalingState);
    console.log('[WebRTC] Current remote description:', pc.remoteDescription?.type || 'none');
    
    // Count m= lines in SDP to see how many media streams
    const mLines = (offer.sdp?.match(/^m=/gm) || []).length;
    console.log('[WebRTC] 📊 Number of media streams in offer:', mLines);
    
    if (pc.signalingState === 'have-remote-offer') {
      console.log('[WebRTC] ⚠️ Already have remote offer, rolling back...');
      await pc.setLocalDescription({ type: 'rollback' });
    }
    
    // CRITICAL: Log current transceivers BEFORE setting remote description
    const beforeTransceivers = pc.getTransceivers();
    console.log('[WebRTC] Transceivers BEFORE setRemoteDescription:', beforeTransceivers.length);
    beforeTransceivers.forEach((t, i) => {
      console.log(`  [${i}] mid: ${t.mid}, direction: ${t.direction}, sender track:`, 
        t.sender.track ? { kind: t.sender.track.kind, id: t.sender.track.id } : 'none');
    });
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('[WebRTC] ✅ Remote description set');
    
    // CRITICAL: Log transceivers AFTER setting remote description
    const afterTransceivers = pc.getTransceivers();
    console.log('[WebRTC] Transceivers AFTER setRemoteDescription:', afterTransceivers.length);
    afterTransceivers.forEach((t, i) => {
      console.log(`  [${i}] mid: ${t.mid}, direction: ${t.direction}, receiver track:`, 
        t.receiver.track ? { kind: t.receiver.track.kind, id: t.receiver.track.id, label: t.receiver.track.label } : 'none');
    });
    
    // Check if new transceivers were added
    if (afterTransceivers.length > beforeTransceivers.length) {
      console.log('[WebRTC] 🆕 NEW transceivers detected!', 
        afterTransceivers.length - beforeTransceivers.length, 'new tracks');
      
      // The new tracks should trigger ontrack events
      // If they don't, it means the tracks are in the transceiver but not firing events
      for (let i = beforeTransceivers.length; i < afterTransceivers.length; i++) {
        const t = afterTransceivers[i];
        console.log('[WebRTC] New transceiver', i, ':', {
          mid: t.mid,
          direction: t.direction,
          receiver_track: t.receiver.track ? {
            kind: t.receiver.track.kind,
            id: t.receiver.track.id,
            label: t.receiver.track.label,
            readyState: t.receiver.track.readyState
          } : 'none'
        });
      }
    }

    const answer = await pc.createAnswer();
    console.log('[WebRTC] ✅ Answer created');
    console.log('[WebRTC] Answer SDP (first 200 chars):', answer.sdp?.substring(0, 200));
    
    await pc.setLocalDescription(answer);
    console.log('[WebRTC] ✅ Local description set (answer)');
    
    return answer;
  } catch (err) {
    console.error('[WebRTC] ❌ Failed to handle offer:', err);
    throw err;
  }
}


  async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
    try {
      const pc = this.peers.get(userId);
      if (!pc) return;

      console.log('[WebRTC] Handling answer from:', userId);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('[WebRTC] Failed to handle answer:', err);
    }
  }

  async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
    try {
      const pc = this.peers.get(userId);
      if (!pc) return;

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  startTransmitting() {
    if (!this.localStream) return false;
    this.isTransmitting = true;
    this.unmuteLocalStream();
    return true;
  }

  stopTransmitting() {
    this.isTransmitting = false;
    this.muteLocalStream();
  }

  muteLocalStream() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      this.isMuted = true;
    }
  }

  unmuteLocalStream() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      this.isMuted = false;
    }
  }

  removePeer(userId: string) {
    const pc = this.peers.get(userId);
    if (pc) {
      if (pc.remoteAudio) {
        pc.remoteAudio.pause();
        pc.remoteAudio.srcObject = null;
      }

      if (pc.remoteAnalyser && pc.remoteAudioContext) {
        pc.remoteAnalyser.disconnect();
        pc.remoteAudioContext.close();
      }

      pc.close();
      this.peers.delete(userId);
    }
  }

  cleanup() {
    this.peers.forEach((_pc, userId) => {
      this.removePeer(userId);
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach(track => track.stop());
      this.localVideoStream = null;
    }

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => track.stop());
      this.localScreenStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getPeerStatus(userId: string): RTCPeerConnectionState | 'disconnected' {
    const pc = this.peers.get(userId);
    return pc ? pc.connectionState : 'disconnected';
  }

  getRemoteAudio(userId: string): HTMLAudioElement | null {
    const pc = this.peers.get(userId);
    return pc?.remoteAudio || null;
  }

  getRemoteVideoStream(userId: string): MediaStream | null {
    const pc = this.peers.get(userId);
    return pc?.remoteVideoStream || null;
  }

  getRemoteScreenStream(userId: string): MediaStream | null {
    const pc = this.peers.get(userId);
    return pc?.remoteScreenStream || null;
  }

  getLocalVideoStream(): MediaStream | null {
    return this.localVideoStream;
  }

  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  hasMicrophone() {
    return this.localStream !== null;
  }

  getAudioLevel(): number {
    if (!this.localStream || !this.isTransmitting) return 0;

    try {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }

      const level = Math.sqrt(sum / dataArray.length);
      source.disconnect();
      return level;
    } catch (err) {
      return 0;
    }
  }

  getRemoteAudioLevel(userId: string): number {
    const pc = this.peers.get(userId);
    if (!pc || !pc.remoteAnalyser || !pc.remoteAudioContext) return 0;

    try {
      if (pc.remoteAudioContext.state === 'suspended') {
        pc.remoteAudioContext.resume();
      }
      const analyser = pc.remoteAnalyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }

      return Math.sqrt(sum / dataArray.length);
    } catch (err) {
      return 0;
    }
  }
}