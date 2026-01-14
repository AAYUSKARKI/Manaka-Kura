import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import rateLimiter from "./common/middleware/rateLimiter";
import errorHandler from "./common/middleware/errorHandler";

const app: Express = express();
const server = http.createServer(app);

// Middlewares
app.use(helmet());
app.use(rateLimiter);
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorHandler());

export { server };