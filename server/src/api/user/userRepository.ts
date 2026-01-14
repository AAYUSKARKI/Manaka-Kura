import { prisma } from "@/common/lib/prisma"
import { User } from "./userModel"

export class UserRepository {
    async createUser(username: string): Promise<User> {
        return await prisma.user.create({
            data: {
                username: username,
                status: "online",
                createdAt: new Date(),
                lastLogin: new Date()
            }
        })
    }

    async usernameExists(username: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: {
                username: username
            }
        })
        return user !== null
    }
    async updateStatus(username: string, status: string): Promise<User> {
        return await prisma.user.update({
            where: {
                username: username
            },
            data: {
                status: status
            }
        })
    }

    async getUser(username: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: {
                username: username
            }
        })
    }

    async updateLastLogin(username: string): Promise<User> {
        return await prisma.user.update({
            where: {
                username: username
            },
            data: {
                lastLogin: new Date()
            }
        })
    }

    async getAllUsers(): Promise<User[]> {
        return await prisma.user.findMany()
    }
} 