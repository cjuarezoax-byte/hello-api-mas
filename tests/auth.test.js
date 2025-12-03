// tests/auth.test.js
import request from "supertest";
import app from "../src/app.js";

describe("Auth flow (login / refresh / errores básicos)", () => {
  test("login exitoso devuelve accessToken, refreshToken y user", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "carlos", password: "secret123" })
      .expect(200);

    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).toEqual({ id: "carlos", username: "carlos" });

    // Siempre debe incluirse un X-Request-Id en la respuesta
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  test("login con credenciales incorrectas devuelve 401 con error estructurado", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "carlos", password: "mala" })
      .expect(401);

    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body).toHaveProperty("error");
    expect(res.body).toHaveProperty("requestId");
    expect(res.body.requestId).toBe(res.headers["x-request-id"]);
    expect(res.body.error).toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(typeof res.body.error.message).toBe("string");
  });

  test("refresh exitoso devuelve un nuevo accessToken", async () => {
    // Primero hacemos login para obtener un refreshToken válido
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ username: "carlos", password: "secret123" })
      .expect(200);

    const refreshToken = loginRes.body.refreshToken;
    expect(refreshToken).toBeDefined();

    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty("accessToken");
    expect(typeof res.body.accessToken).toBe("string");
    expect(res.headers["x-request-id"]).toBeDefined();
  });

  test("refresh falla si no mando refreshToken", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({})
      .expect(400);

    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatchObject({
      code: "MISSING_REFRESH_TOKEN",
    });
  });

  test("logout falla si no mando refreshToken", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .send({})
      .expect(400);

    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatchObject({
      code: "MISSING_REFRESH_TOKEN",
    });
  });
});

describe("/auth/register (registro de usuarios)", () => {
  test("register exitoso crea usuario nuevo y devuelve tokens", async () => {
    const uniqueSuffix = Date.now();
    const username = `user_${uniqueSuffix}`;
    const password = "secreto123";

    const res = await request(app)
      .post("/auth/register")
      .send({ username, password })
      .expect(201);

    // Cabecera de trazabilidad
    expect(res.headers["x-request-id"]).toBeDefined();

    // Structure básica de la respuesta
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body).toHaveProperty("user");

    // El usuario devuelto debe coincidir con el username
    expect(res.body.user).toMatchObject({ username });
    expect(typeof res.body.user.id).toBe("string");
  });

  test("register falla si faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({}) // sin username ni password
      .expect(400);

    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatchObject({
      code: "INVALID_REGISTER_PAYLOAD",
      message: "Payload inválido",
    });

    // Debe venir un arreglo con los detalles de validación de Zod
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  test("register con username duplicado devuelve 409 con error estructurado", async () => {
    const uniqueSuffix = Date.now();
    const username = `dupe_${uniqueSuffix}`;
    const password = "secreto123";

    // 1) Primer registro: debe funcionar
    await request(app)
      .post("/auth/register")
      .send({ username, password })
      .expect(201);

    // 2) Segundo registro con el mismo username: debe fallar con 409
    const res = await request(app)
      .post("/auth/register")
      .send({ username, password })
      .expect(409);

    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatchObject({
      code: "USERNAME_ALREADY_EXISTS",
    });
  });
});

describe("Auth: logout inválida realmente el refresh token", () => {
  test("después de /auth/logout el mismo refreshToken ya no sirve en /auth/refresh", async () => {
    const uniqueSuffix = Date.now();
    const username = `logout_user_${uniqueSuffix}`;
    const password = "secreto123";

    // 1) Registrar usuario nuevo (o podrías usar /auth/login si prefieres)
    const registerRes = await request(app)
      .post("/auth/register")
      .send({ username, password })
      .expect(201);

    const refreshToken = registerRes.body.refreshToken;
    expect(refreshToken).toBeDefined();

    // 2) Logout con ese refresh token
    await request(app)
      .post("/auth/logout")
      .send({ refreshToken })
      .expect(204);

    // 3) Intentar refresh de nuevo con el mismo token → debe fallar
    const refreshRes = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken })
      .expect(401);

    expect(refreshRes.body).toHaveProperty("error");
    expect(refreshRes.body.error).toHaveProperty("code");
    // Si tu código es exactamente INVALID_REFRESH_TOKEN:
    // expect(refreshRes.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });
});

describe("Auth: /auth/refresh con refreshToken inválido o malformado", () => {
  test("refresh con string que no es JWT devuelve 401", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: "esto-no-es-un-jwt" })
      .expect(401);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code");
  });

  test("refresh con token vacío en string devuelve 400 por validación", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: "" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("MISSING_REFRESH_TOKEN");
  });
});

describe("Auth: validaciones extra en login y register", () => {
  test("login sin password devuelve 400 con INVALID_LOGIN_PAYLOAD", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "carlos" }) // falta password
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("INVALID_LOGIN_PAYLOAD");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  test("register con username demasiado corto devuelve 400", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "ab", password: "secreto123" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("INVALID_REGISTER_PAYLOAD");
  });

  test("register con password demasiado corta devuelve 400", async () => {
    const uniqueSuffix = Date.now();
    const res = await request(app)
      .post("/auth/register")
      .send({ username: `shortpwd_${uniqueSuffix}`, password: "123" })
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("INVALID_REGISTER_PAYLOAD");
  });
});

describe("Auth: rate limiting en /auth/login", () => {
  test("múltiples logins fallidos acaban devolviendo 429 en algún intento", async () => {
    const username = "carlos";
    const passwordIncorrecto = "password_incorrecto";
    const responses = [];

    // Hacemos varios intentos fallidos
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post("/auth/login")
        .send({ username, password: passwordIncorrecto });
      responses.push(res);
    }

    const hubo429 = responses.some((r) => r.status === 429);

    // Esperamos que al menos uno sea 429 por rate limit
    expect(hubo429).toBe(true);
  });
});
