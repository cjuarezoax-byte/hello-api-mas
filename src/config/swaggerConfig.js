import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "hello-api-jwt",
      version: "1.0.0",
      description: "API REST con JWT (access + refresh), Cosmos DB y Swagger",
    },
    // 👇 usar URL relativa para que funcione tanto en local como en Azure
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ["./src/routes/*.js"]
};

export const swaggerSpec = swaggerJSDoc(options);
