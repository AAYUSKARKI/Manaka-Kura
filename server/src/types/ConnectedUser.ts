import { Socket } from "socket.io";

export interface ConnectedUser {
  socket: Socket;
  username: string;
  status: string;
  ip: string;
}

export const connectedUsers = new Map<string, ConnectedUser>();

export function getOnlineUsers(): Array<{ userId: string; username: string; status: string }> {
  const users: Array<{ userId: string; username: string; status: string }> = [];
  connectedUsers.forEach((client, userId) => {
    users.push({ userId, username: client.username, status: client.status });
  });
  return users;
}