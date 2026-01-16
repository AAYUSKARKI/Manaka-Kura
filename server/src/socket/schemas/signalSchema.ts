import z from "zod";

export const IceCandidateSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable().optional(), // Allow optional/null
  sdpMLineIndex: z.number().nullable().optional(),
  usernameFragment: z.string().optional(),
});

export const SdpSchema = z.object({
  type: z.enum(["offer", "answer", "pranswer", "rollback"]),
  sdp: z.string(),
});

export const SignalPayloadSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
  signal: z.object({
    type: z.enum(["offer", "answer", "ice-candidate", "renegotiate"]),
    // Offer/Answer data
    offer: SdpSchema.optional(),
    answer: SdpSchema.optional(),
    // ICE data
    candidate: IceCandidateSchema.optional(),
  }),
});