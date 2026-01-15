import z from "zod";

// Schema for ICE Candidates
export const IceCandidateSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable(),
  sdpMLineIndex: z.number().nullable(),
  usernameFragment: z.string().optional(),
});

// Schema for SDP Offer/Answer
export const SdpSchema = z.object({
  type: z.enum(["offer", "answer", "pranswer", "rollback"]),
  sdp: z.string(),
});

// The combined Signal Schema
export const SignalPayloadSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
  signal: z.union([
    z.object({ sdp: SdpSchema }),
    z.object({ candidate: IceCandidateSchema }),
    z.object({ type: z.literal("renegotiate") }) 
  ]),
});