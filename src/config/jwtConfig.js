export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "access-secret-dev-cambia-esto";

export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh-secret-dev-cambia-esto";

export const ACCESS_TOKEN_EXPIRATION = "15m";
export const REFRESH_TOKEN_EXPIRATION = "7d";
