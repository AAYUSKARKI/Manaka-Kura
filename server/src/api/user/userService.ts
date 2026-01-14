import { StatusCodes } from "http-status-codes";
import { User, type CreateUser } from "./userModel";
import { UserRepository } from "./userRepository";
import { ConflictError } from "@/common/utils/customError";
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

    async loginUser(username: string): Promise<ServiceResponse<User | null>> {
        try {
            const user = await this.userRepository.getUser(username);
            if (!user) {
                throw new ConflictError("User not found");
            }
            return ServiceResponse.success<User>("User logged in successfully", user, StatusCodes.OK);
        } catch (error) {
            logger.error("Error logging in user:", error);
            if (error instanceof ConflictError) {
                return ServiceResponse.failure(error.message, null, error.statusCode);
            }
            return ServiceResponse.failure("Failed to log in user", null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}

export const userService = new UserService();