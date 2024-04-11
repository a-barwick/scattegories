/*

game state:
- sessionId
- letter
- round
- categories: [category]
- players: [playerState]

player state:
- id
- name
- score
- answers: [answer]

*/

export default class GameSession {
    id;
    idGenerator;
    gameState;
    gameState = {};
    players = [];

    constructor(id, idGenerator) {
        this.id = id;
        this.idGenerator = idGenerator;
        this.gameState = this.initializeGameState();
    }

    addPlayer = (username) => {
        let player = this.players.find(player => player.username === username);
        if (player) {
            return player;
        }
        player = {
            id: this.idGenerator.rnd(),
            username: username,
            score: 0,
            answers: {}
        };
        this.players.push(player);
        return player;
    }

    getPlayer = (playerId) => {
        return this.players.find(player => player.id === playerId);
    }

    removePlayer = (playerId) => {
        this.players = this.players.filter(player => player.id !== playerId);
    }

    submitAnswers = (username, answers) => {
        const player = this.players.find(player => player.username === username);
        player.answers = answers;
    }

    getGameState = () => {
        return this.gameState;
    }

    initializeGameState = () => {
        return {
            sessionId: this.id,
            letter: this.getRandomLetter(),
            round: 1,
            categories: [],
            players: this.players
        };
    }

    getRandomLetter = () => {
        const num = Math.floor(Math.random() * 26);
        const letter = String.fromCharCode(65 + num);
        return letter;
    }
}