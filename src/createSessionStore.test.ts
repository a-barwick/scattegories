import { describe, it } from "node:test";
import assert from "node:assert/strict";
import MemoryStore from "./MemoryStore";
import { createSessionStore } from "./createSessionStore";

describe("createSessionStore", () => {
    it("uses memory when SESSION_STORE=memory", async () => {
        const previous = process.env.SESSION_STORE;
        process.env.SESSION_STORE = "memory";
        try {
            const store = await createSessionStore();
            assert.ok(store instanceof MemoryStore);
        } finally {
            if (previous === undefined) {
                delete process.env.SESSION_STORE;
            } else {
                process.env.SESSION_STORE = previous;
            }
        }
    });

    it("falls back to memory when Redis is unreachable", async () => {
        const previous = {
            SESSION_STORE: process.env.SESSION_STORE,
            REDIS_HOST: process.env.REDIS_HOST,
            REDIS_PORT: process.env.REDIS_PORT,
            REDIS_URL: process.env.REDIS_URL,
        };
        delete process.env.SESSION_STORE;
        delete process.env.REDIS_URL;
        process.env.REDIS_HOST = "127.0.0.1";
        process.env.REDIS_PORT = "1";
        try {
            const store = await Promise.race([
                createSessionStore(),
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error("store create hung")), 4000);
                }),
            ]);
            assert.ok(store instanceof MemoryStore);
        } finally {
            for (const [key, value] of Object.entries(previous)) {
                if (value === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = value;
                }
            }
        }
    });
});
