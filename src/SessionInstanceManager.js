import Session from "./Session.js";
export default class SessionInstanceManager {
    _sessions;
    _sessionsByCode;
    constructor() {
        this._sessions = new Map();
        this._sessionsByCode = new Map();
    }
    createSession = (code) => {
        const session = new Session(code);
        this._sessions.set(session.getId(), session);
        this._sessionsByCode.set(session.getCode(), session);
        return session;
    };
    getSession = (sessionId) => {
        return this._sessions.get(sessionId);
    };
    getSessionByCode = (sessionCode) => {
        return this._sessionsByCode.get(sessionCode);
    };
    endSession = (sessionId) => {
        this._sessions.delete(sessionId);
    };
    cleanupSession = (sessionId) => {
        if (this.getSession(sessionId)?.gameState.session.players.length === 0) {
            console.log("Cleaning up session", sessionId);
            this.endSession(sessionId);
            return true;
        }
        return false;
    };
    validateSessionCode = (sessionCode) => {
        return !this._sessionsByCode.has(sessionCode);
    };
}
