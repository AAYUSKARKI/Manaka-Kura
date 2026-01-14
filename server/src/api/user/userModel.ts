import z from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);
export const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    status: z.string(),
    createdAt: z.date(),
    lastLogin: z.date()
});

export const CreateUserSchema = z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
})
export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;