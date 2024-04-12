import express from "express";
import bodyParser from "body-parser";
import path from "node:path";
import url from "node:url";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { Server } from "socket.io";
import cors from "cors";

import SessionInstanceManager from "./SessionInstanceManager.ts";

const port = 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://www.bytethebug.com'],
        methods: ['GET', 'POST'],
    }
});
const sessionManager = new SessionInstanceManager();

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
});

app.get("/game/:sessionId", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "player.html"));
});

app.get("/host/:sessionId", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "host.html"));
});

app.get("/game/info/:sessionId", (req, res) => {
    const { sessionId } = req.params as { sessionId: string };
    const { playerId } = req.query as { playerId: string };
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        res.status(404).send("Session not found");
        return;
    }
    const playerResponse = session.getPlayer(playerId);
    res.json(playerResponse);
});

app.get("/host/info/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        res.status(404).send("Session not found");
        return;
    }
    res.json(session.gameState);
});

app.post("/host", (req, res) => {
    const session = sessionManager.createSession();
    res.redirect(url.format({
        pathname: "/host/" + session.gameState.session.id
    }));
});

app.post("/host/round/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        console.error("Session not found during start round");
        return;
    }
    session.createRound();
    res.json(session.gameState);
});

app.post("/join", (req, res) => {
    const { sessionId, username } = req.body;
    const session = sessionManager.getSession(sessionId);
    if (!session) {
        res.status(404).send("Session not found");
        return;
    }
    const player = session.addPlayer(username);
    res.redirect(url.format({
        pathname: "/game/" + sessionId,
        query: {
            playerId: player.id
        }
    }));
});

io.on("connection", (socket) => {
    const { sessionId, hostId } = socket.handshake.query;
    socket.join(sessionId as string);

    socket.on("join", (payload) => {
        const { sessionId, playerId } = payload;
        const session = sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during join");
            return;
        }
        const player = session.getPlayer(playerId);
        socket.to(sessionId).emit("add player", player);
    });

    socket.on("create round", (sessionId) => {
        const session = sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during start round");
            return;
        }
        const round = session.getCurrentRound();
        io.to(sessionId).emit("create round", round);
    });

    socket.on("start round", (sessionId) => {
        const session = sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during start round");
            return;
        }
        io.to(sessionId).emit("start round");
        let timer = 60;
        const interval = setInterval(() => {
            io.to(sessionId).emit("time down", timer);
            timer -= 1;
            if (timer < 0) {
                clearInterval(interval);
                io.to(sessionId).emit("round over");
            }
        }, 1000);
    });

    socket.on("player submit", (payload) => {
        const { sessionId, playerId, answers } = payload;
        const session = sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during player submit");
            return;
        }
        session.submitAnswers(playerId, answers);
        io.to(sessionId).emit("player submit", session.gameState);
    });
});

server.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Other devices can access it at http://192.168.0.222:${port}`);
});