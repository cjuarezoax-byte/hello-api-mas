// src/validation/authSchemas.js
import { z } from "zod";

// Login: username y password son obligatorios
export const loginSchema = z.object({
  username: z.string().min(1, "username es requerido"),
  password: z.string().min(1, "password es requerido"),
});

// Registro: mismas credenciales pero podemos exigir algo más de longitud
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "username debe tener al menos 3 caracteres")
    .max(50, "username demasiado largo"),
  password: z
    .string()
    .min(6, "password debe tener al menos 6 caracteres")
    .max(100, "password demasiado larga"),
});

// Para refresh y logout
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken es requerido"),
});
