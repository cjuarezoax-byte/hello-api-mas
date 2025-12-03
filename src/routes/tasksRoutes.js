import express from "express";
import {
  listTasksByUser,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "../services/tasksService.js";
import { sendError } from "../utils/errorResponse.js";
import { validateBody } from "../middleware/validationMiddleware.js";
import {
  createTaskSchema,
  updateTaskSchema,
} from "../validation/taskSchemas.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: CRUD de tareas
 */
 
/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       description: Tarea almacenada en Cosmos DB
 *       properties:
 *         id:
 *           type: string
 *           description: Identificador único de la tarea
 *           example: "443f31a3-ea6f-4305-a5d5-20f4b3c8f123"
 *         userId:
 *           type: string
 *           description: Usuario propietario de la tarea
 *           example: "carlos"
 *         task:
 *           type: string
 *           description: Descripción de la tarea
 *           example: "La API de Marketo se autentica correctamente"
 *         done:
 *           type: boolean
 *           description: Indica si la tarea está completada
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación en formato ISO 8601
 *           example: "2025-11-18T22:13:14.123Z"
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Lista las tareas del usuario autenticado
 *     description: Devuelve todas las tareas asociadas al usuario extraído del access token.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tareas del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: No autorizado. Falta token o es inválido.
 *       500:
 *         description: Error interno al listar las tareas.
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Query params: ?page=&pageSize=&done=
    const { page, pageSize, done } = req.query;

    let doneFilter;
    if (done === "true") doneFilter = true;
    if (done === "false") doneFilter = false;

    const result = await listTasksByUser(userId, {
      done: doneFilter,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });

    res.json(result);
  } catch (err) {
    console.error("Error listando tareas:", err.message);
    return sendError(res, {
      status: 500,
      code: "TASKS_LIST_ERROR",
      message: "Error listando tareas",
      requestId: req.requestId,
    });
  }
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Obtiene una tarea por id
 *     description: Devuelve la tarea del usuario autenticado cuyo id coincida con el parámetro.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id de la tarea
 *         schema:
 *           type: string
 *           example: "443f31a3-ea6f-4305-a5d5-20f4b3c8f123"
 *     responses:
 *       200:
 *         description: Tarea encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: No autorizado. Falta token o es inválido.
 *       404:
 *         description: Tarea no encontrada para ese usuario/id.
 *       500:
 *         description: Error interno al obtener la tarea.
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const task = await getTaskById(userId, id);

    if (!task) {
      return sendError(res, {
        status: 404,
        code: "TASK_NOT_FOUND",
        message: "Tarea no encontrada",
        requestId: req.requestId,
      });
    }

    res.json(task);
  } catch (err) {
    console.error("Error obteniendo tarea:", err.message);
    return sendError(res, {
      status: 500,
      code: "TASK_GET_ERROR",
      message: "Error obteniendo tarea",
      requestId: req.requestId,
    });
  }
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Crea una nueva tarea para el usuario autenticado
 *     description: Crea una tarea asociada al usuario del access token.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - task
 *             properties:
 *               task:
 *                 type: string
 *                 description: Descripción de la tarea
 *                 example: "Preparar demo de la API hello-api-jwt"
 *               done:
 *                 type: boolean
 *                 description: Estado inicial de la tarea
 *                 default: false
 *     responses:
 *       201:
 *         description: Tarea creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Datos de entrada inválidos (por ejemplo, falta 'task').
 *       401:
 *         description: No autorizado. Falta token o es inválido.
 *       500:
 *         description: Error interno al crear la tarea.
 */
router.post(
  "/",
  validateBody(createTaskSchema, { errorCode: "INVALID_TASK_PAYLOAD" }),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const { task, done } = req.validatedBody;

      const created = await createTask(userId, { task, done });
      res.status(201).json(created);
    } catch (err) {
      console.error("Error creando tarea:", err.message);
      return sendError(res, {
        status: 500,
        code: "TASK_CREATE_ERROR",
        message: "Error creando tarea",
        requestId: req.requestId,
      });
    }
  }
);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Actualiza una tarea existente
 *     description: Actualiza la tarea del usuario autenticado cuyo id coincida con el parámetro.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id de la tarea a actualizar
 *         schema:
 *           type: string
 *           example: "443f31a3-ea6f-4305-a5d5-20f4b3c8f123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               task:
 *                 type: string
 *                 description: Nueva descripción de la tarea
 *                 example: "Actualizar documentación de hello-api-jwt"
 *               done:
 *                 type: boolean
 *                 description: Nuevo estado de la tarea
 *                 example: true
 *     responses:
 *       200:
 *         description: Tarea actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Datos de entrada inválidos.
 *       401:
 *         description: No autorizado. Falta token o es inválido.
 *       404:
 *         description: Tarea no encontrada para ese usuario/id.
 *       500:
 *         description: Error interno al actualizar la tarea.
 */
router.put(
  "/:id",
  validateBody(updateTaskSchema, { errorCode: "INVALID_TASK_PAYLOAD" }),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { task, done } = req.validatedBody;

      const updated = await updateTask(userId, id, { task, done });

      if (!updated) {
        return sendError(res, {
          status: 404,
          code: "TASK_NOT_FOUND",
          message: "Tarea no encontrada",
          requestId: req.requestId,
        });
      }

      res.json(updated);
    } catch (err) {
      console.error("Error actualizando tarea:", err.message);
      return sendError(res, {
        status: 500,
        code: "TASK_UPDATE_ERROR",
        message: "Error actualizando tarea",
        requestId: req.requestId,
      });
    }
  }
);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Elimina una tarea
 *     description: Elimina la tarea del usuario autenticado cuyo id coincida con el parámetro.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id de la tarea a eliminar
 *         schema:
 *           type: string
 *           example: "443f31a3-ea6f-4305-a5d5-20f4b3c8f123"
 *     responses:
 *       204:
 *         description: Tarea eliminada correctamente (sin contenido en el cuerpo).
 *       401:
 *         description: No autorizado. Falta token o es inválido.
 *       404:
 *         description: Tarea no encontrada para ese usuario/id.
 *       500:
 *         description: Error interno al eliminar la tarea.
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const ok = await deleteTask(userId, id);

    if (!ok) {
      return sendError(res, {
        status: 404,
        code: "TASK_NOT_FOUND",
        message: "Tarea no encontrada",
        requestId: req.requestId,
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error("Error eliminando tarea:", err.message);
    return sendError(res, {
      status: 500,
      code: "TASK_DELETE_ERROR",
      message: "Error eliminando tarea",
      requestId: req.requestId,
    });
  }
});

export default router;
