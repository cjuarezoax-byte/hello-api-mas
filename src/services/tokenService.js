// src/services/tokenService.js
import jwt from "jsonwebtoken";
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRATION,
  REFRESH_TOKEN_EXPIRATION,
} from "../config/jwtConfig.js";
import { tokenStore } from "./tokenStore.js";

export function generateTokens(user) {
  const payload = {
    userId: user.id,
    username: user.username,
  };

  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRATION,
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
  });

  // Guardamos el refreshToken en nuestro TokenStore
  tokenStore.saveRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken };
}

export async function verifyRefreshToken(token) {
  // 1) Verificamos firma/expiración
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

  // 2) Verificamos que siga registrado en el TokenStore
  const isValid = tokenStore.isValidRefreshToken(decoded.userId, token);
  if (!isValid) {
    throw new Error("Refresh token no reconocido o revocado");
  }

  return decoded; // { userId, username, iat, exp }
}

export function invalidateRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    tokenStore.revokeRefreshToken(decoded.userId, token);
  } catch (err) {
    // Si el token ya es inválido/expiró, simplemente lo ignoramos
    return;
  }
}

export function invalidateAllTokensForUser(userId) {
  tokenStore.revokeAllTokensForUser(userId);
}
