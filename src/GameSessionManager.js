import GameSession from "./GameSession.js";

export default class GameSessionManager {
    idGenerator;
    categoryHelper;
    sessions = {};

    constructor(idGenerator, categoryHelper) {
        this.idGenerator = idGenerator;
        this.categoryHelper = categoryHelper;
    }

    createSession = () => {
        const sessionId = this.idGenerator.rnd();
        const session = new GameSession(sessionId, this.idGenerator, this.categoryHelper);
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
