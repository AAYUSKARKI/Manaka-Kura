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
    console.log("✅ [SERVER] Emitting to", username, "event:", event, "type:", data.type);
    client.socket.emit(event, data);
  } else {
    console.error("❌ [SERVER] User not found!", {
      targetUsername: username,
      connected: !!client,
      socketConnected: client?.socket.connected,
      availableUsers: Array.from(connectedUsers.keys())
    });
  }
}

  getOnlineUsernames() {
    return Array.from(connectedUsers.keys());
  }
}

export const broadCastService = new BroadCastService()