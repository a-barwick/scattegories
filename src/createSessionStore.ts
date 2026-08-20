import { createClient, type RedisClientType } from "redis";
import MemoryStore from "./MemoryStore";
import { type SessionStore } from "./types";

const DEFAULT_REDIS_HOST = "127.0.0.1";
const DEFAULT_REDIS_PORT = 6379;

const createRedisClient = (): RedisClientType => {
    const url = process.env.REDIS_URL;
    if (url) {
        return createClient({ url });
    }

    return createClient({
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
            host: process.env.REDIS_HOST || DEFAULT_REDIS_HOST,
            port: Number(process.env.REDIS_PORT) || DEFAULT_REDIS_PORT,
            reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
        },
    });
};

const describeRedisTarget = (): string => {
    if (process.env.REDIS_URL) {
        return "REDIS_URL";
    }
    const host = process.env.REDIS_HOST || DEFAULT_REDIS_HOST;
    const port = process.env.REDIS_PORT || String(DEFAULT_REDIS_PORT);
    return `${host}:${port}`;
};

export const createSessionStore = async (): Promise<SessionStore> => {
    const client = createRedisClient();
    client.on("error", (error: Error) => {
        console.error("Redis error", error);
    });

    try {
        await client.connect();
        console.log(`Connected to Redis at ${describeRedisTarget()}`);
        return client;
    } catch (error) {
        console.error(
            "Redis unavailable, falling back to in-memory sessions",
            error
        );
        try {
            await client.disconnect();
        } catch {
            // Client may never have opened a socket.
        }
        return new MemoryStore();
    }
};
