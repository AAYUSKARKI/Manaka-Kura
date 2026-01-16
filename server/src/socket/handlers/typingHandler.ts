import { broadCastService } from "@/common/services/broadCastService";
import { connectedUsers } from "@/types/ConnectedUser";

export function handleTypingStart(userId: string | null) {
    if (!userId) return;

    const client = connectedUsers.get(userId);
    if (!client) return;

    broadCastService.broadcast("message", {
        type: "typing_start",
        fromUserId: userId,
        username: client.username,
    });
}

export function handleTypingStop(userId: string | null) {
    if (!userId) return;

    const client = connectedUsers.get(userId);
    if (!client) return;

    broadCastService.broadcast("message", {
        type: "typing_stop",
        fromUserId: userId,
        username: client.username,
    });
}