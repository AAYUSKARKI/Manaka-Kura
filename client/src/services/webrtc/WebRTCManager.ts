import type { WebRTCConfig, WebRTCError } from "@/types/webRTC";

interface ExtendedRTCPeerConnection extends RTCPeerConnection {
  remoteAudio?: HTMLAudioElement;
  remoteAudioContext?: AudioContext;
  remoteAnalyser?: AnalyserNode;
}

export class WebRTCManager {
    private peers: Map<string, ExtendedRTCPeerConnection>;
    private localStream: MediaStream | null;
    private audioContext: AudioContext | null;
    private config: WebRTCConfig;

    public isMuted: boolean;
    public isTransmitting: boolean;

    public onConnectionStateChange: ((userId: string, state: RTCPeerConnectionState) => void) | null = null;
    public onRemoteStream: ((userId: string, stream: MediaStream, audio: HTMLAudioElement) => void) | null = null;
    public onIceCandidate: ((userId: string, candidate: RTCIceCandidate) => void) | null = null;
    public onError: ((error: WebRTCError) => void) | null = null;

    constructor() {
        this.peers = new Map(); // Map<userId, RTCPeerConnection>
        this.localStream = null;
        this.audioContext = null;
        this.isMuted = true; // Start muted
        this.isTransmitting = false;

        // STUN servers for NAT traversal
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

        // Event handlers
        this.onConnectionStateChange = null;
        this.onRemoteStream = null;
        this.onError = null;
    }

    /**
     * Initialize audio - request microphone permission
     */
    async initialize() {
        try {
            console.log('[WebRTC] Requesting microphone access...');

            // Request microphone with optimized constraints for PTT
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

            // Start muted
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

    /**
     * Create peer connection for a user
     */
    createPeerConnection(userId: string): ExtendedRTCPeerConnection {
        if (this.peers.has(userId)) {
            console.log('[WebRTC] Peer connection already exists for:', userId);
            return this.peers.get(userId)!;
        }

        console.log('[WebRTC] Creating peer connection for:', userId);

        const pc = new RTCPeerConnection(this.config) as ExtendedRTCPeerConnection;

        // Add local stream tracks
        if (this.localStream) {
            const stream = this.localStream; // Create a local reference for narrowing
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('[WebRTC] ICE candidate for:', userId);
                if (this.onIceCandidate) {
                    this.onIceCandidate(userId, event.candidate);
                }
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState, 'for:', userId);
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(userId, pc.connectionState);
            }

            // Clean up if connection failed or closed
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this.removePeer(userId);
            }
        };

        // Handle incoming tracks (remote audio)
        pc.ontrack = (event) => {
            console.log('[WebRTC] Received remote track from:', userId);

            if (event.streams && event.streams[0]) {
                const remoteStream = event.streams[0];

                // Create audio element and play
                const audio = new Audio();
                audio.srcObject = remoteStream;
                audio.autoplay = true;
                // @ts-ignore
                audio.playsinline = true; // Important for iOS

                // Store audio element with peer
                pc.remoteAudio = audio;

                // Setup analyser for remote audio level
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

                // Start playback
                audio.play().catch(err => {
                    console.error('[WebRTC] Failed to play remote audio:', err);
                });
            }
        };

        this.peers.set(userId, pc);
        return pc;
    }

    /**
     * Create and send offer to peer
     */
    async createOffer(userId: string) {
        try {
            const pc = this.createPeerConnection(userId);

            if (pc.signalingState !== 'stable') {
                console.warn('[WebRTC] Signaling not stable, skipping offer for:', userId);
                return;
            }

            console.log('[WebRTC] Creating offer for:', userId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            return offer;
        } catch (err) {
            console.error('[WebRTC] Failed to create offer:', err);
            throw err;
        }
    }

    /**
     * Handle received offer
     */
    async handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
        try {
            const pc = this.createPeerConnection(userId);

            console.log('[WebRTC] Handling offer from:', userId);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            return answer;
        } catch (err) {
            console.error('[WebRTC] Failed to handle offer:', err);
            throw err;
        }
    }

    /**
     * Handle received answer
     */
    async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
        try {
            const pc = this.peers.get(userId);
            if (!pc) {
                console.error('[WebRTC] No peer connection for:', userId);
                return;
            }

            console.log('[WebRTC] Handling answer from:', userId);
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
            console.error('[WebRTC] Failed to handle answer:', err);
        }
    }

    /**
     * Handle received ICE candidate
     */
    async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
        try {
            const pc = this.peers.get(userId);
            if (!pc) {
                console.error('[WebRTC] No peer connection for ICE candidate:', userId);
                return;
            }

            console.log('[WebRTC] Adding ICE candidate from:', userId);
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error('[WebRTC] Failed to add ICE candidate:', err);
        }
    }

    /**
     * Start transmitting (unmute)
     */
    startTransmitting() {
        if (!this.localStream) {
            console.error('[WebRTC] No local stream available');
            return false;
        }

        console.log('[WebRTC] Start transmitting');
        this.isTransmitting = true;
        this.unmuteLocalStream();
        return true;
    }

    /**
     * Stop transmitting (mute)
     */
    stopTransmitting() {
        console.log('[WebRTC] Stop transmitting');
        this.isTransmitting = false;
        this.muteLocalStream();
    }

    /**
     * Mute local microphone
     */
    muteLocalStream() {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });
            this.isMuted = true;
        }
    }

    /**
     * Unmute local microphone
     */
    unmuteLocalStream() {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
            this.isMuted = false;
        }
    }

    /**
     * Remove peer connection
     */
    removePeer(userId: string) {
        const pc = this.peers.get(userId);
        if (pc) {
            console.log('[WebRTC] Removing peer:', userId);

            // Stop remote audio
            if (pc.remoteAudio) {
                pc.remoteAudio.pause();
                pc.remoteAudio.srcObject = null;
            }

            // Clean up analyser and context
            if (pc.remoteAnalyser && pc.remoteAudioContext) {
                pc.remoteAnalyser.disconnect();
                pc.remoteAudioContext.close();
            }

            // Close connection
            pc.close();
            this.peers.delete(userId);
        }
    }

    /**
     * Clean up all connections
     */
    cleanup() {
        console.log('[WebRTC] Cleaning up all connections');

        // Close all peer connections
        this.peers.forEach((_pc, userId) => {
            this.removePeer(userId);
        });

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Clean up audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * Get connection status for a peer
     */
    getPeerStatus(userId: string): RTCPeerConnectionState | 'disconnected' {
        const pc = this.peers.get(userId);
        return pc ? pc.connectionState : 'disconnected';
    }

    /**
     * Get remote audio element
     */
    getRemoteAudio(userId: string): HTMLAudioElement | null {
        const pc = this.peers.get(userId);
        return pc?.remoteAudio || null;
    }

    /**
     * Check if microphone is available
     */
    hasMicrophone() {
        return this.localStream !== null;
    }

    /**
     * Get local audio level (for visual feedback)
     */
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
            console.error('[WebRTC] Failed to get audio level:', err);
            return 0;
        }
    }

    /**
     * Get remote audio level (for visual feedback)
     */
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
            console.error('[WebRTC] Failed to get remote audio level for ' + userId + ':', err);
            return 0;
        }
    }
}