# infra-api-todo

API REST + frontend ToDo “nivel producción”, construidos con **Node.js**, **Express**, **Azure Cosmos DB** y desplegables en **Azure Web App** con frontend servible desde **GitHub Pages**.

Incluye:

- Backend con JWT (access + refresh tokens), validación con Zod y documentación con Swagger.
- Frontend HTML/JS que consume la API (login, tareas, notas).
- CI/CD con GitHub Actions listo para integrarse con Azure.
- Buenas prácticas de seguridad: `.env` fuera del repo, secrets en Azure/GitHub, rate limiting, helmet.

---

## Arquitectura

- **Backend**: Node.js + Express.
- **Base de datos**: Azure Cosmos DB (API SQL).
- **Auth**: JWT con access token + refresh token.
- **Frontend**: HTML + JavaScript vanilla (fetch) consumiendo la API.
- **Infraestructura**: Azure Web App para la API + GitHub Actions (CI/CD).
- **Documentación**: Swagger/OpenAPI 3 disponible en `/api-docs`.

Diagrama simplificado:

```text
[Browser / GitHub Pages]
         |
         | HTTPS (JWT Bearer)
         v
[Azure Web App - infra-api-todo]
         |
         | Cosmos key (secreto en Azure)
         v
[Azure Cosmos DB]
```

---

## Características principales

### API REST de tareas (ToDo)

- CRUD completo de tareas en `/tasks`.
- DTO de `Task` pensado para el frontend:

  ```json
  {
    "id": "uuid",
    "userId": "carlos",
    "task": "Texto breve de la tarea",
    "done": false,
    "note": "Nota opcional más larga",
    "createdAt": "2025-11-18T22:13:14.123Z",
    "updatedAt": "2025-11-19T10:05:00.000Z"
  }
  ```

- Respuestas paginadas:

  ```json
  {
    "items": [ /* ...tasks... */ ],
    "page": 1,
    "pageSize": 20,
    "hasMore": false
  }
  ```

- Filtros por estado (`done=true|false`) y parámetros `page`, `pageSize`.

### Autenticación con JWT

Endpoints principales:

- `POST /auth/register` → alta de usuarios.
- `POST /auth/login` → devuelve `accessToken`, `refreshToken` y datos de usuario.
- `POST /auth/refresh` → renueva tokens usando `refreshToken`.
- `POST /auth/logout` → invalida el refresh token actual.

Los endpoints de `/tasks` están protegidos con `Authorization: Bearer <accessToken>`.

### Validación con Zod

- Schemas para auth y tareas.
- Validación de:
  - Obligatoriedad de campos (`task` requerido en creación).
  - Longitudes máximas:
    - `task`: 1–200 caracteres.
    - `note`: hasta 2000 caracteres.
- Errores de validación → `400 Bad Request` con mensajes descriptivos.

### Swagger / OpenAPI 3

- Documentación accesible en `/api-docs`.
- Incluye:
  - Schemas de `Task` y payloads de auth.
  - Ejemplos de requests/responses.
  - Seguridad `bearerAuth` configurada.
- Test dedicado (`swagger.test.js`) que asegura que el spec se construye correctamente y rompe el CI si hay errores de comentarios Swagger.

### Observabilidad y hardening

- **Cabeceras de seguridad** con `helmet`.
- **Rate limiting**:
  - Límites específicos para `/auth/login` y `/auth/refresh`.
  - Límite global para `/tasks`.
- Endpoints de sistema:
  - `/health` → estado básico de la API.
  - `/ready` → chequea conexión a Cosmos (útil para readiness probes).
  - `/metrics` → métricas estilo Prometheus (requests, errores, etc.).
- Logs estructurados JSON con `X-Request-Id` por petición.

### Frontend ToDo (HTML/JS)

- `public/index.html` (o `index.html` en raíz, según configuración del repo).
- Flujo general:
  - Pantalla de login (usuario/contraseña).
  - Guardado de `accessToken` y `refreshToken` en `localStorage`.
  - Listado de tareas del usuario autenticado.
  - Crear tareas nuevas.
  - Marcar tareas como cerradas.
  - Borrar tareas.
  - Modal para editar **notas** (campo `note`) persistidas en Cosmos.
  - Resumen por usuario: total de tareas, abiertas y cerradas.

---

## Estructura del proyecto

```text
infra-api-todo/
├─ .github/
│  └─ workflows/
│     └─ ci-cd.yml           # Pipeline: tests + deploy a Azure Web App
│
├─ src/
│  ├─ app.js                 # Config principal de Express
│  ├─ server.js              # Punto de entrada del servidor
│  │
│  ├─ config/
│  │  ├─ cosmosConfig.js     # Cliente Cosmos DB y helpers
│  │  ├─ jwtConfig.js        # requireEnv + secretos JWT + expiraciones
│  │  ├─ swaggerConfig.js    # Configuración de swaggerSpec (OpenAPI 3)
│  │  └─ rateLimitConfig.js  # Configuraciones de express-rate-limit
│  │
│  ├─ routes/
│  │  ├─ authRoutes.js       # Rutas de autenticación (/auth)
│  │  └─ tasksRoutes.js      # Rutas de tareas (/tasks) + comentarios Swagger
│  │
│  ├─ services/
│  │  ├─ tasksService.js     # Lógica de negocio de tareas (Cosmos, DTO Task)
│  │  ├─ userService.js      # Creación/consulta de usuarios
│  │  ├─ tokenService.js     # Creación/verificación de JWT
│  │  └─ tokenStore.js       # Gestión de refresh tokens
│  │
│  ├─ validation/
│  │  ├─ authSchemas.js      # Schemas Zod para register/login/refresh
│  │  └─ taskSchemas.js      # Schemas Zod para create/update task
│  │
│  ├─ middleware/
│  │  ├─ authMiddleware.js       # Verifica Bearer token y rellena req.user
│  │  ├─ validationMiddleware.js # Aplica Zod y coloca req.validatedBody
│  │  ├─ requestIdMiddleware.js  # Genera y adjunta X-Request-Id
│  │  └─ loggingMiddleware.js    # Logs JSON por request
│  │
│  └─ utils/
│     ├─ errorResponse.js    # Helper para respuestas de error
│     └─ metrics.js          # Registro de métricas Prometheus
│
├─ tests/
│  ├─ auth.test.js           # Tests de /auth
│  ├─ tasks.test.js          # Tests de /tasks CRUD
│  ├─ system.test.js         # Tests de /health, /ready, /metrics
│  ├─ system-ready-failure.test.js  # Simula fallo de Cosmos en /ready
│  └─ swagger.test.js        # Asegura que swaggerSpec se construye sin errores
│
├─ public/
│  └─ index.html             # Frontend ToDo (ideal para GitHub Pages)
│
├─ .env.example              # Plantilla de variables de entorno (sin secretos reales)
├─ .gitignore                # Incluye .env, node_modules, etc.
├─ Dockerfile                # Imagen de producción para la API
├─ package.json
├─ package-lock.json
├─ README.md                 # Este archivo
└─ LICENSE                   # Licencia del proyecto (ej. MIT)
```

> ⚠️ El archivo `.env` real no se incluye en el repo y está en `.gitignore`.

---

## Requisitos

- **Node.js** 18+  
- **Cuenta de Azure** con:
  - Una instancia de **Cosmos DB (API SQL)**.
  - Una **Azure Web App** para alojar la API.
- **Cuenta de GitHub** para:
  - Repositorio del proyecto.
  - GitHub Actions (CI/CD).
  - (Opcional) GitHub Pages para el frontend.

---

## Configuración local

1. Clonar el repo:

   ```bash
   git clone https://github.com/tu-usuario/infra-api-todo.git
   cd infra-api-todo
   ```

2. Crear `.env` a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

3. Editar `.env` y rellenar con tus valores reales:

   - `COSMOS_ENDPOINT`
   - `COSMOS_KEY`
   - `COSMOS_DB_NAME`
   - `COSMOS_CONTAINER_NAME`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CORS_ORIGIN` (ej. `http://127.0.0.1:5500` para desarrollo)

4. Instalar dependencias:

   ```bash
   npm install
   ```

5. Ejecutar tests:

   ```bash
   npm test
   ```

6. Levantar la API en local:

   ```bash
   npm run dev
   ```

   - API → `http://localhost:3000`
   - Swagger → `http://localhost:3000/api-docs`
   - Health → `http://localhost:3000/health`

7. Levantar el frontend:

   - Servir `public/` con un servidor estático (por ejemplo, VSCode Live Server o `npx serve public`).
   - Ajustar en `public/index.html`:

     ```js
     const API_BASE_URL = "http://localhost:3000";
     ```

---

## Despliegue en Azure Web App (API)

1. Crear una **Web App** en Azure para Node.js.
2. Ir a **Configuration → Application settings** de la Web App y crear las variables:

   - `COSMOS_ENDPOINT`
   - `COSMOS_KEY`
   - `COSMOS_DB_NAME`
   - `COSMOS_CONTAINER_NAME`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CORS_ORIGIN` (la URL de tu frontend: GitHub Pages o dominio propio)
   - Cualquier otra variable exigida por `jwtConfig.js` / `cosmosConfig.js`.

3. Obtener el **Publish Profile** de la Web App y guardarlo como secret en GitHub (por ejemplo `AZURE_WEBAPP_PUBLISH_PROFILE`).

4. Ajustar `.github/workflows/ci-cd.yml` para usar ese secret y el nombre de tu Web App.

5. Cada push a `main` ejecuta:

   - Job de tests (Jest + Supertest).
   - Si todo pasa, despliegue automático a Azure Web App.

> Las keys reales y secrets **nunca** viven en el repo; solo en:
> - `.env` local (ignorado por git).
> - Secrets de GitHub Actions.
> - Application Settings de Azure Web App.

---

## Despliegue del frontend en GitHub Pages

1. Mantener el frontend en `public/index.html` (o moverlo a `/docs` si prefieres esa convención).
2. En GitHub:

   - Ir a **Settings → Pages**.
   - Seleccionar como fuente:
     - Branch: `main`
     - Carpeta: `/root`, `/docs` o `/public` según tu configuración.

3. Ajustar en el JS del frontend:

   ```js
   const API_BASE_URL = "https://TU-API.azurewebsites.net";
   ```

4. En tu API, asegurar que `CORS_ORIGIN` incluye la URL de GitHub Pages, por ejemplo:

   ```ini
   CORS_ORIGIN=https://tu-usuario.github.io
   ```

Con esto, GitHub Pages servirá el frontend y éste hablará con tu API en Azure usando HTTPS + JWT, sin exponer ningún secreto.

---

## Seguridad y buenas prácticas

- `.env` está en `.gitignore` → no se sube al repo.
- `.env.example` solo contiene **valores de ejemplo**, nunca secretos reales.
- Secrets reales se almacenan exclusivamente en:
  - Azure (Application Settings / Key Vault).
  - GitHub Actions Secrets.
- Rutas sensibles (`/tasks`, `/auth/refresh`) protegidas por:
  - JWT y middlewares de autenticación.
  - Rate limiting para mitigar abuso.
- Rotación de keys (Cosmos, JWT) soportada actualizando únicamente:
  - Secrets en GitHub.
  - App Settings en Azure.
  - `.env` local.

---

## Roadmap / mejoras futuras

Algunas ideas para evolucionar el proyecto:

- Auto-refresh de tokens en el frontend usando `/auth/refresh`.
- Campos adicionales en `Task`:
  - `priority` (low/medium/high), `dueDate`, `tags`.
- Panel de administración:
  - Resumen de tareas por usuario.
  - Métricas de uso.
- Versión PWA:
  - Cache offline de tareas.
  - Cola de operaciones para sincronizar cuando vuelve la conexión.
- Integración con herramientas de observabilidad:
  - Application Insights, dashboards externos, etc.

---

## Licencia

Este proyecto se distribuye bajo la licencia **MIT** (o la que prefieras).  
Incluye un archivo `LICENSE` en la raíz del repo con los términos detallados.
