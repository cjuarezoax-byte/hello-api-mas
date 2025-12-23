// src/config/jwtConfig.js

// Pequeña ayuda para obligar variables en producción
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Missing env var: ${name}`);
  }
  return value;
}

// En producción: obligatorio que existan las variables reales.
// En desarrollo/test: permite valores por defecto "de prueba".
export const JWT_ACCESS_SECRET =
  process.env.NODE_ENV === "production"
    ? requireEnv("JWT_ACCESS_SECRET")
    : (process.env.JWT_ACCESS_SECRET || "access-secret-dev-cambia-esto");

export const JWT_REFRESH_SECRET =
  process.env.NODE_ENV === "production"
    ? requireEnv("JWT_REFRESH_SECRET")
    : (process.env.JWT_REFRESH_SECRET || "refresh-secret-dev-cambia-esto");

// Lo demás se queda igual
export const ACCESS_TOKEN_EXPIRATION = "15m";
export const REFRESH_TOKEN_EXPIRATION = "7d";
