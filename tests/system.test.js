// tests/system.test.js
import request from "supertest";
import app from "../src/app.js";

describe("System: métricas incrementales", () => {
  test("requestsTotal aumenta después de hacer peticiones", async () => {
    // 1) Métricas iniciales
    const initialRes = await request(app).get("/metrics").expect(200);
    expect(initialRes.body).toHaveProperty("metrics");
    const initialTotal = initialRes.body.metrics.requestsTotal;

    // 2) Hacer algunas peticiones (aunque devuelvan 401 cuentan)
    await request(app).get("/tasks").expect(401);
    await request(app).get("/health").expect(200);

    // 3) Métricas después
    const finalRes = await request(app).get("/metrics").expect(200);
    const finalTotal = finalRes.body.metrics.requestsTotal;

    expect(finalTotal).toBeGreaterThanOrEqual(initialTotal + 2);
  });
});

describe("System endpoints (health, ready, metrics)", () => {
  test("GET /health responde ok con campos básicos", async () => {
    const res = await request(app).get("/health").expect(200);

    expect(res.body).toHaveProperty("status", "ok");
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(typeof res.body.timestamp).toBe("string");
  });

  test("GET /ready responde ready o not-ready con status HTTP adecuado", async () => {
    const res = await request(app).get("/ready");

    // Dependiendo de si Cosmos está bien configurado o no, puede ser 200 o 503
    expect([200, 503]).toContain(res.status);
    expect(["ready", "not-ready"]).toContain(res.body.status);
  });

  test("GET /metrics devuelve estructura básica de métricas", async () => {
    const res = await request(app).get("/metrics").expect(200);

    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("metrics");

    const m = res.body.metrics;
    expect(typeof m.requestsTotal).toBe("number");
    expect(typeof m.requestsByRoute).toBe("object");
    expect(typeof m.errors5xx).toBe("number");
  });
});
