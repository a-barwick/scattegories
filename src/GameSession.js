export default class GameSession {
    id;
    idGenerator;
    categoryHelper;
    gameState;
    gameState = {};

    constructor(id, idGenerator, categoryHelper) {
        this.id = id;
        this.idGenerator = idGenerator;
        this.categoryHelper = categoryHelper;
        this.gameState = this.initializeGameState();
    }

    addPlayer = (username) => {
        let player = this.gameState.players.find(player => player.username === username);
        if (player) {
            return player;
        }
        player = {
            id: this.idGenerator.rnd(),
            username: username,
            score: 0,
            answers: {}
        };
        this.gameState.players.push(player);
        return player;
    }

    getPlayer = (playerId) => {
        return this.gameState.players.find(player => player.id === playerId);
    }

    removePlayer = (playerId) => {
        this.gameState.players = this.gameState.players.filter(player => player.id !== playerId);
    }

    submitAnswers = (playerId, answers) => {
        const player = this.gameState.players.find(player => player.id === playerId);
        player.answers = answers;
    }

    getGameState = () => {
        return this.gameState;
    }

    initializeGameState = () => {
        return {
            sessionId: this.id,
            letter: "",
            round: 0,
            categories: [],
            players: []
        };
    }

    createRound = () => {
        this.gameState.round += 1;
        let letter = this.getRandomLetter();
        while (letter === this.gameState.letter) {
            letter = this.getRandomLetter();
        }
        this.gameState.letter = letter;
        this.gameState.categories = this.categoryHelper.getRandomCategories(10);
        this.gameState.players.forEach(player => {
            player.answers = {};
        });
    }

    getCurrentRound = () => {
        return {
            round: this.gameState.round,
            letter: this.gameState.letter,
            categories: this.gameState.categories
        };
    }

    getRandomLetter = () => {
        const num = Math.floor(Math.random() * 26);
        const letter = String.fromCharCode(65 + num);
        return letter;
    }
}