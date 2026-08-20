import Session from "./Session";
import { type SessionStore } from "./types";

const sessionKey = (sessionId: string): string => `session:${sessionId}`;
const codeKey = (sessionCode: string): string => `code:${sessionCode}`;

export default class SessionManager {
    private _store: SessionStore;

    constructor(store: SessionStore) {
        this._store = store;
    }

    createSession = async (code: string | undefined): Promise<Session> => {
        const session = Session.fromCode(code);
        await this.persistSession(session);
        return session;
    };

    getSession = async (sessionId: string): Promise<Session | undefined> => {
        if (!sessionId) {
            return undefined;
        }
        const result = await this._store.GET(sessionKey(sessionId));
        if (result) {
            return Session.fromGameState(JSON.parse(result));
        }
        return undefined;
    };

    getSessionByCode = async (
        sessionCode: string
    ): Promise<Session | undefined> => {
        if (!sessionCode) {
            return undefined;
        }
        const sessionId = await this._store.GET(codeKey(sessionCode));
        if (!sessionId) {
            return undefined;
        }
        return this.getSession(sessionId);
    };

    saveSession = async (session: Session): Promise<void> => {
        await this.persistSession(session);
    };

    cleanupSession = async (
        sessionId: string,
        connectedSockets: number
    ): Promise<void> => {
        if (connectedSockets !== 0) {
            return;
        }
        const session = await this.getSession(sessionId);
        if (!session) {
            return;
        }
        await this._store.DEL(codeKey(session.getCode()));
        await this._store.DEL(sessionKey(sessionId));
    };

    validateSessionCode = async (sessionCode: string): Promise<boolean> => {
        if (!sessionCode) {
            return true;
        }
        const existing = await this._store.EXISTS(codeKey(sessionCode));
        return existing === 0;
    };

    private persistSession = async (session: Session): Promise<void> => {
        const payload = JSON.stringify(session.getGameState());
        await this._store.SET(sessionKey(session.getId()), payload);
        await this._store.SET(codeKey(session.getCode()), session.getId());
    };
}
