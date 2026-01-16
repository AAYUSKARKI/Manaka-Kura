export interface WebRTCError {
  type: 'microphone' | 'connection' | 'signaling';
  message: string;
  error?: any;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface ExtendedRTCPeerConnection extends RTCPeerConnection {
  remoteAudio?: HTMLAudioElement;
}