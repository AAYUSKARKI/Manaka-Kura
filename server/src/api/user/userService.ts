import { StatusCodes } from "http-status-codes";
import { User, type CreateUser } from "./userModel";
import { UserRepository } from "./userRepository";
import { ConflictError, NotFoundError } from "@/common/utils/customError";
import { ServiceResponse } from "@/common/utils/serviceResponse";
import logger from "@/common/utils/logger";

class UserService {
    private userRepository: UserRepository;

    constructor(userRepository: UserRepository = new UserRepository()) {
        this.userRepository = userRepository;
    }

    async createUser(user: CreateUser): Promise<ServiceResponse<User | null>> {
        try {
            const usernameExists = await this.userRepository.usernameExists(user.username);
            if (usernameExists) {
                throw new ConflictError("Username already exists");
            }
            const createdUser = await this.userRepository.createUser(user.username);
            return ServiceResponse.success<User>("User created successfully", createdUser, StatusCodes.CREATED);
        } catch (error) {
            logger.error("Error creating user:", error);
            if (error instanceof ConflictError) {
                return ServiceResponse.failure(error.message, null, error.statusCode);
            }
            return ServiceResponse.failure("Failed to create user", null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    async loginUser(data: CreateUser): Promise<ServiceResponse<User | null>> {
        try {
            const user = await this.userRepository.getUser(data.username);
            if (!user) {
                throw new NotFoundError("User not found");
            }
            await this.userRepository.updateLastLogin(data.username);
            return ServiceResponse.success<User>("User logged in successfully", user, StatusCodes.OK);
        } catch (error) {
            logger.error("Error logging in user:", error);
            if (error instanceof NotFoundError) {
                return ServiceResponse.failure(error.message, null, error.statusCode);
            }
            return ServiceResponse.failure("Failed to log in user", null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    async getAllUsers(): Promise<ServiceResponse<User[]>> {
        try {
            const users = await this.userRepository.getAllUsers();
            return ServiceResponse.success<User[]>("Users fetched successfully", users, StatusCodes.OK);
        } catch (error) {
            logger.error("Error fetching users:", error);
            return ServiceResponse.failure("Failed to fetch users", [], StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}

export const userService = new UserService();