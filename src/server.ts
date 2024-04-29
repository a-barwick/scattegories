import path from "path";
import url from "url";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { createClient } from "redis";
import { Server } from "socket.io";

import SessionManager from "./SessionManager";
import Session from "./Session";

const port = Number(process.env.PORT) || 3000;
const env = process.env.NODE_ENV || "development";
const timeLimit = Number(process.env.TIME_LIMIT) || 60;

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "https://www.bytethebug.com"],
        methods: ["GET", "POST"],
    },
});
const jsonParser = bodyParser.json();

const redis = await createClient()
    .on("error", (err) => console.error("Redis Client Error", err))
    .connect();

const sessionManager = new SessionManager(redis);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.static("./"));
app.use(express.static(path.join(__dirname, "../public")));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
});

app.get("/game/:sessionId", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../public", "player.html"));
});

app.get("/host/:sessionId", (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "../public", "host.html"));
});

app.get("/game/info/:sessionId", async (req: Request, res: Response) => {
    const { sessionId } = req.params as { sessionId: string };
    const { playerId } = req.query as { playerId: string };
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
        res.status(404).send("Session not found");
        return;
    }
    const playerResponse = session.getGameInfoByPlayerId(playerId);
    res.json(playerResponse);
});

app.get("/host/info/:sessionId", async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = (await sessionManager.getSession(sessionId)) as Session;
    if (!session) {
        res.status(404).send("Session not found");
        return;
    }
    res.json(session.getGameState());
});

app.post("/host", jsonParser, async (req: Request, res: Response) => {
    const { sessionCode } = req.body as { sessionCode: string | undefined };
    if (
        sessionCode &&
        !(await sessionManager.validateSessionCode(sessionCode))
    ) {
        res.status(400).send("Session code already exists");
        return;
    }
    const session = await sessionManager.createSession(sessionCode);
    await sessionManager.saveSession(session);
    res.redirect(
        url.format({
            pathname: "/host/" + session.getId(),
        })
    );
});

app.post("/host/round/:sessionId", async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
        console.error("Session not found during start round");
        return;
    }
    session.createRound();
    await sessionManager.saveSession(session);
    res.json(session.getGameState());
});

app.post("/join", async (req: Request, res: Response) => {
    const { sessionCode, username } = req.body;
    const session = await sessionManager.getSessionByCode(sessionCode);
    if (!session) {
        res.status(404).send("Session not found");
        return;
    }
    const player = session.addPlayer(username);
    await sessionManager.saveSession(session);
    res.redirect(
        url.format({
            pathname: "/game/" + session.getId(),
            query: {
                playerId: player.id,
            },
        })
    );
});

io.on("connection", async (socket) => {
    const { sessionId } = socket.handshake.query as { sessionId: string };
    socket.join(sessionId as string);

    socket.on("join", async (payload) => {
        const { sessionId, playerId } = payload;
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during join");
            return;
        }
        const player = session.getPlayer(playerId);
        socket.to(sessionId).emit("add player", player);
    });

    socket.on("create round", async (sessionId) => {
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during start round");
            return;
        }
        const round = session.getCurrentRound();
        io.to(sessionId).emit("create round", round);
    });

    socket.on("start round", async (sessionId) => {
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during start round");
            return;
        }
        io.to(sessionId).emit("start round");
        let timer = timeLimit;
        const interval = setInterval(() => {
            io.to(sessionId).emit("time down", timer);
            timer -= 1;
            if (timer < 0) {
                clearInterval(interval);
                io.to(sessionId).emit("round over");
            }
        }, 1000);
    });

    socket.on("player submit", async (payload) => {
        const { sessionId, playerId, answers } = payload;
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during player submit");
            return;
        }
        session.submitAnswers(playerId, answers);
        await sessionManager.saveSession(session);
        io.to(sessionId).emit("player submit", session.getGameState());
    });

    socket.on("upvote", async (payload) => {
        const { sessionId, playerId } = payload as {
            sessionId: string;
            playerId: string;
        };
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during upvote");
            return;
        }
        session.incrementPlayerScore(playerId);
        await sessionManager.saveSession(session);
        io.to(sessionId).emit("upvote", {
            playerId,
            score: session.getPlayer(playerId)?.score,
        });
    });

    socket.on("downvote", async (payload) => {
        const { sessionId, playerId } = payload as {
            sessionId: string;
            playerId: string;
        };
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            console.error("Session not found during upvote");
            return;
        }
        session.decrementPlayerScore(playerId);
        await sessionManager.saveSession(session);
        io.to(sessionId).emit("downvote", {
            playerId,
            score: session.getPlayer(playerId)?.score,
        });
    });

    socket.on("disconnect", async () => {
        const connectedSockets = (await io.in(sessionId).fetchSockets()).length;
        await sessionManager.cleanupSession(sessionId, connectedSockets);
    });
});

server.listen(port, "0.0.0.0", () => {
    if (env === "development") {
        console.log("Server is running in development mode");
        console.log(`Server is running on http://localhost:${port}`);
        console.log(
            `Other devices can access it at http://192.168.0.222:${port}`
        );
    }
});
