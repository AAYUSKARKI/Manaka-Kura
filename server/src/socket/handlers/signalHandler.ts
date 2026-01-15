import { broadCastService } from "@/common/services/broadCastService";
import { SignalPayloadSchema } from "../schemas/signalSchema";
import z from "zod";

export const handleSignal = async (fromUserId: string | null, payload: z.infer<typeof SignalPayloadSchema>) => {
  if (!fromUserId) throw new Error("Not authenticated");
  
  broadCastService.sendToUser(payload.targetUserId, "message", {
    type: "signal",
    fromUserId,
    signal: payload.signal,
  });
};