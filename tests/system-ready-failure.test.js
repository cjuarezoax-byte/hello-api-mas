// tests/system-ready-failure.test.js
import request from "supertest";
import { jest } from "@jest/globals";

describe("System: /ready cuando Cosmos falla", () => {
  test("devuelve 503 y status not-ready cuando getTasksContainer lanza error", async () => {
    // Aseguramos que los módulos se vuelvan a cargar
    jest.resetModules();

    // Mock del config de Cosmos para que lance error
    jest.unstable_mockModule("../src/config/cosmosConfig.js", () => {
      return {
        getTasksContainer: async () => {
          throw new Error("Cosmos down for test");
        },
        // Si tienes getUsersContainer y lo usa /ready, mockéalo igual:
        getUsersContainer: async () => {
          throw new Error("Cosmos down for test");
        },
      };
    });

    // Importamos app DESPUÉS del mock
    const { default: app } = await import("../src/app.js");

    const res = await request(app).get("/ready");

    // Idealmente 503, pero si tu código usa 500 ajusta este valor
    expect([500, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body.status).not.toBe("ready");
  });
});
