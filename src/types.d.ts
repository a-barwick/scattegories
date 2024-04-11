// Objects

type Player = {
    id: string;
    username: string;
    score: number;
};

type PlayerAnswer = {
    [key: string]: string[];
};

type Host = {
    id: string;
};

type Round = {
    number: number;
    timeRemaining: number;
    letter: string;
    categories: string[];
    playerAnswers: PlayerAnswer;
};

type Session = {
    id: string;
    code: string;
    host: Host;
    players: Player[];
};

type GameState = {
    state: State;
    session: Session;
    round: Round;
};

// State Machine

// API Responses

type GameInfoResponse = {
    sessionId: string;
    sessionCode: string;
    playerId: string;
    username: string;
    score: number;
    round: number;
    letter: string;
    categories: string[];
};

type RoundInfoResponse = {
    number: number;
    letter: string;
    categories: string[];
};

export type {
    Player,
    PlayerAnswer,
    Host,
    Round,
    GameState,
    StateTransition,
    GameInfoResponse,
    RoundInfoResponse,
};
