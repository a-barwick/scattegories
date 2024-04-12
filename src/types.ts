// Objects

type Player = {
    id: string;
    username: string;
    score: number;
}

type PlayerAnswer = {
    [key: string]: string[];
}

type Host = {
    id: string;
}

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
}

type GameState = {
    state: State;
    session: Session;
    round: Round;
}

// State Machine

enum State {
    IDLE,
    LOBBY,
    ROUND_START,
    PLAYING,
    PAUSE,
    ROUND_END,
}

enum Action {
    START,
    JOIN_LOBBY,
    CREATE_ROUND,
    START_ROUND,
    PAUSE_ROUND,
    END_ROUND,
}

type StateTransition = {
    [key in State]: {
        [key in Action]?: State;
    };
};

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

export {
    Player,
    PlayerAnswer,
    Host,
    Round,
    GameState,
    State,
    Action,
    StateTransition,
    GameInfoResponse,
    RoundInfoResponse,
};
