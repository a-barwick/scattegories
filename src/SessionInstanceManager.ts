import Session from "./Session";

export default class SessionInstanceManager {
    private _sessions: Map<string, Session>;
    private _sessionsByCode: Map<string, Session>;

    constructor() {
        this._sessions = new Map();
        this._sessionsByCode = new Map();
    }

    createSession = (code: string | undefined): Session => {
        const session = new Session(code);
        this._sessions.set(session.getId(), session);
        this._sessionsByCode.set(session.getCode(), session);
        return session;
    };

    getSession = (sessionId: string): Session | undefined => {
        return this._sessions.get(sessionId) as Session;
    };

    getSessionByCode = (sessionCode: string): Session | undefined => {
        return this._sessionsByCode.get(sessionCode);
    };

    cleanupSession = (sessionId: string, connectedSockets: number): void => {
        if (connectedSockets === 0) {
            const session = this._sessions.get(sessionId);
            if (!session) {
                return;
            }
            this._sessionsByCode.delete(session.getCode());
            this._sessions.delete(sessionId);
        }
    };

    validateSessionCode = (sessionCode: string): boolean => {
        return !this._sessionsByCode.has(sessionCode);
    };
}
