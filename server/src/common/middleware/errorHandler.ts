import type { ErrorRequestHandler, RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import logger from "../utils/logger";

const unexpectedRequest: RequestHandler = (_req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    message: "Route not found",
  });
};

const globalErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  logger.error("Global error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = res.statusCode !== 200 ? res.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
  
  res.status(statusCode).json({
    message: process.env.NODE_ENV === "development" ? err.message : "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default (): [RequestHandler, ErrorRequestHandler] => [
  unexpectedRequest,
  globalErrorHandler,
];   