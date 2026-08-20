import path from "path";
import url from "url";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import express, { Request, Response } from "express";
import "dotenv/config";
import bodyParser from "body-parser";
import cors from "cors";
import { Server } from "socket.io";

import SessionManager from "./SessionManager";
import { createSessionStore } from "./createSessionStore";

const port = Number(process.env.PORT) || 3000;
const env = process.env.NODE_ENV || "development";
const timeLimit = Number(process.env.TIME_LIMIT) || 60;
const sessionCleanupGraceMs = Number(process.env.SESSION_CLEANUP_GRACE_MS) || 30_000;

const app = express();
const server = createServer(app);
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : true;
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});
const jsonParser = bodyParser.json();

const redis = await createSessionStore();
const sessionManager = new SessionManager(redis);
const roundTimers = new Map<string, ReturnType<typeof setInterval>>();
const pendingCleanups = new Map<string, ReturnType<typeof setTimeout>>();

const __dirname = dirname(fileURLToPath(import.meta.url));

const asyncRoute =
    (handler: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response) => {
        handler(req, res).catch((error) => {
            console.error(error);
            if (!res.headersSent) {
                res.status(500).send("Internal server error");
            }
        });
    };

const sendPublicFile = (res: Response, filename: string) => {
    res.sendFile(path.join(__dirname, "../public", filename));
};

const startRoundTimer = (sessionId: string) => {
    const existing = roundTimers.get(sessionId);
    if (existing) {
        clearInterval(existing);
    }

    let timer = timeLimit;
    const interval = setInterval(() => {
        io.to(sessionId).emit("time down", timer);
        timer -= 1;
        if (timer < 0) {
            clearInterval(interval);
            roundTimers.delete(sessionId);
            io.to(sessionId).emit("round over");
        }
    }, 1000);
    roundTimers.set(sessionId, interval);
};

app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
    sendPublicFile(res, "index.html");
});

app.get("/error", (_req: Request, res: Response) => {
    sendPublicFile(res, "error.html");
});

app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
});

app.get("/game/:sessionId", (_req: Request, res: Response) => {
    sendPublicFile(res, "player.html");
});

app.get("/host/:sessionId", (_req: Request, res: Response) => {
    sendPublicFile(res, "host.html");
});

app.get(
    "/game/info/:sessionId",
    asyncRoute(async (req: Request, res: Response) => {
        const { sessionId } = req.params as { sessionId: string };
        const { playerId } = req.query as { playerId?: string };
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: "Session not found" });
            return;
        }
        const playerResponse = session.getGameInfoByPlayerId(playerId || "");
        if (!playerResponse) {
            res.status(404).json({ error: "Player not found" });
            return;
        }
        res.json(playerResponse);
    })
);

app.get(
    "/host/info/:sessionId",
    asyncRoute(async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: "Session not found" });
            return;
        }
        res.json(session.getGameState());
    })
);

app.post(
    "/host",
    jsonParser,
    asyncRoute(async (req: Request, res: Response) => {
        const { sessionCode } = req.body as { sessionCode?: string };
        if (
            sessionCode &&
            !(await sessionManager.validateSessionCode(sessionCode))
        ) {
            res.status(400).send("Session code already exists");
            return;
        }
        const session = await sessionManager.createSession(sessionCode);
        res.redirect(
            url.format({
                pathname: "/host/" + session.getId(),
            })
        );
    })
);

app.post(
    "/host/round/:sessionId",
    asyncRoute(async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: "Session not found" });
            return;
        }
        session.createRound();
        await sessionManager.saveSession(session);
        res.json(session.getGameState());
    })
);

app.post(
    "/join",
    asyncRoute(async (req: Request, res: Response) => {
        const { sessionCode, username } = req.body as {
            sessionCode?: string;
            username?: string;
        };
        if (!sessionCode || !username) {
            res.status(400).send("Session code and username are required");
            return;
        }
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
    })
);

io.on("connection", (socket) => {
    const sessionId = String(socket.handshake.query.sessionId || "");
    if (sessionId) {
        socket.join(sessionId);
        const pending = pendingCleanups.get(sessionId);
        if (pending) {
            clearTimeout(pending);
            pendingCleanups.delete(sessionId);
        }
    }

    const onSocket = (
        event: string,
        handler: (payload: any) => Promise<void>
    ) => {
        socket.on(event, async (payload: any) => {
            try {
                await handler(payload);
            } catch (error) {
                console.error(`socket ${event} failed`, error);
                socket.emit("error", "Something went wrong");
            }
        });
    };

    onSocket(
        "join",
        async (payload: { sessionId?: string; playerId?: string }) => {
            const roomId = payload?.sessionId || sessionId;
            const session = await sessionManager.getSession(roomId);
            if (!session) {
                console.error("Session not found during join");
                return;
            }
            const player = session.getPlayer(payload?.playerId || "");
            if (!player) {
                console.error("Player not found during join");
                return;
            }
            socket.to(roomId).emit("add player", player);
        }
    );

    onSocket("create round", async (roomId: string) => {
        const targetRoom = roomId || sessionId;
        const session = await sessionManager.getSession(targetRoom);
        if (!session) {
            console.error("Session not found during create round");
            return;
        }
        const round = session.getCurrentRound();
        io.to(targetRoom).emit("create round", round);
    });

    onSocket("start round", async (roomId: string) => {
        const targetRoom = roomId || sessionId;
        const session = await sessionManager.getSession(targetRoom);
        if (!session) {
            console.error("Session not found during start round");
            return;
        }
        io.to(targetRoom).emit("start round");
        startRoundTimer(targetRoom);
    });

    onSocket(
        "player submit",
        async (payload: {
            sessionId?: string;
            playerId?: string;
            answers?: Record<string, string> | string[];
        }) => {
            const roomId = payload?.sessionId || sessionId;
            const session = await sessionManager.getSession(roomId);
            if (!session) {
                console.error("Session not found during player submit");
                return;
            }
            session.submitAnswers(payload?.playerId || "", payload?.answers || {});
            await sessionManager.saveSession(session);
            io.to(roomId).emit("player submit", session.getGameState());
        }
    );

    onSocket(
        "upvote",
        async (payload: { sessionId?: string; playerId?: string }) => {
            const roomId = payload?.sessionId || sessionId;
            const session = await sessionManager.getSession(roomId);
            if (!session) {
                console.error("Session not found during upvote");
                return;
            }
            session.incrementPlayerScore(payload?.playerId || "");
            await sessionManager.saveSession(session);
            io.to(roomId).emit("upvote", {
                playerId: payload.playerId,
                score: session.getPlayer(payload?.playerId || "")?.score,
            });
        }
    );

    onSocket(
        "downvote",
        async (payload: { sessionId?: string; playerId?: string }) => {
            const roomId = payload?.sessionId || sessionId;
            const session = await sessionManager.getSession(roomId);
            if (!session) {
                console.error("Session not found during downvote");
                return;
            }
            session.decrementPlayerScore(payload?.playerId || "");
            await sessionManager.saveSession(session);
            io.to(roomId).emit("downvote", {
                playerId: payload.playerId,
                score: session.getPlayer(payload?.playerId || "")?.score,
            });
        }
    );

    socket.on("disconnect", () => {
        if (!sessionId) {
            return;
        }
        const existing = pendingCleanups.get(sessionId);
        if (existing) {
            clearTimeout(existing);
        }
        const timeout = setTimeout(async () => {
            pendingCleanups.delete(sessionId);
            try {
                const connectedSockets = (await io.in(sessionId).fetchSockets())
                    .length;
                await sessionManager.cleanupSession(sessionId, connectedSockets);
                if (connectedSockets === 0) {
                    const timer = roundTimers.get(sessionId);
                    if (timer) {
                        clearInterval(timer);
                        roundTimers.delete(sessionId);
                    }
                }
            } catch (error) {
                console.error("Failed to clean up session", error);
            }
        }, sessionCleanupGraceMs);
        pendingCleanups.set(sessionId, timeout);
    });
});

server.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port} (${env})`);
    if (env === "development") {
        console.log(`Local: http://localhost:${port}`);
    }
});
