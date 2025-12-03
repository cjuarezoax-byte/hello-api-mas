import request from "supertest";
import app from "../src/app.js";

// CRUD básico con un usuario existente (carlos/secret123)
describe("Tasks CRUD con JWT", () => {
  let accessToken;
  let createdTaskId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ username: "carlos", password: "secret123" })
      .expect(200);

    accessToken = loginRes.body.accessToken;
  });

  test("GET /tasks sin Authorization devuelve 401", async () => {
    const res = await request(app).get("/tasks").expect(401);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /tasks con token devuelve 200 y un array", async () => {
    const res = await request(app)
      .get("/tasks")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body;
    const items = Array.isArray(body) ? body : body.items;
    expect(Array.isArray(items)).toBe(true);
  });

  test("POST /tasks crea una tarea nueva", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ task: "Tarea CRUD básica", done: false })
      .expect(201);

    expect(res.body).toHaveProperty("id");
    createdTaskId = res.body.id;
  });

  test("GET /tasks/:id devuelve la tarea creada", async () => {
    const res = await request(app)
      .get(`/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty("id", createdTaskId);
  });

  test("PUT /tasks/:id actualiza la tarea", async () => {
    const res = await request(app)
      .put(`/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ done: true })
      .expect(200);

    expect(res.body).toHaveProperty("id", createdTaskId);
    expect(res.body.done).toBe(true);
  });

  test("DELETE /tasks/:id elimina la tarea", async () => {
    await request(app)
      .delete(`/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);
  });

  test("GET /tasks/:id después de borrar devuelve 404", async () => {
    const res = await request(app)
      .get(`/tasks/${createdTaskId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);

    expect(res.body).toHaveProperty("error");
  });
});

// Seguridad básica de las rutas
describe("Tasks: rutas protegidas requieren JWT", () => {
  test("GET /tasks sin Authorization devuelve 401", async () => {
    const res = await request(app).get("/tasks").expect(401);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /tasks sin Authorization devuelve 401", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ task: "Tarea sin token" })
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  test("GET /tasks con token inválido devuelve 401", async () => {
    const res = await request(app)
      .get("/tasks")
      .set("Authorization", "Bearer token-invalido")
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });

  test("DELETE /tasks/{id} con token inválido devuelve 401", async () => {
    const res = await request(app)
      .delete("/tasks/algun-id")
      .set("Authorization", "Bearer token-invalido")
      .expect(401);

    expect(res.body).toHaveProperty("error");
  });
});

// Aislamiento entre usuarios
describe("Tasks: aislamiento entre usuarios", () => {
  async function registerAndGetToken(username) {
    const password = "secreto123";
    const res = await request(app)
      .post("/auth/register")
      .send({ username, password })
      .expect(201);

    return res.body.accessToken;
  }

  test("un usuario no puede leer ni borrar tareas de otro usuario", async () => {
    const now = Date.now();
    const tokenA = await registerAndGetToken(`userA_${now}`);
    const tokenB = await registerAndGetToken(`userB_${now}`);

    const createRes = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ task: "Tarea de A", done: false })
      .expect(201);

    const taskIdA = createRes.body.id;

    const getRes = await request(app)
      .get(`/tasks/${taskIdA}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(404);

    expect(getRes.body).toHaveProperty("error");

    const deleteRes = await request(app)
      .delete(`/tasks/${taskIdA}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(404);

    expect(deleteRes.body).toHaveProperty("error");
  });
});

// Validación de payloads
describe("Tasks: validación de payloads en create/update", () => {
  let accessToken;

  beforeAll(async () => {
    const now = Date.now();
    const username = `validator_${now}`;
    const password = "secreto123";

    const registerRes = await request(app)
      .post("/auth/register")
      .send({ username, password })
      .expect(201);

    accessToken = registerRes.body.accessToken;
  });

  test("POST /tasks con body vacío devuelve 400", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("INVALID_TASK_PAYLOAD");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  test("POST /tasks con task vacío devuelve 400", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ task: "", done: false })
      .expect(400);

    expect(res.body).toHaveProperty("error");
  });

  test("PUT /tasks/{id} con body vacío devuelve 400", async () => {
    const createRes = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ task: "Tarea para update vacío", done: false })
      .expect(201);

    const taskId = createRes.body.id;

    const res = await request(app)
      .put(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("INVALID_TASK_PAYLOAD");
  });
});

// IDs inexistentes
describe("Tasks: manejo de IDs inexistentes", () => {
  let accessToken;

  beforeAll(async () => {
    const now = Date.now();
    const username = `idtester_${now}`;
    const password = "secreto123";

    const registerRes = await request(app)
      .post("/auth/register")
      .send({ username, password })
      .expect(201);

    accessToken = registerRes.body.accessToken;
  });

  test("GET /tasks/{id} con id inexistente devuelve 404", async () => {
    const res = await request(app)
      .get("/tasks/id-que-no-existe-123")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);

    expect(res.body).toHaveProperty("error");
  });

  test("DELETE /tasks/{id} con id inexistente devuelve 404", async () => {
    const res = await request(app)
      .delete("/tasks/id-que-no-existe-456")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);

    expect(res.body).toHaveProperty("error");
  });
});

// Filtros y paginación (flexible a tu implementación actual)
describe("Tasks: filtros por done y paginación", () => {
  let accessToken;

  beforeAll(async () => {
    const now = Date.now();
    const username = `filteruser_${now}`;
    const password = "secreto123";

    const registerRes = await request(app)
      .post("/auth/register")
      .send({ username, password })
      .expect(201);

    accessToken = registerRes.body.accessToken;

    const tasksToCreate = [
      { task: "Tarea 1 no done", done: false },
      { task: "Tarea 2 done", done: true },
      { task: "Tarea 3 done", done: true },
    ];

    for (const t of tasksToCreate) {
      await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(t)
        .expect(201);
    }
  });

  test("GET /tasks?done=true devuelve array válido (y done=true si el campo existe)", async () => {
    const res = await request(app)
      .get("/tasks?done=true")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body;
    const items = Array.isArray(body) ? body : body.items;
    expect(Array.isArray(items)).toBe(true);

    if (items.length > 0 && Object.prototype.hasOwnProperty.call(items[0], "done")) {
      for (const task of items) {
        expect(task.done).toBe(true);
      }
    }
  });

  test("GET /tasks paginado no rompe la API", async () => {
    const resPage1 = await request(app)
      .get("/tasks?page=1&pageSize=2")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body1 = resPage1.body;
    const items1 = Array.isArray(body1) ? body1 : body1.items;
    expect(Array.isArray(items1)).toBe(true);

    const resPage2 = await request(app)
      .get("/tasks?page=2&pageSize=2")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body2 = resPage2.body;
    const items2 = Array.isArray(body2) ? body2 : body2.items;
    expect(Array.isArray(items2)).toBe(true);
  });

  test("GET /tasks con parámetros de paginación raros responde 200 y un array", async () => {
    const res = await request(app)
      .get("/tasks?page=0&pageSize=0")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body;
    const items = Array.isArray(body) ? body : body.items;
    expect(Array.isArray(items)).toBe(true);
  });
});
