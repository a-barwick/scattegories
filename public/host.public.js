const url = window.location.href;
const sessionId = url.split("/").pop().split("?")[0];

let socket;
let state = {};

// DOM methods

const setSessionInfo = () => {
    document.getElementById("sessionInfo").innerText = state.sessionId;
};

const setLetter = () => {
    document.getElementById("letter").innerText = state.letter;
};

const setRound = () => {
    document.getElementById("round").innerText = state.round;
};

const hydrateDom = () => {
    setSessionInfo();
    setLetter();
    setRound();
    refreshPlayerCards();
}

const attachNewRoundListener = () => {
    const newRoundButton = document.getElementById("new-round");
    newRoundButton.addEventListener("click", () => {
        fetch("/host/round/" + state.sessionId, {
            method: "POST",
        }).then((res) => {
            return res.json();
        }).then((data) => {
            state = data;
            hydrateDom();
            socket.emit("create round", sessionId);
        }).catch((err) => {
            console.error(err);
        });
    });
};

const attachStartRoundListener = () => {
    const startRoundButton = document.getElementById("start-round");
    startRoundButton.addEventListener("click", () => {
        socket.emit("start round", sessionId);
    });
};

const attachEventListeners = () => {
    attachNewRoundListener();
    attachStartRoundListener();
};

const refreshPlayerCards = () => {
    const cardsCmp = document.getElementById("cards");
    cardsCmp.innerHTML = "";
    state.players.forEach((player) => {
        cardsCmp.appendChild(createCard(player));
    });
}

const createCard = (player) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";

    const headerDiv = document.createElement("div");
    headerDiv.className = "card-header";

    const usernameHeading = document.createElement("h2");
    usernameHeading.textContent = player.username;
    usernameHeading.className = "card-name";

    const scoreDiv = document.createElement("div");
    scoreDiv.className = "score";
    scoreDiv.textContent = "Score: ";

    const scoreSpan = document.createElement("span");
    scoreSpan.id = "score";
    scoreSpan.textContent = player.score;

    scoreDiv.appendChild(scoreSpan);
    headerDiv.appendChild(usernameHeading);
    headerDiv.appendChild(scoreDiv);

    const answerDiv = document.createElement("div");
    answerDiv.className = "answer";

    for (const [key, value] of Object.entries(player.answers)) {
        const answerOutputDiv = document.createElement("div");
        answerOutputDiv.className = "answer-output";

        const answerLabel = document.createElement("label");
        answerLabel.textContent = key + ") " + value;
        answerLabel.className = "blur-text";

        answerOutputDiv.appendChild(answerLabel);
        answerDiv.appendChild(answerOutputDiv);
    }

    cardDiv.appendChild(headerDiv);
    cardDiv.appendChild(answerDiv);
    return cardDiv;
}

// Socket methods 

const initSocket = () => {
    socket = io("http://192.168.0.222:3000/", {
        query: { sessionId: sessionId },
    });
};

const attachSocketListeners = () => {
    socket.on("add player", (player) => {
        state.players.push(player);
        refreshPlayerCards();
    });

    socket.on("player submit", (gameState) => {
        state.players = gameState.players;
        refreshPlayerCards();
    });

    socket.on("time down", (time) => {
        document.getElementById("time").innerText = time;
    });

    socket.on("round over", () => {
        document.getElementById("time").innerText = "Time's Up!";
        const answers = document.querySelectorAll(".blur-text");
        answers.forEach((answer) => {
            answer.classList.remove("blur-text");
        });
    });

    socket.on("error", (msg) => {
        document.getElementById("error").innerText = msg;
    });
};

// Make initial fetch request on page load
addEventListener("load", (e) => {
    fetch("/host/info/" + sessionId)
        .then((res) => res.json())
        .then((data) => {
            state = data;
            hydrateDom();
            attachEventListeners();
            initSocket();
            attachSocketListeners();
        });
});
