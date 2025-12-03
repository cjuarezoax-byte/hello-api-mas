import { CosmosClient } from "@azure/cosmos";

let client = null;
let tasksContainer = null;
let usersContainer = null;

const ensureClient = () => {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    throw new Error(
      "[CosmosDB] Faltan variables en .env: COSMOS_ENDPOINT o COSMOS_KEY"
    );
  }

  if (!client) {
    client = new CosmosClient({ endpoint, key });
  }

  return client;
};

const getDatabase = async () => {
  const databaseName = process.env.COSMOS_DB_NAME || "todo";
  const client = ensureClient();

  const { database } = await client.databases.createIfNotExists({
    id: databaseName,
  });

  return database;
};

// Contenedor de tareas (ya existente)
export const getTasksContainer = async () => {
  if (!tasksContainer) {
    const database = await getDatabase();
    const containerName = process.env.COSMOS_CONTAINER_NAME || "tasks";

    const { container } = await database.containers.createIfNotExists({
      id: containerName,
      partitionKey: { paths: ["/userId"], kind: "Hash" },
    });

    tasksContainer = container;
  }

  return tasksContainer;
};

// Nuevo: contenedor de usuarios para auth
export const getUsersContainer = async () => {
  if (!usersContainer) {
    const database = await getDatabase();
    const usersContainerName =
      process.env.COSMOS_USERS_CONTAINER_NAME || "users";

    const { container } = await database.containers.createIfNotExists({
      id: usersContainerName,
      partitionKey: { paths: ["/id"], kind: "Hash" },
    });

    usersContainer = container;
  }

  return usersContainer;
};
