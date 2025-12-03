import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../config/jwtConfig.js";
import { sendError } from "../utils/errorResponse.js";

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return sendError(res, {
      status: 401,
      code: "MISSING_AUTH_HEADER",
      message: "Falta encabezado Authorization",
      requestId: req.requestId,
    });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return sendError(res, {
      status: 401,
      code: "INVALID_AUTH_HEADER_FORMAT",
      message: "Formato de token inválido. Usa: Bearer <token>",
      requestId: req.requestId,
    });
  }

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.error("Error verificando access token:", err.message);
    return sendError(res, {
      status: 401,
      code: "INVALID_ACCESS_TOKEN",
      message: "Token inválido o expirado",
      requestId: req.requestId,
    });
  }
}
