import { Request, RequestHandler, Response } from "express";
import { CreateUserSchema, User } from "./userModel";
import { handleServiceResponse, ServiceResponse } from "@/common/utils/serviceResponse";
import { userService } from "./userService";
class UserController {
    public createUser: RequestHandler = async (req: Request, res: Response) => {
        const data = CreateUserSchema.parse(req.body);
        const serviceResponse: ServiceResponse<User | null> = await userService.createUser(data);
        return handleServiceResponse(serviceResponse, res);
    }

    public loginUser: RequestHandler = async (req: Request, res: Response) => {
        const data = CreateUserSchema.parse(req.body);
        const serviceResponse: ServiceResponse<User | null> = await userService.loginUser(data);
        return handleServiceResponse(serviceResponse, res);
    }
}

export const userController = new UserController();