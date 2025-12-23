// src/config/rateLimitConfig.js
import rateLimit from "express-rate-limit";
import { sendError } from "../utils/errorResponse.js";

function buildLimiter({ windowMs, max, code }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res /*, next*/) => {
      return sendError(res, {
        status: 429,
        code,
        message: "Too many requests. Please try again later.",
        requestId: req.requestId,
      });
    },
  });
}

// 🔐 Limita intentos de login por IP
export const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos
  code: "LOGIN_RATE_LIMIT",
});

// 🔐 Limita uso de refresh token
export const refreshLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30, // más permisivo
  code: "REFRESH_RATE_LIMIT",
});

// 🔐 Límite global para /tasks
export const apiLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,            // 100 requests / minuto por IP
  code: "API_RATE_LIMIT",
});
