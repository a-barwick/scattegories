import GameSession from "./GameSession.js";

export default class GameSessionManager {
    idGenerator;
    sessions = {};

    constructor(idGenerator) {
        this.idGenerator = idGenerator;
    }

    createSession = () => {
        const sessionId = this.idGenerator.rnd();
        const session = new GameSession(sessionId, this.idGenerator);
        this.sessions[sessionId] = session;
        return session;
    }

    getSession = (sessionId) => {
        return this.sessions[sessionId];
    }

    endSession = (sessionId) => {
        this.sessions.delete(sessionId);
    }
}
