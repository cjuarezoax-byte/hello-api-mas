// src/utils/errorResponse.js
export function sendError(res, { status = 500, code, message, details, requestId }) {
  const responseBody = {
    error: {
      code: code || "UNKNOWN_ERROR",
      message: message || "Unexpected error",
    },
  };

  if (details) {
    responseBody.error.details = details;
  }

  if (requestId) {
    responseBody.requestId = requestId;
  }

  return res.status(status).json(responseBody);
}
