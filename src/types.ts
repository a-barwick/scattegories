export type Player = {
    id: string;
    username: string;
    score: number;
};

export type PlayerAnswer = {
    [playerId: string]: Record<string, string>;
};

export type Host = {
    id: string;
};

export type Round = {
    number: number;
    timeRemaining: number;
    letter: string;
    categories: string[];
    playerAnswers: PlayerAnswer;
};

export type Session = {
    id: string;
    code: string;
    host: Host;
    players: Player[];
};

export enum State {
    IDLE,
    LOBBY,
    ROUND_START,
    PLAYING,
    PAUSE,
    ROUND_END,
}

export type GameState = {
    state: State;
    session: Session;
    round: Round;
};

export type GameInfoResponse = {
    sessionId: string;
    sessionCode: string;
    playerId: string;
    username: string;
    score: number;
    round: number;
    letter: string;
    categories: string[];
};

export type RoundInfoResponse = {
    number: number;
    letter: string;
    categories: string[];
};

export type SessionStore = {
    GET(key: string): Promise<string | null>;
    SET(key: string, value: string): Promise<unknown>;
    DEL(key: string): Promise<unknown>;
    EXISTS(key: string): Promise<number>;
};
