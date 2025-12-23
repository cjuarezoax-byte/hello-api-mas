// src/validation/taskSchemas.js
import { z } from "zod";

// Reglas de negocio (alineadas con Swagger):
// - task: mínimo 1 caracter real, máximo 200.
// - note: hasta 2000 caracteres.

const TASK_MIN_LENGTH = 1;
const TASK_MAX_LENGTH = 200;
const NOTE_MAX_LENGTH = 2000;

// Crear tarea: task requerido, done y note opcionales
export const createTaskSchema = z.object({
  task: z
    .string()
    .trim()
    .min(TASK_MIN_LENGTH, "task es requerido y no puede estar vacío")
    .max(
      TASK_MAX_LENGTH,
      `task no debe exceder ${TASK_MAX_LENGTH} caracteres`
    ),
  done: z.boolean().optional(),
  note: z
    .string()
    .trim()
    .max(
      NOTE_MAX_LENGTH,
      `note no debe exceder ${NOTE_MAX_LENGTH} caracteres`
    )
    .optional(),
});

// Actualizar tarea: task, done y note opcionales,
// pero al menos uno de los tres debe venir
export const updateTaskSchema = z
  .object({
    task: z
      .string()
      .trim()
      .min(TASK_MIN_LENGTH, "task no puede ser vacío")
      .max(
        TASK_MAX_LENGTH,
        `task no debe exceder ${TASK_MAX_LENGTH} caracteres`
      )
      .optional(),
    done: z.boolean().optional(),
    note: z
      .string()
      .trim()
      .max(
        NOTE_MAX_LENGTH,
        `note no debe exceder ${NOTE_MAX_LENGTH} caracteres`
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.task !== undefined ||
      data.done !== undefined ||
      data.note !== undefined,
    {
      message: "Debes enviar al menos 'task', 'done' o 'note'",
      path: ["task"],
    }
  );
