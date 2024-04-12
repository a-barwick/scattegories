import ShortUniqueId from "short-unique-id";

import { StateMachine } from "./StateMachine.ts";
import { GameState, Player, State, Action, RoundInfoResponse, GameInfoResponse } from "./types.ts";
import { getRandomCategories } from "./CategoryGenerator.ts";

export default class Session {
    private _idGenerator: ShortUniqueId;
    private _stateMachine: StateMachine;
    private _gameState: GameState;

    public get gameState(): GameState {
        return this._gameState;
    }

    public set gameState(value: GameState) {
        this._gameState = value;
    }

    constructor(code: string | undefined) {
        this._idGenerator = new ShortUniqueId({ length: 5 });
        this._stateMachine = new StateMachine();
        this._gameState = this.initializeGameState(code);
    }

    performAction = (action: Action) => {
        switch (action) {
            case Action.START:
                this._stateMachine.transition(Action.START);
                break;
            case Action.JOIN_LOBBY:
                this._stateMachine.transition(Action.JOIN_LOBBY);
                break;
            case Action.CREATE_ROUND:
                this.createRound();
                this._stateMachine.transition(Action.CREATE_ROUND);
                break;
            case Action.START_ROUND:
                this._stateMachine.transition(Action.START_ROUND);
                this.createRound();
                break;
            case Action.PAUSE_ROUND:
                this._stateMachine.transition(Action.PAUSE_ROUND);
                break;
            case Action.END_ROUND:
                this._stateMachine.transition(Action.END_ROUND);
                break;
        }
    }

    findPlayer = (playerId: string): Player => {
        return this._gameState.session.players.find(player => player.id === playerId) as Player || null;
    }

    addPlayer = (username: string): Player => {
        let player = this._gameState.session.players.find(player => player.username === username) as Player || null;
        if (player) {
            return player;
        }
        player = {
            id: this._idGenerator.rnd(),
            username: username,
            score: 0,
        };
        this._gameState.session.players.push(player);
        return player;
    }

    getPlayer = (playerId: string): Player | null => {
        const player = this._gameState.session.players.find(player => player.id === playerId) as Player || null;
        if (!player) {
            return null;
        }
        return player;
    }

    getGameInfoByPlayerId = (playerId: string): GameInfoResponse | null => {
        const player = this._gameState.session.players.find(player => player.id === playerId) as Player || null;
        if (!player) {
            return null;
        }
        return {
            sessionId: this._gameState.session.id,
            sessionCode: this._gameState.session.code,
            playerId: player.id,
            username: player.username,
            score: player.score,
            round: this._gameState.round.number,
            letter: this._gameState.round.letter,
            categories: this._gameState.round.categories,
        };
    }

    removePlayer = (playerId: string) => {
        this._gameState.session.players = this._gameState.session.players.filter(player => player.id !== playerId) as Player[];
    }

    submitAnswers = (playerId: string, answers: string[]) => {
        this._gameState.round.playerAnswers[playerId] = answers as string[];
    }

    getId = (): string => {
        return this._gameState.session.id;
    }

    getCode = (): string => {
        return this._gameState.session.code;
    }

    initializeGameState = (code: string | undefined): GameState => {
        const id = this._idGenerator.rnd();
        return {
            state: State.IDLE,
            session: {
                id: id,
                code: code || id,
                host: {
                    id: this._idGenerator.rnd()
                },
                players: []
            },
            round: {
                number: 0,
                timeRemaining: 0,
                letter: "",
                categories: [],
                playerAnswers: {}
            }
        }
    }

    createRound = () => {
        this._gameState.round.number += 1;
        let letter = this.getRandomLetter();
        while (letter === this._gameState.round.letter) {
            letter = this.getRandomLetter();
        }
        this._gameState.round.letter = letter;
        this._gameState.round.categories = getRandomCategories(10);
        this._gameState.round.timeRemaining = 60;
        this._gameState.round.playerAnswers = {};
    }

    getCurrentRound = (): RoundInfoResponse => {
        return {
            number: this._gameState.round.number,
            letter: this._gameState.round.letter,
            categories: this._gameState.round.categories,
        };
    }

    getRandomLetter = (): string => {
        const num = Math.floor(Math.random() * 26);
        const letter = String.fromCharCode(65 + num);
        return letter;
    }
}