// src/config/swaggerConfig.js
import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "hello-api-jwt",
      version: "1.0.0",
      description: "API REST con JWT (access + refresh), Cosmos DB y Swagger",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Escanea todas las rutas para los bloques @swagger
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);
