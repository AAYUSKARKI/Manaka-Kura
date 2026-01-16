import { broadCastService } from "@/common/services/broadCastService";
import { connectedUsers } from "@/types/ConnectedUser";

export async function handleChatMessage(userId: string | null, content: string) {
    if (!userId || !content) {
        return;
    }

    const client = connectedUsers.get(userId);
    if (!client) return;

    broadCastService.broadcast("message", {
        type: "chat_message",
        fromUserId: userId,
        username: client.username,
        content,
    });
}