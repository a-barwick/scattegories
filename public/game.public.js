// Parse URL path
const url = window.location.href;
const sessionId = url.split("/").pop().split("?")[0];
const playerId = new URLSearchParams(url.split("?")[1]).get("playerId");

const state = {
    sessionId: sessionId,
    playerId: playerId,
    username: "",
    letter: "",
    score: 0,
    round: 0,
    answers: {},
};

let socket;

const initSocket = () => {
    socket = io("http://192.168.0.222:3000/", {
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
        setRoundValue(roundInfo.round);
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

const setSessionIdValue = (sessionId) => {
    document.getElementById("sessionInfo").innerText = sessionId;
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
};

const attachSubmitButtonListener = () => {
    document.getElementById("submit").addEventListener("click", (e) => {
        e.preventDefault();
        const categoryInputs = Array.from(
            document.querySelectorAll(".category-input")
        );
        const answers = {};
        categoryInputs.forEach((input, index) => {
            answers[input.id] = input.value;
        });
        state.answers = answers;
        emitSubmitEvent();
    });
};

const setState = (data) => {
    state.username = data.username;
    state.letter = data.letter;
    state.score = data.score;
    state.round = data.round;
    state.answers = data.answers;
    state.categories = data.categories;
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
    setSessionIdValue(state.sessionId);
    setUsernameValue(state.username);
    setRoundValue(state.round);
    setLetterValue(state.letter);
    attachSubmitButtonListener();
};

// Make initial fetch request on page load
addEventListener("load", (e) => {
    fetch("/game/info/" + state.sessionId + "?playerId=" + state.playerId)
        .then((res) => res.json())
        .then((data) => {
            setState(data);
            hydrateDom();
            refreshCategoryList();
            initSocket();
            attachSocketListeners(socket);
            emitJoinEvent();
        });
});
