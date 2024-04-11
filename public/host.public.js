const url = window.location.href;
const sessionId = url.split("/").pop().split("?")[0];

let socket;
let state = {};

// DOM methods

const setSessionInfo = () => {
    document.getElementById("sessionInfo").innerText = state.session.code;
};

const setLetter = () => {
    document.getElementById("letter").innerText = state.round.letter;
};

const setRound = () => {
    document.getElementById("round").innerText = state.round.number;
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
        fetch("/host/round/" + state.session.id, {
            method: "POST",
        }).then((res) => {
            return res.json();
        }).then((data) => {
            state = data;
            hydrateDom();
            refreshCategoryCard();
            socket.emit("create round", sessionId);
        }).catch((err) => {
            console.error(err);
        });
    });
};

const attachStartRoundListener = () => {
    const startRoundButton = document.getElementById("start-round");
    startRoundButton.addEventListener("click", () => {
        unhideCategories();
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
    state.session.players.forEach((player) => {
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

    const scoreLabel = document.createElement("label");
    scoreLabel.textContent = "Score: ";
    scoreDiv.appendChild(scoreLabel);

    const scoreSpan = document.createElement("span");
    scoreSpan.id = "score";
    scoreSpan.textContent = player.score;

    const upvoteButton = document.createElement("button");
    upvoteButton.textContent = "👍";
    upvoteButton.className = "upvote";
    upvoteButton.addEventListener("click", () => {
        state.session.players.find((p) => p.id === player.id).score++;
        scoreSpan.textContent = player.score;
        socket.emit("upvote", { sessionId: state.session.id, playerId: player.id });
    });

    const downvoteButton = document.createElement("button");
    downvoteButton.textContent = "👎";
    downvoteButton.className = "upvote";
    downvoteButton.addEventListener("click", () => {
        state.session.players.find((p) => p.id === player.id).score--;
        scoreSpan.textContent = player.score;
        socket.emit("downvote", { sessionId: state.session.id, playerId: player.id });
    });

    scoreLabel.appendChild(scoreSpan);
    scoreDiv.appendChild(upvoteButton);
    scoreDiv.appendChild(downvoteButton);
    headerDiv.appendChild(usernameHeading);
    headerDiv.appendChild(scoreDiv);

    const answerDiv = document.createElement("div");
    answerDiv.className = "answer";

    const answers = state.round.playerAnswers[player.id] || {};
    for (const [key, value] of Object.entries(answers)) {
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

const refreshCategoryCard = () => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.id = "category-card";

    const usernameHeading = document.createElement("h2");
    usernameHeading.textContent = "Categories";
    usernameHeading.className = "card-name";

    const headerDiv = document.createElement("div");
    headerDiv.className = "card-header";
    headerDiv.appendChild(usernameHeading);

    const categoryDiv = document.createElement("div");
    categoryDiv.className = "answer";

    for (let i = 0; i < state.round.categories.length; i++) {
        console.log(i, state.round.categories[i]);
        const categoryOutputDiv = document.createElement("div");
        categoryOutputDiv.className = "answer-output";

        const categoryLabel = document.createElement("label");
        categoryLabel.textContent = `${i + 1}` + ") " + state.round.categories[i];
        categoryLabel.className = "category blur-text";

        categoryOutputDiv.appendChild(categoryLabel);
        categoryDiv.appendChild(categoryOutputDiv);
    }

    cardDiv.appendChild(headerDiv);
    cardDiv.appendChild(categoryDiv);

    const categoryCmp = document.getElementById("categories");
    categoryCmp.innerHTML = "";
    categoryCmp.appendChild(cardDiv);
}

const unhideCategories = () => {
    const answers = document.querySelectorAll(".category");
    answers.forEach((answer) => {
        answer.classList.remove("blur-text");
    });
}

// Socket methods 

const initSocket = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    const socketUrl = `${protocol}//${hostname}:${port}`;

    socket = io(socketUrl, {
        query: {
            sessionId: state.session.id,
            hostId: state.session.host.id,
        },
    });
};

const attachSocketListeners = () => {
    socket.on("add player", (player) => {
        state.session.players.push(player);
        refreshPlayerCards();
    });

    socket.on("player submit", (gameState) => {
        state.round.playerAnswers = gameState.round.playerAnswers;
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

    socket.on("session ended", () => {
        console.log("Ended session");
        document.getElementById("title").innerText = "Session Ended!";
        document.getElementById("time").innerText = "Session Ended!";
        document.getElementById("start-round").disabled = true;
        document.getElementById("new-round").disabled = true;
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
            console.log(data);
            state = data;
            hydrateDom();
            attachEventListeners();
            initSocket();
            attachSocketListeners();
        });
});
