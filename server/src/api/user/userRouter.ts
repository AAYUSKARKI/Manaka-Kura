import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { Router } from "express";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { userController } from "./userController";
import { StatusCodes } from "http-status-codes";
import { CreateUserSchema, userSchema } from "./userModel";

export const userRegistry = new OpenAPIRegistry();
export const userRouter: Router = Router();

userRegistry.register("User",userSchema);

userRegistry.registerComponent("securitySchemes","bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
});

userRegistry.registerPath({
    method: "post",
    path: "/api/user",
    summary: "Create a new user",
    tags: ["User"],
    request: {
        body: {
            description: "User object that needs to be created",
            required: true,
            content: {
                "application/json": {
                    schema: CreateUserSchema,
                },
            },
        },
    },
    responses: createApiResponse(userSchema, "User created successfully", StatusCodes.CREATED),
});

userRouter.post("/user", userController.createUser);
