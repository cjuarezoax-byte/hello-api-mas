// src/app.js
import "dotenv/config";
import express from "express";
import crypto from "crypto";
import authRoutes from "./routes/authRoutes.js";
import tasksRoutes from "./routes/tasksRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swaggerConfig.js";
import { getTasksContainer } from "./config/cosmosConfig.js";
import { sendError } from "./utils/errorResponse.js";
import cors from "cors";

const app = express();

// 🌐 CORS
const allowedOrigin = process.env.CORS_ORIGIN || "*";

app.use(
  cors({
    origin: process.env.NODE_ENV === "test" ? "*" : allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    maxAge: 600, // cache preflight 10 minutos
  })
);

// 📊 Métricas muy simples en memoria
const metrics = {
  requestsTotal: 0,
  requestsByRoute: {}, // { "/tasks": 10, "/auth/login": 5, ... }
  errors5xx: 0,
};

app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Parseo de JSON
app.use(express.json());

// 🧩 Middleware de correlación + logging + métricas
app.use((req, res, next) => {
  const start = Date.now();

  // Reutiliza X-Request-Id si viene del cliente, o genera uno nuevo
  const incomingRequestId = req.headers["x-request-id"];
  const requestId =
    typeof incomingRequestId === "string" && incomingRequestId.trim() !== ""
      ? incomingRequestId
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  // Contador global de requests
  metrics.requestsTotal += 1;

  res.on("finish", () => {
    const ms = Date.now() - start;
    const routeKey = req.path || "unknown";

    // Contador por ruta
    metrics.requestsByRoute[routeKey] =
      (metrics.requestsByRoute[routeKey] || 0) + 1;

    // Contador de errores 5xx
    if (res.statusCode >= 500) {
      metrics.errors5xx += 1;
    }

    // Log estructurado (JSON) para fácil parseo en sistemas de logs
    const logEntry = {
      level: res.statusCode >= 500 ? "error" : "info",
      msg: "request completed",
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: ms,
      requestId,
    };

    console.log(JSON.stringify(logEntry));
  });

  next();
});

// Swagger (API docs)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 🌡 Health checks

// Liveness: ¿el proceso está vivo?
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness: ¿la app está lista para recibir tráfico (Cosmos accesible)?
app.get("/ready", async (req, res) => {
  try {
    const container = await getTasksContainer();

    // Llamada ligera a Cosmos para comprobar conectividad
    await container.items.query("SELECT TOP 1 c.id FROM c").fetchNext();

    res.json({ status: "ready" });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "readiness check failed",
        errorMessage: err.message,
        stack: err.stack,
      })
    );
    res
      .status(503)
      .json({ status: "not-ready", error: "Cosmos DB no disponible" });
  }
});

// 📊 Endpoint de métricas muy básico
app.get("/metrics", (req, res) => {
  res.json({
    status: "ok",
    metrics,
  });
});

// Rutas públicas
app.use("/auth", authRoutes);

// Rutas protegidas (requieren JWT)
app.use("/tasks", authMiddleware, tasksRoutes);

// 🧭 404 handler (rutas no encontradas)
app.use((req, res, next) => {
  return sendError(res, {
    status: 404,
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    requestId: req.requestId,
  });
});

// 💥 Error handler central (500)
app.use((err, req, res, next) => {
  const requestId = req.requestId;

  console.error(
    JSON.stringify({
      level: "error",
      msg: "unhandled error",
      requestId,
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    })
  );

  return sendError(res, {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error",
    requestId,
  });
});

export default app;
