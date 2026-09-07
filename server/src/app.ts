import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { authenticate, requireAdmin, requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { router } from "./routes/index.js";
import { serverConfig } from "./config/env.js";
import { getMetricsSnapshot, metricsMiddleware } from "./lib/metrics.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { NotFoundError } from "./utils/errors.js";

// Baseline security headers applied to every response.
const securityHeaders: express.RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  // Harmless over plain HTTP; enforced by browsers only over HTTPS.
  res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  next();
};

export const createApp = () => {
  const app = express();
  // Behind a single nginx reverse proxy: trust exactly one hop so req.ip / req.protocol
  // reflect the real client without honoring arbitrary client-supplied X-Forwarded-For.
  app.set("trust proxy", 1);

  const uploadRoot = path.resolve(serverConfig.uploadDir);
  void fs.mkdir(uploadRoot, { recursive: true }).catch((err) => {
    logger.error({ err, uploadRoot }, "Failed to ensure upload directory");
  });

  app.use(securityHeaders);
  app.use(cors({ origin: serverConfig.corsOrigins, credentials: true }));
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(metricsMiddleware);
  app.use(authenticate);

  app.use(
    "/uploads",
    express.static(uploadRoot, {
      setHeaders: (res) => {
        // Ensure user-uploaded files are never sniffed into executable types.
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    })
  );

  /**
   * Health check — kept in a simple shape for deploy/monitoring platforms.
   */
  app.get("/healthz", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "error" });
    }
  });

  /**
   * API version
   */
  app.get("/api/version", (_req, res) => {
    res.json({
      data: {
        version: process.env.APP_VERSION ?? "0.0.0",
        node: process.version,
        uptime: Math.round(process.uptime()),
      },
    });
  });

  // Metrics can reveal traffic patterns and probed paths — restrict to admins.
  app.get("/api/metrics", requireAuth, requireAdmin, (_req, res) => {
    res.json({ data: getMetricsSnapshot() });
  });

  /**
   * Main API routes
   */
  app.use("/api", router);

  /**
   * 404 — delegate to the global error handler for a consistent shape.
   */
  app.use((_req, _res, next) => {
    next(new NotFoundError("Route not found"));
  });

  /**
   * Global error handler — must always be last.
   */
  app.use(errorHandler);

  return app;
};
