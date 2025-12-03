# hello-api-jwt

API REST en Node.js + Express con:

- JWT de acceso **y** refresh tokens
- CRUD de tareas persistido en **Azure Cosmos DB**
- Documentación interactiva con **Swagger UI** (`/api-docs`)
- Tests automatizados con **Jest + Supertest**

## Configuración rápida

1. Copia `.env.example` a `.env` y rellena tus datos de Cosmos DB.
2. Instala dependencias:

```bash
npm install
npm start
```

3. Abre:
- API: http://localhost:3000
- Swagger: http://localhost:3000/api-docs
