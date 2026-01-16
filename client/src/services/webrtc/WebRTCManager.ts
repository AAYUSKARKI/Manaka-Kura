import type { WebRTCError, WebRTCConfig, ExtendedRTCPeerConnection } from "@/types/webRTC";
export class WebRTCManager {
    private peers: Map<string, ExtendedRTCPeerConnection>;
    private localStream: MediaStream | null;
    private audioContext: AudioContext | null;
    private config: WebRTCConfig;

    public isMuted: boolean;
    public isTransmitting: boolean;

    // Event Callbacks
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
                { urls: 'stun:stun2.l.google.com:19302' }
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
        const existingPc = this.peers.get(userId);
        if (existingPc) return existingPc;

        console.log('[WebRTC] Creating peer connection for:', userId);
        const pc: ExtendedRTCPeerConnection = new RTCPeerConnection(this.config);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream!);
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
                // @ts-ignore - playsinline is not in all lib.dom versions but needed for mobile Safari
                audio.playsinline = true;

                // Store audio element with peer
                pc.remoteAudio = audio;

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
    async createOffer(userId: string): Promise<RTCSessionDescriptionInit> {
        try {
            const pc = this.createPeerConnection(userId);

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
    async handleOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
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
    async handleAnswer(userId: string, answer: RTCSessionDescriptionInit): Promise<void> {
        try {
            const pc = this.peers.get(userId);
            if (!pc) {
                console.error('[WebRTC] No peer connection for:', userId);
                return;
            }

            console.log('[WebRTC] Handling answer from:', userId);
            if (pc.signalingState === 'stable') {
                console.log('[WebRTC] Connection already stable, ignoring duplicate answer');
                return;
            }
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
            console.error('[WebRTC] Failed to handle answer:', err);
            throw err;
        }
    }

    /**
     * Get connection stats for all peers
     */
    async getConnectionStats() {
        const qualityMap: Record<string, string> = {};

        for (const [userId, pc] of this.peers.entries()) {
            const stats = await pc.getStats();
            stats.forEach(report => {
                if (report.type === 'remote-inbound-rtp') {
                    const roundTripTime = report.roundTripTime; // in seconds
                    if (roundTripTime > 0.3) qualityMap[userId] = "poor";
                    else if (roundTripTime > 0.1) qualityMap[userId] = "fair";
                    else qualityMap[userId] = "excellent";
                }
            });
        }
        return qualityMap;
    }

    /**
     * Handle received ICE candidate
     */
    async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
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

            // Close connection
            pc.close();
            this.peers.delete(userId);
        }
    }

    /**
     * Clean up all connections
     */
    cleanup(): void {
        console.log('[WebRTC] Cleaning up all connections');

        // Close all peer connections
        this.peers.forEach((_, userId) => {
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
     * Check if microphone is available
     */
    hasMicrophone() {
        return this.localStream !== null;
    }

    /**
     * Get audio level (for visual feedback)
     */
    getAudioLevel(): number {
        if (!this.localStream || !this.isTransmitting) return 0;

        try {
            if (!this.audioContext) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                this.audioContext = new AudioContextClass();
            }

            const analyser = this.audioContext.createAnalyser();
            const source = this.audioContext.createMediaStreamSource(this.localStream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const normalized = (dataArray[i] - 128) / 128;
                sum += normalized * normalized;
            }

            return Math.sqrt(sum / dataArray.length);
        } catch (err) {
            console.error('[WebRTC] Failed to get audio level:', err);
            return 0;
        }
    }
}