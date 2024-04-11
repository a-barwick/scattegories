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

  // socket.emit("join", {
  //     sessionId: sessionId,
  //     username: username
  // });
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
    username: state.username,
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
};

const hydrateDom = () => {
  setSessionIdValue(state.sessionId);
  setUsernameValue(state.username);
  setRoundValue(state.round);
  setLetterValue(state.letter);
  attachSubmitButtonListener();
};

// Make initial fetch request on page load
addEventListener("load", (e) => {
  fetch("/game/info/" + sessionId + "?playerId=" + state.playerId)
    .then((res) => res.json())
    .then((data) => {
      setState(data);
      hydrateDom();
      initSocket();
      attachSocketListeners(socket);
      emitJoinEvent();
    });
});
