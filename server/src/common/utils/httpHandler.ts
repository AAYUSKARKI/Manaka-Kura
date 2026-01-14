import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError, ZodType } from "zod";
import { handleServiceResponse, ServiceResponse } from "@/common/utils/serviceResponse.js";

export const validateRequest = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body); 
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errorMessage = err.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");

      const serviceResponse = ServiceResponse.failure(
        `Invalid input: ${errorMessage}`,
        null,
        StatusCodes.BAD_REQUEST
      );
      return handleServiceResponse(serviceResponse, res);
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Unexpected error" });
  }
};