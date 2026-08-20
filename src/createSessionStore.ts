import { createClient } from "redis";
import MemoryStore from "./MemoryStore";
import { type SessionStore } from "./types";

const DEFAULT_REDIS_HOST = "127.0.0.1";
const DEFAULT_REDIS_PORT = 6379;
const INITIAL_CONNECT_TIMEOUT_MS = 2000;

const createRedisClient = () => {
    let ready = false;
    const socket = {
        connectTimeout: INITIAL_CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries: number) => {
            if (!ready) {
                return new Error("Redis unavailable at startup");
            }
            return Math.min(retries * 100, 3000);
        },
    };

    const url = process.env.REDIS_URL;
    const client = url
        ? createClient({ url, socket })
        : createClient({
              password: process.env.REDIS_PASSWORD || undefined,
              socket: {
                  ...socket,
                  host: process.env.REDIS_HOST || DEFAULT_REDIS_HOST,
                  port: Number(process.env.REDIS_PORT) || DEFAULT_REDIS_PORT,
              },
          });

    return {
        client,
        markReady: () => {
            ready = true;
        },
    };
};

const describeRedisTarget = (): string => {
    if (process.env.REDIS_URL) {
        return "REDIS_URL";
    }
    const host = process.env.REDIS_HOST || DEFAULT_REDIS_HOST;
    const port = process.env.REDIS_PORT || String(DEFAULT_REDIS_PORT);
    return `${host}:${port}`;
};

const closeClient = async (client: { disconnect(): Promise<unknown> }): Promise<void> => {
    try {
        await client.disconnect();
    } catch {
        // Client may never have opened a socket.
    }
};

export const createSessionStore = async (): Promise<SessionStore> => {
    if (process.env.SESSION_STORE === "memory") {
        console.log("Using in-memory session store");
        return new MemoryStore();
    }

    const { client, markReady } = createRedisClient();
    client.on("error", (error: Error) => {
        console.error("Redis error", error);
    });

    try {
        await Promise.race([
            client.connect(),
            new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Redis connect timed out"));
                }, INITIAL_CONNECT_TIMEOUT_MS);
            }),
        ]);
        markReady();
        console.log(`Connected to Redis at ${describeRedisTarget()}`);
        return client;
    } catch (error) {
        console.error(
            "Redis unavailable, falling back to in-memory sessions",
            error
        );
        await closeClient(client);
        return new MemoryStore();
    }
};
