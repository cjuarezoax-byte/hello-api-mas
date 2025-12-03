// src/services/userService.js
import bcrypt from "bcryptjs";
import { getUsersContainer } from "../config/cosmosConfig.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

/**
 * Busca un usuario por username.
 * Devuelve el documento completo (incluye passwordHash) o null si no existe.
 */
export async function findUserByUsername(username) {
  const container = await getUsersContainer();

  const querySpec = {
    query:
      "SELECT TOP 1 c.id, c.username, c.passwordHash, c.roles, c.createdAt, c.updatedAt FROM c WHERE c.username = @username",
    parameters: [{ name: "@username", value: username }],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources[0] || null;
}

/**
 * Crea un nuevo usuario con password hasheado.
 * Lanza un error con code = "USERNAME_TAKEN" si el username ya existe.
 */
export async function createUser({ username, password, roles = ["user"] }) {
  const existing = await findUserByUsername(username);
  if (existing) {
    const err = new Error("El username ya existe");
    err.code = "USERNAME_TAKEN";
    throw err;
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Nota: usamos el propio username como id para mantener compatibilidad
  // con tus tests actuales, donde el usuario "carlos" tiene id "carlos".
  const userDoc = {
    id: username,
    username,
    passwordHash,
    roles,
    createdAt: now,
    updatedAt: now,
  };

  const container = await getUsersContainer();
  const { resource } = await container.items.create(userDoc);

  return {
    id: resource.id,
    username: resource.username,
    roles: resource.roles,
  };
}

/**
 * Autentica a un usuario: compara password plano contra el hash almacenado.
 * Devuelve { id, username, roles } o null si credenciales inválidas.
 */
export async function authenticateUser(username, password) {
  const user = await findUserByUsername(username);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return {
    id: user.id,
    username: user.username,
    roles: user.roles,
  };
}

/**
 * Solo para desarrollo/test: garantiza que exista un usuario demo
 * (carlos / secret123) en la colección de usuarios.
 * En producción no hace nada.
 */
export async function ensureDemoUser() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const username = process.env.DEMO_USERNAME || "carlos";
  const password = process.env.DEMO_PASSWORD || "secret123";

  const existing = await findUserByUsername(username);
  if (existing) {
    return {
      id: existing.id,
      username: existing.username,
      roles: existing.roles,
    };
  }

  return createUser({ username, password });
}
