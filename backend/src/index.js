import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import { ErrorHandler } from "./controllers/error.js";
import logger from "./utils/logger.js";
import router from "./controllers/routes.js";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const port = process.env.PORT || 5000; // Default port

const app = express();

// Global Prisma client
export const prisma = new PrismaClient();

// Set trust proxy based on environment
// Only enable in production behind a reverse proxy
if (process.env.NODE_ENV === 'production') {
  app.set("trust proxy", 1); // Trust first proxy
}

// Enable Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim())
      : [process.env.CLIENT_URL || "http://localhost:3000"],
    credentials: true,
  })
);

// Handle preflight requests
app.options("*path", cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Security headers
app.use(helmet());

// Compression
app.use(compression());

// Protect against HTTP Parameter Pollution
app.use(hpp());

// Routes
app.use("/", router);

// Error handling middleware (must be last)
app.use(ErrorHandler);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
app.listen(port, async () => {
  logger.info(`Server running on port ${port}`);

  async function main() {
    try {
      await prisma.$connect();
      logger.info("Connected to the database.");
    } catch (error) {
      logger.error(error);
    } finally {
      await prisma.$disconnect();
    }
  }

  main();
});
