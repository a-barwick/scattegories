import { type SessionStore } from "./types";

export default class MemoryStore implements SessionStore {
    private readonly data = new Map<string, string>();

    GET = async (key: string): Promise<string | null> => {
        return this.data.get(key) ?? null;
    };

    SET = async (key: string, value: string): Promise<string> => {
        this.data.set(key, value);
        return "OK";
    };

    DEL = async (key: string): Promise<number> => {
        return this.data.delete(key) ? 1 : 0;
    };

    EXISTS = async (key: string): Promise<number> => {
        return this.data.has(key) ? 1 : 0;
    };
}
