// tests/swagger.test.js
import { swaggerSpec } from "../src/config/swaggerConfig.js";

describe("Swagger spec", () => {
  it("se construye correctamente", () => {
    expect(swaggerSpec).toBeDefined();
    expect(swaggerSpec.openapi).toBe("3.0.0");
    expect(swaggerSpec.info).toBeDefined();
    expect(swaggerSpec.paths).toBeDefined();
  });
});
