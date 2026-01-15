import { Socket } from "socket.io";

export const sendError = (socket: Socket, message: string, code?: string) => {
  socket.emit("message", JSON.stringify({
    type: "error",
    error: message,
    code: code || "INTERNAL_ERROR"
  }));
};