// src/validation/taskSchemas.js
import { z } from "zod";

// Crear tarea: task requerido, done opcional boolean
export const createTaskSchema = z.object({
  task: z.string().min(1, "task es requerido"),
  done: z.boolean().optional(),
});

// Actualizar tarea: task y done opcionales,
// pero al menos uno de los dos debe venir
export const updateTaskSchema = z
  .object({
    task: z.string().min(1, "task no puede ser vacío").optional(),
    done: z.boolean().optional(),
  })
  .refine(
    (data) => data.task !== undefined || data.done !== undefined,
    {
      message: "Debes enviar al menos 'task' o 'done'",
      path: ["task"], // dónde colgamos el error
    }
  );
