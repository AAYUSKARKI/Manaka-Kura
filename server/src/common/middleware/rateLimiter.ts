import type { Request } from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const rateLimiter = rateLimit({
  legacyHeaders: true,
  limit: parseInt(process.env.COMMON_RATE_LIMIT_MAX_REQUESTS || '20'),
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  windowMs: 15 * 60 * 1000 * parseInt(process.env.COMMON_RATE_LIMIT_WINDOW_MS || '1000'),
  keyGenerator:(req: Request) => ipKeyGenerator(req.ip as string),
});

export default rateLimiter;