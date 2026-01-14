import { server } from "@/server";
import logger from "./common/utils/logger";
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
});

const gracefulShutdown = () => {
    logger.info("Received shutdown signal, closing server...");
    server.close(() => {
        logger.info("Server closed gracefully");
        process.exit(0);
    });
    setTimeout(() => {
        logger.error("Could not close server in time, forcefully shutting down");
        process.exit(1);
    }, 5000).unref();
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);