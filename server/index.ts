import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getTripayPublicConfig, reconcilePendingTripayTransactions } from "./tripay";

const app = express();
const httpServer = createServer(app);

app.use(compression());

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

function startTripayAutoReconcile() {
  const enabled = process.env.TRIPAY_AUTO_RECONCILE_ENABLED !== "false";
  const intervalMs = Math.max(30_000, parseInt(process.env.TRIPAY_AUTO_RECONCILE_INTERVAL_MS || "60000", 10) || 60_000);
  const limit = Math.max(1, parseInt(process.env.TRIPAY_AUTO_RECONCILE_LIMIT || "20", 10) || 20);
  const startupDelayMs = Math.max(5_000, parseInt(process.env.TRIPAY_AUTO_RECONCILE_STARTUP_DELAY_MS || "15000", 10) || 15_000);
  const cfg = getTripayPublicConfig();

  if (!enabled) {
    log("Tripay auto-reconcile disabled by env", "tripay");
    return;
  }

  if (!cfg.isConfigured) {
    log("Tripay auto-reconcile skipped because Tripay env is incomplete", "tripay");
    return;
  }

  let running = false;

  const run = async (trigger: "startup" | "interval") => {
    if (running) {
      log(`Tripay auto-reconcile skipped (${trigger}) because previous run is still active`, "tripay");
      return;
    }

    running = true;
    try {
      const result = await reconcilePendingTripayTransactions(limit);
      log(
        `Tripay auto-reconcile ${trigger}: checked=${result.checked} success=${result.success} refunded=${result.refunded} pending=${result.pending} failed=${result.failed}`,
        "tripay",
      );
    } catch (error: any) {
      log(`Tripay auto-reconcile error (${trigger}): ${error?.message || error}`, "tripay");
    } finally {
      running = false;
    }
  };

  setTimeout(() => {
    void run("startup");
  }, startupDelayMs);

  setInterval(() => {
    void run("interval");
  }, intervalMs);

  log(`Tripay auto-reconcile active every ${Math.round(intervalMs / 1000)}s with limit ${limit}`, "tripay");
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const { seedDatabase } = await import("./seed");
  await seedDatabase();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    startTripayAutoReconcile();
  });
})();
