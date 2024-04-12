import ShortUniqueId from "short-unique-id";

import Session from "./Session.ts";
import { StateMachine } from "./StateMachine.ts";

export default class SessionInstanceManager {
    private _sessions: Map<string, Session>;

    constructor() {
        this._sessions = new Map();
    }

    createSession = (): Session => {
        const sessionId = new ShortUniqueId({ length: 5 }).rnd();
        const stateMachine = new StateMachine();
        const session = new Session(sessionId, stateMachine);
        this._sessions.set(sessionId, session);
        return session;
    }

    getSession = (sessionId: string): Session => {
        return this._sessions.get(sessionId) as Session;
    }

    endSession = (sessionId: string) => {
        this._sessions.delete(sessionId);
    }
}
