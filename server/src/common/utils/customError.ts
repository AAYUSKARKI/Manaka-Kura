import { StatusCodes } from "http-status-codes";

export class NotFoundError extends Error {
  public statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.NOT_FOUND;
  }
}

export class UnauthorizedError extends Error {
  public statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.UNAUTHORIZED;
  }
}

export class BadRequestError extends Error {
  public statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.BAD_REQUEST;
  }
}

export class ForbiddenError extends Error {
  public statusCode: number;

  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.statusCode = StatusCodes.FORBIDDEN;
  }
}

export class InternalServerError extends Error {
  public statusCode: number;

  constructor(message = "Internal Server Error") {
    super(message);
    this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }
}

export class ConflictError extends Error {
  public statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = StatusCodes.CONFLICT; // 409 Conflict
  }
}

export class InvalidPasswordError extends UnauthorizedError {
  constructor() {
    super("Invalid password provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super("Invalid credentials provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidTokenError extends UnauthorizedError {
  constructor() {
    super("Invalid token provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidRefreshTokenError extends UnauthorizedError {
  constructor() {
    super("Invalid refresh token provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidEmailError extends UnauthorizedError {
  constructor() {
    super("Invalid email provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidPhoneNumberError extends UnauthorizedError {
  constructor() {
    super("Invalid phone number provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidNameError extends UnauthorizedError {
  constructor() {
    super("Invalid name provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidRoleError extends UnauthorizedError {
  constructor() {
    super("Invalid role provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidStatusError extends UnauthorizedError {
  constructor() {
    super("Invalid status provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}

export class InvalidDateError extends UnauthorizedError {
  constructor() {
    super("Invalid date provided");
    this.statusCode = StatusCodes.UNAUTHORIZED; // 401 Unauthorized
  }
}