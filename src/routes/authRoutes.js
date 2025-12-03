import express from "express";
import {
  generateTokens,
  verifyRefreshToken,
  invalidateRefreshToken,
} from "../services/tokenService.js";
import { sendError } from "../utils/errorResponse.js";
import { validateBody } from "../middleware/validationMiddleware.js";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from "../validation/authSchemas.js";
import { loginLimiter, refreshLimiter } from "../config/rateLimitConfig.js";
import {
  authenticateUser,
  createUser,
  ensureDemoUser,
} from "../services/userService.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticación (register, login, refresh, logout)
 *
 * components:
 *   schemas:
 *     AuthUser:
 *       type: object
 *       description: Usuario autenticado en el sistema
 *       properties:
 *         id:
 *           type: string
 *           example: "carlos"
 *         username:
 *           type: string
 *           example: "carlos"
 *
 *     AuthTokens:
 *       type: object
 *       description: Respuesta de login con access y refresh token
 *       properties:
 *         accessToken:
 *           type: string
 *           description: JWT de acceso de corta duración
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refreshToken:
 *           type: string
 *           description: JWT de refresco de mayor duración
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           $ref: '#/components/schemas/AuthUser'
 *
 *     AccessTokenResponse:
 *       type: object
 *       description: Respuesta que solo contiene un nuevo access token
 *       properties:
 *         accessToken:
 *           type: string
 *           description: Nuevo JWT de acceso
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     description: Crea un usuario con username y password, devuelve tokens y el usuario creado.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: carlos
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       201:
 *         description: Usuario creado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: Payload inválido.
 *       409:
 *         description: El username ya existe.
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Inicia sesión con username/password
 *     description: Devuelve access y refresh tokens para el usuario autenticado.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: carlos
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login correcto. Devuelve access y refresh tokens.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: Payload inválido.
 *       401:
 *         description: Credenciales incorrectas.
 */

// POST /auth/register
router.post(
  "/register",
  validateBody(registerSchema, { errorCode: "INVALID_REGISTER_PAYLOAD" }),
  async (req, res) => {
    const { username, password } = req.validatedBody;

    try {
      const user = await createUser({ username, password });

      const { accessToken, refreshToken } = generateTokens(user);

      return res.status(201).json({
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username },
      });
    } catch (err) {
      if (err.code === "USERNAME_TAKEN") {
        return sendError(res, {
          status: 409,
          code: "USERNAME_ALREADY_EXISTS",
          message: "El username ya está registrado",
          requestId: req.requestId,
        });
      }

      console.error("Error en /auth/register:", err);
      return sendError(res, {
        status: 500,
        code: "REGISTER_FAILED",
        message: "No se pudo registrar el usuario",
        requestId: req.requestId,
      });
    }
  }
);

// POST /auth/login
router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema, { errorCode: "INVALID_LOGIN_PAYLOAD" }),
  async (req, res) => {
    const { username, password } = req.validatedBody;

    try {
      // En desarrollo/test garantizamos que exista un usuario demo
      await ensureDemoUser();

      const user = await authenticateUser(username, password);

      if (!user) {
        return sendError(res, {
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Credenciales incorrectas",
          requestId: req.requestId,
        });
      }

      const { accessToken, refreshToken } = generateTokens(user);

      return res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username },
      });
    } catch (err) {
      console.error("Error en /auth/login:", err);
      return sendError(res, {
        status: 500,
        code: "LOGIN_FAILED",
        message: "No se pudo completar el login",
        requestId: req.requestId,
      });
    }
  }
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Genera un nuevo access token usando un refresh token válido
 *     description: >
 *       Recibe un refresh token válido y devuelve un nuevo access token.
 *       No requiere header Authorization, solo el refreshToken en el cuerpo.
 *     tags: [Auth]
 *     security: []   # No usa bearerAuth, solo el cuerpo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token emitido previamente en /auth/login
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Nuevo access token generado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccessTokenResponse'
 *       400:
 *         description: Falta refreshToken en el cuerpo de la petición.
 *       401:
 *         description: Refresh token inválido o expirado.
 */
// POST /auth/refresh
router.post(
  "/refresh",
  refreshLimiter,
  validateBody(refreshSchema, { errorCode: "MISSING_REFRESH_TOKEN" }),
  async (req, res) => {
    const { refreshToken } = req.validatedBody;

    try {
      const payload = await verifyRefreshToken(refreshToken);

      const { accessToken } = generateTokens({
        id: payload.userId,
        username: payload.username,
      });

      res.json({ accessToken });
    } catch (err) {
      console.error("Error en /auth/refresh:", err.message);
      return sendError(res, {
        status: 401,
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token inválido o expirado",
        requestId: req.requestId,
      });
    }
  }
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout lógico. Invalida el refresh token recibido
 *     description: >
 *       Permite invalidar un refresh token específico para que no pueda
 *       volver a usarse en /auth/refresh.
 *     tags: [Auth]
 *     security: []   # No requiere bearerAuth, solo el cuerpo con refreshToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token que se desea invalidar
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       204:
 *         description: Logout lógico correcto. Refresh token invalidado (sin contenido en el cuerpo).
 *       400:
 *         description: Falta refreshToken en el cuerpo de la petición.
 */
// POST /auth/logout
router.post(
  "/logout",
  validateBody(refreshSchema, { errorCode: "MISSING_REFRESH_TOKEN" }),
  (req, res) => {
    const { refreshToken } = req.validatedBody;

    invalidateRefreshToken(refreshToken);
    return res.status(204).send();
  }
);

export default router;
