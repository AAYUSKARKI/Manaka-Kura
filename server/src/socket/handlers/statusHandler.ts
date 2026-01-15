import { broadCastService } from "@/common/services/broadCastService";
import { connectedUsers } from "@/types/ConnectedUser";
import { StatusEnum } from "../schemas/messageSchema";
import { z } from "zod";

export const handleStatusChange = async (userId: string | null, status: z.infer<typeof StatusEnum>) => {
  if (!userId || !connectedUsers.has(userId)) throw new Error("Not authenticated");

  connectedUsers.get(userId)!.status = status;
  broadCastService.broadcast("message", {
    type: "user_status_changed",
    userId,
    status: status,
  });
};