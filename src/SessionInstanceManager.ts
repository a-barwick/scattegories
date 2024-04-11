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

    endSession = (sessionId: string) => {
        this._sessions.delete(sessionId);
    };

    cleanupSession = (sessionId: string): boolean => {
        if (
            this.getSession(sessionId)?.gameState.session.players.length === 0
        ) {
            console.log("Cleaning up session", sessionId);
            this.endSession(sessionId);
            return true;
        }
        return false;
    };

    validateSessionCode = (sessionCode: string): boolean => {
        return !this._sessionsByCode.has(sessionCode);
    };
}
