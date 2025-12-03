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
    "SELECT c.id, c.userId, c.task, c.done, c.createdAt, c.updatedAt FROM c WHERE c.userId = @userId";
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

  return {
    items: resources,
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
  return resources[0] || null;
};

export const createTask = async (userId, { task, done = false }) => {
  const container = await getTasksContainer();

  const newTask = {
    id: crypto.randomUUID(),
    userId,
    task,
    done,
    createdAt: new Date().toISOString(),
  };

  const { resource } = await container.items.create(newTask);
  return resource;
};

export const updateTask = async (userId, id, { task, done }) => {
  const container = await getTasksContainer();

  const existing = await getTaskById(userId, id);
  if (!existing) return null;

  const updated = {
    ...existing,
    task: task ?? existing.task,
    done: typeof done === "boolean" ? done : existing.done,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await container.items.upsert(updated);
  return resource;
};

export const deleteTask = async (userId, id) => {
  const container = await getTasksContainer();

  const existing = await getTaskById(userId, id);
  if (!existing) return false;

  await container.item(existing.id, existing.userId).delete();
  return true;
};
