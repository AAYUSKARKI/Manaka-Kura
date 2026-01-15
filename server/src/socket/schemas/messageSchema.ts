import z from "zod";
import { SignalPayloadSchema } from "./signalSchema";

export const StatusEnum = z.enum(["online", "away", "busy", "offline"]);

export const SocketMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("auth"),
    username: z.string().min(3).max(20),
  }),
  z.object({
    type: z.literal("status_change"),
    status: StatusEnum,
  }),
  z.object({
    type: z.literal("signal"),
  }).extend(SignalPayloadSchema.shape),
]);

export type SocketMessage = z.infer<typeof SocketMessageSchema>;