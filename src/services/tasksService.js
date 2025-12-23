import crypto from "crypto";
import { getTasksContainer } from "../config/cosmosConfig.js";

export async function listTasksByUser(userId, { done, page, pageSize } = {}) {
  const pageNumber = Number.isInteger(page) && page > 0 ? page : 1;
  const size =
    Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 100
      ? pageSize
      : 20;
  const offset = (pageNumber - 1) * size;

  let queryText =
    "SELECT c.id, c.userId, c.task, c.done, c.createdAt, c.updatedAt, c.note FROM c WHERE c.userId = @userId";
  const parameters = [{ name: "@userId", value: userId }];

  if (typeof done === "boolean") {
    queryText += " AND c.done = @done";
    parameters.push({ name: "@done", value: done });
  }

  queryText += " ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit";
  parameters.push({ name: "@offset", value: offset });
  parameters.push({ name: "@limit", value: size });

  const container = await getTasksContainer();

  const { resources, continuationToken } = await container.items
    .query({
      query: queryText,
      parameters,
    })
    .fetchNext();

  // Normalizamos para que siempre haya updatedAt (si falta, usamos createdAt)
  const items = resources.map((doc) => ({
    ...doc,
    updatedAt: doc.updatedAt || doc.createdAt,
  }));

  return {
    items,
    page: pageNumber,
    pageSize: size,
    hasMore: Boolean(continuationToken),
  };
}

export const getTaskById = async (userId, id) => {
  const container = await getTasksContainer();
  const querySpec = {
    query: "SELECT * FROM c WHERE c.userId = @userId AND c.id = @id",
    parameters: [
      { name: "@userId", value: userId },
      { name: "@id", value: id },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  const task = resources[0] || null;

  if (!task) return null;

  return {
    ...task,
    updatedAt: task.updatedAt || task.createdAt,
  };
};

export const createTask = async (userId, { task, done = false, note }) => {
  const container = await getTasksContainer();

  const now = new Date().toISOString();

  const newTask = {
    id: crypto.randomUUID(),
    userId,
    task,
    done,
    note: note ?? null,     // guardamos null si no envían nada
    createdAt: now,
    updatedAt: now,
  };

  const { resource } = await container.items.create(newTask);
  // Normalizamos también aquí por si acaso
  return {
    ...resource,
    updatedAt: resource.updatedAt || resource.createdAt,
  };
};

export const updateTask = async (userId, id, { task, done, note }) => {
  const container = await getTasksContainer();

  const existing = await getTaskById(userId, id);
  if (!existing) return null;

  const updated = {
    ...existing,
    task: task ?? existing.task,
    done: typeof done === "boolean" ? done : existing.done,
    note: note !== undefined ? note : existing.note, // permite borrar nota con ""
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await container.items.upsert(updated);
  return {
    ...resource,
    updatedAt: resource.updatedAt || resource.createdAt,
  };
};

export const deleteTask = async (userId, id) => {
  const container = await getTasksContainer();

  const existing = await getTaskById(userId, id);
  if (!existing) return false;

  await container.item(existing.id, existing.userId).delete();
  return true;
};
