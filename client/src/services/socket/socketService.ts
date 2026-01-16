// @/services/socket/socketService.ts
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, 
  transports: ["websocket"],
  reconnectionAttempts: 5,
});

export const connectSocket = (username: string): Socket => {
  console.log(username)
  if (!socket.connected) {
    socket.connect();
    
    // Initial auth emission
    // socket.emit("message", {
    //   type: "auth",
    //   username: username
    // });
  }
  return socket; // Return the socket instance
};