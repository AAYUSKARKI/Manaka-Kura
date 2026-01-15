import { Socket, Server } from "socket.io";
import logger from "@/common/utils/logger";
import { broadCastService } from "@/common/services/broadCastService";
import { connectedUsers, getOnlineUsers } from "@/types/ConnectedUser";
import { socketRateLimiter } from "@/common/middleware/socketRateLimiter";
import { SocketMessageSchema, StatusEnum } from "./schemas/messageSchema";
import { handleAuth } from "./handlers/authHandler";
import { handleStatusChange } from "./handlers/statusHandler";
import { handleSignal } from "./handlers/signalHandler";
import { sendError } from "@/common/utils/socketUtils";

export const setupSocketHandlers = (io: Server) => {
    io.on("connection", (socket: Socket) => {
        const clientIp = socket.handshake.address;
        let userId: string | null = null;
        let messageCount = 0;
        logger.info(`New client connected: ${socket.id} from IP: ${clientIp}`);

        socket.on("message", async (data: string | Buffer) => {
            messageCount++;
            const rateLimit = socketRateLimiter.check(clientIp);
            if (!rateLimit.allowed) {
                sendError(socket, "Too many messages, please slow down");
                logger.warn("Socket rate limit exceeded", { ip: clientIp });
                return;
            }
            try {
                const rawData = JSON.parse(data.toString());
                const result = SocketMessageSchema.safeParse(rawData);

                if (!result.success) {
                    const errorMsg = result.error.issues.map(i => `${i.path}: ${i.message}`).join(", ");
                    sendError(socket, `Invalid message format: ${errorMsg}`, "VALIDATION_ERROR");
                    return;
                }

                const message = result.data;

                switch (message.type) {
                    case "auth":
                        // Auth returns the userId to be stored in this closure
                        userId = await handleAuth(socket, message);
                        break;

                    case "status_change":
                        await handleStatusChange(userId, message.status);
                        break;

                    case "signal":
                        await handleSignal(userId, message);
                        break;

                    default:
                        sendError(socket, "Unknown message type", "UNKNOWN_TYPE");
                }
            } catch (err: any) {
                logger.error("Message handling error", err);
                sendError(socket, err.message || "An Unexpected error occurred");
            }
        });

        socket.on("disconnect", (reason) => {
            if (userId && connectedUsers.has(userId)) {
                const client = connectedUsers.get(userId)!;
                const username = client.username;
                connectedUsers.delete(userId);
                broadCastService.broadcast("message", {
                    type: "user_left",
                    userId,
                    username,
                });
                logger.info("User disconnected", {
                    username,
                    reason,
                    messages: messageCount,
                });
            }
        });

        socket.on("error", (err) => {
            logger.error("Socket error", { ip: clientIp, error: err.message });
            sendError(socket, err.message || "An Unexpected error occurred");
        });
    });
};