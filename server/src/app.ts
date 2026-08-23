import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { authenticate } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { router } from "./routes/index.js";
import { serverConfig } from "./config/env.js";
import { getMetricsSnapshot, metricsMiddleware } from "./lib/metrics.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";

export const createApp = () => {
  const app = express();
  const uploadRoot = path.resolve(serverConfig.uploadDir);
  void fs.mkdir(uploadRoot, { recursive: true }).catch((err) => {
    logger.error({ err, uploadRoot }, "Failed to ensure upload directory");
  });
  app.use(cors({ origin: serverConfig.corsOrigins, credentials: true }));
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(metricsMiddleware);
  app.use(authenticate);
  app.use("/uploads", express.static(uploadRoot));
  app.get("/healthz", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "error" });
    }
  });
  app.get("/api/version", (_req, res) => {
    res.json({
      data: {
        version: process.env.APP_VERSION ?? "0.0.0",
        node: process.version,
        uptime: Math.round(process.uptime())
      }
    });
  });
  app.get("/api/metrics", (_req, res) => {
    res.json({ data: getMetricsSnapshot() });
  });
  app.use("/api", router);
  app.use((req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
  app.use(errorHandler);
  return app;
};
