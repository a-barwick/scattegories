import Session from "./Session";
import { Redis } from "./types";

export default class SessionManager {
    private _redis: Redis;

    constructor(redis: Redis) {
        this._redis = redis;
    }

    createSession = async (code: string | undefined): Promise<Session> => {
        const session = Session.fromCode(code);
        const payload = JSON.stringify(session.getGameState());
        await this._redis.SET(session.getId(), payload);
        await this._redis.SET(session.getCode(), payload);
        return session;
    };

    getSession = async (sessionId: string): Promise<Session | undefined> => {
        const result = await this._redis.GET(sessionId);
        if (result) {
            const session = Session.fromGameState(JSON.parse(result));
            return session;
        }
        return undefined;
    };

    getSessionByCode = async (
        sessionCode: string
    ): Promise<Session | undefined> => {
        const result = await this._redis.GET(sessionCode);
        if (result) {
            const session = Session.fromGameState(JSON.parse(result));
            return session;
        }
        return undefined;
    };

    saveSession = async (session: Session): Promise<void> => {
        const payload = JSON.stringify(session.getGameState());
        await this._redis.SET(session.getId(), payload);
    };

    cleanupSession = async (
        sessionId: string,
        connectedSockets: number
    ): Promise<void> => {
        if (connectedSockets === 0) {
            const session = await this.getSession(sessionId);
            if (!session) {
                return;
            }
            await this._redis.DEL(session.getCode());
            await this._redis.DEL(sessionId);
        }
    };

    validateSessionCode = async (sessionCode: string): Promise<boolean> => {
        const numSessions = await this._redis.EXISTS(sessionCode);
        return numSessions === 0;
    };
}
