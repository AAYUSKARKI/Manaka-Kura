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

export type Status = "online" | "away" | "busy" | "offline";

export interface IceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string;
}

export interface Sdp {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp: string;
}

export interface SignalPayload {
  targetUserId: string;
  signal: {
    type: "offer" | "answer" | "ice-candidate" | "renegotiate";
    offer?: Sdp;
    answer?: Sdp;
    candidate?: IceCandidate;
  };
}