import ShortUniqueIdImport from "short-unique-id";
import { getRandomCategories } from "./CategoryGenerator.js";
var State;
(function (State) {
    State[State["IDLE"] = 0] = "IDLE";
    State[State["LOBBY"] = 1] = "LOBBY";
    State[State["ROUND_START"] = 2] = "ROUND_START";
    State[State["PLAYING"] = 3] = "PLAYING";
    State[State["PAUSE"] = 4] = "PAUSE";
    State[State["ROUND_END"] = 5] = "ROUND_END";
})(State || (State = {}));
const ShortUniqueId =
    // deno-lint-ignore no-explicit-any
    ShortUniqueIdImport;
export default class Session {
    _idGenerator;
    _gameState;
    get gameState() {
        return this._gameState;
    }
    set gameState(value) {
        this._gameState = value;
    }
    constructor(code) {
        this._idGenerator = new ShortUniqueId({ length: 5 });
        this._gameState = this.initializeGameState(code);
    }
    findPlayer = (playerId) => {
        return (this._gameState.session.players.find((player) => player.id === playerId) || null);
    };
    addPlayer = (username) => {
        let player = this._gameState.session.players.find((player) => player.username === username) || null;
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
    };
    getPlayer = (playerId) => {
        const player = this._gameState.session.players.find((player) => player.id === playerId) || null;
        if (!player) {
            return null;
        }
        return player;
    };
    getGameInfoByPlayerId = (playerId) => {
        const player = this._gameState.session.players.find((player) => player.id === playerId) || null;
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
    };
    removePlayer = (playerId) => {
        this._gameState.session.players =
            this._gameState.session.players.filter((player) => player.id !== playerId);
    };
    submitAnswers = (playerId, answers) => {
        this._gameState.round.playerAnswers[playerId] = answers;
    };
    incrementPlayerScore = (playerId) => {
        const player = this._gameState.session.players.find((player) => player.id === playerId);
        if (!player) {
            return;
        }
        player.score += 1;
    };
    getId = () => {
        return this._gameState.session.id;
    };
    getCode = () => {
        return this._gameState.session.code;
    };
    initializeGameState = (code) => {
        const id = this._idGenerator.rnd();
        return {
            state: State.IDLE,
            session: {
                id: id,
                code: code || id,
                host: {
                    id: this._idGenerator.rnd(),
                },
                players: [],
            },
            round: {
                number: 0,
                timeRemaining: 0,
                letter: "",
                categories: [],
                playerAnswers: {},
            },
        };
    };
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
    };
    getCurrentRound = () => {
        return {
            number: this._gameState.round.number,
            letter: this._gameState.round.letter,
            categories: this._gameState.round.categories,
        };
    };
    getRandomLetter = () => {
        const num = Math.floor(Math.random() * 26);
        const letter = String.fromCharCode(65 + num);
        return letter;
    };
}
