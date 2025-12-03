// src/middleware/validationMiddleware.js
import { sendError } from "../utils/errorResponse.js";

export function validateBody(schema, { errorCode = "VALIDATION_ERROR" } = {}) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path,       // ej: ["task"] o ["password"]
        message: issue.message, // mensaje legible
      }));

      return sendError(res, {
        status: 400,
        code: errorCode,
        message: "Payload inválido",
        details: issues,
        requestId: req.requestId,
      });
    }

    // Cuerpo ya validado y "limpio"
    req.validatedBody = result.data;
    next();
  };
}
