import { connectedUsers } from "@/types/ConnectedUser";

class BroadCastService {
  broadcast(event: string, data: any, excludedUsername?: string) {
    connectedUsers.forEach((client, username) => {
      if (username !== excludedUsername && client.socket.connected) {
        client.socket.emit(event, data);
      }
    });
  }

  sendToUser(username: string, event: string, data: any) {
    const client = connectedUsers.get(username);
    if (client && client.socket.connected) {
      client.socket.emit(event, data);
    }
  }

  getOnlineUsernames() {
    return Array.from(connectedUsers.keys());
  }
}

export const broadCastService = new BroadCastService()