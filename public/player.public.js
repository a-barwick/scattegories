// Parse URL path
const url = window.location.href;
const sessionId = url.split("/").pop().split("?")[0];
const playerId = new URLSearchParams(url.split("?")[1]).get("playerId");

const state = {
    sessionId: sessionId,
    sessionCode: "",
    playerId: playerId,
    username: "",
    letter: "",
    score: 0,
    round: 0,
    answers: {},
};

let socket;

const initSocket = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    const socketUrl = `${protocol}//${hostname}:${port}`;

    socket = io(socketUrl, {
        query: {
            sessionId: state.sessionId,
            playerId: state.playerId,
        },
    });
};

const attachSocketListeners = (socket) => {
    socket.on("error", (msg) => {
        document.getElementById("error").innerText = msg;
    });

    socket.on("create round", (roundInfo) => {
        setRoundValue(roundInfo.number);
        setLetterValue(roundInfo.letter);
        setCategories(roundInfo.categories);
    });

    socket.on("start round", () => {
        enableInputs();
    });

    socket.on("time down", (time) => {
        document.getElementById("time").innerText = time;
    });

    socket.on("round over", () => {
        document.getElementById("time").innerText = "Time's Up!";
        disableInputs();
    });

    socket.on("upvote", ({ playerId, score }) => {
        if (playerId === state.playerId) {
            state.score = score;
            setScoreValue(score);
        }
    });
};

const emitJoinEvent = () => {
    socket.emit("join", {
        sessionId: state.sessionId,
        playerId: state.playerId,
    });
};

const emitSubmitEvent = () => {
    socket.emit("player submit", {
        sessionId: state.sessionId,
        playerId: state.playerId,
        answers: state.answers,
    });
};

const setSessionCodeValue = (sessionCode) => {
    document.getElementById("sessionInfo").innerText = sessionCode;
};

const setUsernameValue = (username) => {
    document.getElementById("username").innerText = username;
};

const setRoundValue = (round) => {
    document.getElementById("round").innerText = round;
};

const setLetterValue = (letter) => {
    document.getElementById("letter").innerText = letter;
};

const setScoreValue = (score) => {
    document.getElementById("score").innerText = score;
};

const setCategories = (categories) => {
    state.categories = categories;
    refreshCategoryList();
}

const disableInputs = () => {
    const categoryInputs = Array.from(
        document.querySelectorAll(".category-input")
    );
    categoryInputs.forEach((input) => {
        input.disabled = true;
    });
};

const enableInputs = () => {
    const categoryInputs = Array.from(
        document.querySelectorAll(".category-input")
    );
    categoryInputs.forEach((input) => {
        input.disabled = false;
    });
    const labels = Array.from(document.querySelectorAll(".blur-text"));
    labels.forEach((label) => {
        label.classList.remove("blur-text");
    });
    attachInputEventListener();
};

const attachInputEventListener = () => {
    const categoryInputs = Array.from(
        document.querySelectorAll(".category-input")
    );
    categoryInputs.forEach((input) => {
        input.addEventListener("input", (e) => {
            state.answers[input.id] = input.value;
            emitSubmitEvent();
        });
    });
};

const setState = (data) => {
    state.sessionId = data.sessionId;
    state.sessionCode = data.sessionCode;
    state.username = data.username || "";
    state.letter = data.letter || "";
    state.score = data.score || 0;
    state.round = data.round || 0;
    state.answers = data.answers || {};
    state.categories = data.categories || [];
};

const refreshCategoryList = () => {
    if (state.categories.length === 0) {
        return;
    }
    const categoryList = document.getElementById("category-list");
    categoryList.innerHTML = "";
    state.categories.forEach((category, index) => {
        index = index + 1;
        const categoryDiv = document.createElement("div");
        categoryDiv.className = "category";

        const label = document.createElement("label");
        label.for = index;
        label.textContent = category;
        label.className = "blur-text";

        const input = document.createElement("input");
        input.type = "text";
        input.id = index;
        input.name = "category" + index;
        input.className = "category-input";
        input.autocomplete = "off";
        input.disabled = true;

        categoryDiv.appendChild(label);
        categoryDiv.appendChild(input);
        categoryList.appendChild(categoryDiv);
    });
}

const hydrateDom = () => {
    setSessionCodeValue(state.sessionCode || "");
    setUsernameValue(state.username);
    setRoundValue(state.round);
    setLetterValue(state.letter);
    setScoreValue(state.score);
    setCategories(state.categories);
};

// Make initial fetch request on page load
addEventListener("load", () => {
    fetch("/game/info/" + state.sessionId + "?playerId=" + state.playerId)
        .then((res) => res.json())
        .then((data) => {
            setState(data);
            hydrateDom();
            refreshCategoryList();
            attachInputEventListener();
            initSocket();
            attachSocketListeners(socket);
            emitJoinEvent();
        });
});
