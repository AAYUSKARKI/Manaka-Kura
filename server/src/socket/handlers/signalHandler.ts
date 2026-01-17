import { broadCastService } from "@/common/services/broadCastService";
import { SignalPayloadSchema } from "../schemas/signalSchema";
import z from "zod";
import { connectedUsers } from "@/types/ConnectedUser";

export const handleSignal = async (fromUserId: string | null, payload: z.infer<typeof SignalPayloadSchema>) => {
  if (!fromUserId) throw new Error("Not authenticated");
  
  console.log("📡 [SERVER] Relaying signal", {
    from: fromUserId,
    to: payload.targetUserId,
    signalType: payload.signal.type,
    connectedUsers: Array.from(connectedUsers.keys())
  });


  broadCastService.sendToUser(payload.targetUserId, "message", {
    type: "signal",
    fromUserId,
    signal: payload.signal,
  });

  console.log("✅ [SERVER] Signal sent");
};