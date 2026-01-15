import { connectedUsers, getOnlineUsers } from "@/types/ConnectedUser";
import { UserRepository } from "@/api/user/userRepository";
import { broadCastService } from "@/common/services/broadCastService";
import { Socket } from "socket.io";

const userRepository = new UserRepository();
export const handleAuth = async (socket: Socket, payload: { username: string }) => {
  const { username } = payload;
  const userExists = await userRepository.usernameExists(username);

  if (!userExists) throw new Error("User not found");
  if (connectedUsers.has(username)) throw new Error("User already connected");

  await userRepository.updateLastLogin(username);
  connectedUsers.set(username, {
    socket,
    username,
    status: "online",
    ip: socket.handshake.address,
  });

  socket.emit("message",{
    type: "auth_success",
    userId: username,
    username,
    onlineUsers: getOnlineUsers(),
  });

  broadCastService.broadcast("message", { type: "user_joined", userId: username, username }, username);
  return username;
};