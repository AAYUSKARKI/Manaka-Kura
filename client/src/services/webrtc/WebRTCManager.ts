import type { WebRTCConfig, WebRTCError } from "@/types/webRTC";

interface ExtendedRTCPeerConnection extends RTCPeerConnection {
  remoteAudio?: HTMLAudioElement;
  remoteAudioContext?: AudioContext;
  remoteAnalyser?: AnalyserNode;
  remoteVideoStream?: MediaStream;
}

export class WebRTCManager {
  private peers: Map<string, ExtendedRTCPeerConnection>;
  private localStream: MediaStream | null;
  private localVideoStream: MediaStream | null;
  private audioContext: AudioContext | null;
  private config: WebRTCConfig;

  public isMuted: boolean;
  public isTransmitting: boolean;
  public isVideoEnabled: boolean;

  public onConnectionStateChange: ((userId: string, state: RTCPeerConnectionState) => void) | null = null;
  public onRemoteStream: ((userId: string, stream: MediaStream, audio: HTMLAudioElement) => void) | null = null;
  public onRemoteVideoStream: ((userId: string, stream: MediaStream | null) => void) | null = null;
  public onIceCandidate: ((userId: string, candidate: RTCIceCandidate) => void) | null = null;
  public onNeedRenegotiation: ((userId: string, offer: RTCSessionDescriptionInit) => void) | null = null;
  public onError: ((error: WebRTCError) => void) | null = null;

  constructor() {
    this.peers = new Map();
    this.localStream = null;
    this.localVideoStream = null;
    this.audioContext = null;
    this.isMuted = true;
    this.isTransmitting = false;
    this.isVideoEnabled = false;

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

      // Add video tracks to all existing peer connections
      for (const [userId, pc] of this.peers.entries()) {
        this.localVideoStream?.getTracks().forEach(track => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(track);
          } else {
            pc.addTrack(track, this.localVideoStream!);
          }
        });

        // Renegotiate connection
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

      // Remove video tracks from all peer connections
      for (const [userId, pc] of this.peers.entries()) {
        const videoSenders = pc.getSenders().filter(s => s.track?.kind === 'video');
        videoSenders.forEach(sender => {
          // Stop the track before removing
          if (sender.track) {
            sender.track.stop();
          }
          pc.removeTrack(sender);
        });

        // Clear remote video stream on the remote side
        // This will be handled by the ontrack event when renegotiation completes

        // Renegotiate connection
        await this.renegotiateConnection(userId);
      }

      this.localVideoStream = null;
      this.isVideoEnabled = false;
      console.log('[WebRTC] Camera disabled');
    }
  }

  private async renegotiateConnection(userId: string) {
    const pc = this.peers.get(userId);
    if (!pc) return;

    // Wait for stable state
    if (pc.signalingState !== 'stable') {
      console.log('[WebRTC] Waiting for stable state before renegotiation...');
      await new Promise(resolve => {
        const checkStable = () => {
          if (pc.signalingState === 'stable') {
            resolve(true);
          } else {
            setTimeout(checkStable, 100);
          }
        };
        checkStable();
      });
    }

    try {
      console.log('[WebRTC] Renegotiating connection for:', userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Notify via callback to send through signaling
      if (this.onNeedRenegotiation) {
        this.onNeedRenegotiation(userId, offer);
      }
    } catch (err) {
      console.error('[WebRTC] Renegotiation failed:', err);
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

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received track from:', userId, 'kind:', event.track.kind, 'readyState:', event.track.readyState);

      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];

        if (event.track.kind === 'audio') {
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
          // Create new video stream or recreate if needed
          pc.remoteVideoStream = new MediaStream([event.track]);

          console.log('[WebRTC] Video track added for:', userId);
          
          // Listen for track ended (when remote user disables video)
          event.track.onended = () => {
            console.log('[WebRTC] Remote video track ended for:', userId);
            pc.remoteVideoStream = undefined;
            if (this.onRemoteVideoStream) {
              this.onRemoteVideoStream(userId, null);
            }
          };

          // Listen for track mute (another way video can stop)
          event.track.onmute = () => {
            console.log('[WebRTC] Remote video track muted for:', userId);
          };

          event.track.onunmute = () => {
            console.log('[WebRTC] Remote video track unmuted for:', userId);
          };
          
          if (this.onRemoteVideoStream) {
            this.onRemoteVideoStream(userId, pc.remoteVideoStream);
          }
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
      const pc = this.createPeerConnection(userId);
      
      console.log('[WebRTC] Handling offer from:', userId);
      
      // Check if this is a renegotiation (remote description already set)
      if (pc.signalingState === 'have-remote-offer') {
        console.log('[WebRTC] Already have remote offer, rolling back...');
        await pc.setLocalDescription({ type: 'rollback' });
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error('[WebRTC] Failed to handle offer:', err);
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

  getLocalVideoStream(): MediaStream | null {
    return this.localVideoStream;
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