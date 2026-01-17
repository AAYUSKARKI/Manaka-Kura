import express, { type Express } from "express";
import cors  from "cors";
import { CorsOptions } from "cors";
import helmet from "helmet";
import http from "http";
import rateLimiter from "./common/middleware/rateLimiter";
import errorHandler from "./common/middleware/errorHandler";
import { Server } from "socket.io";
import { userRouter } from "./api/user/userRouter";
import { openAPIRouter } from "./api-docs/openAPIRouter";
import { setupSocketHandlers } from "./socket";

const app: Express = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
});
setupSocketHandlers(io);
// Middlewares
app.use(helmet());
app.use(rateLimiter);

// Define as a constant to ensure read-only access
const allowedOrigins: string[] = [
  'https://manaka-kura.vercel.app/', 
  "https://manaka-kura.vercel.app",
  'http://localhost:5173'
];

export const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // !origin allows for server-to-server requests or tools like Postman
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", userRouter);

app.use(openAPIRouter);

app.use(errorHandler());

export { server };