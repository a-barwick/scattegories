import { describe, it } from "node:test";
import assert from "node:assert/strict";
import MemoryStore from "./MemoryStore";
import SessionManager from "./SessionManager";

describe("SessionManager", () => {
    it("creates a session that can be loaded by id or code", async () => {
        const manager = new SessionManager(new MemoryStore());
        const session = await manager.createSession("PARTY");

        const byId = await manager.getSession(session.getId());
        const byCode = await manager.getSessionByCode("PARTY");

        assert.equal(byId?.getId(), session.getId());
        assert.equal(byCode?.getCode(), "PARTY");
        assert.equal(await manager.validateSessionCode("PARTY"), false);
        assert.equal(await manager.validateSessionCode("OTHER"), true);
    });

    it("does not drop the first player when a second player joins by code", async () => {
        const manager = new SessionManager(new MemoryStore());
        const created = await manager.createSession("PARTY");

        const firstJoin = await manager.getSessionByCode("PARTY");
        assert.ok(firstJoin);
        firstJoin.addPlayer("Alice");
        await manager.saveSession(firstJoin);

        const secondJoin = await manager.getSessionByCode("PARTY");
        assert.ok(secondJoin);
        secondJoin.addPlayer("Bob");
        await manager.saveSession(secondJoin);

        const latest = await manager.getSession(created.getId());
        const players = latest?.getGameState().session.players ?? [];
        assert.equal(players.length, 2);
        assert.deepEqual(
            players.map((player) => player.username).sort(),
            ["Alice", "Bob"]
        );
    });

    it("keeps session data after a brief empty-room disconnect", async () => {
        const manager = new SessionManager(new MemoryStore());
        const session = await manager.createSession("PARTY");
        session.addPlayer("Alice");
        await manager.saveSession(session);

        await manager.cleanupSession(session.getId(), 1);

        const stillThere = await manager.getSession(session.getId());
        assert.equal(stillThere?.getPlayer(session.getGameState().session.players[0].id)?.username, "Alice");
    });

    it("deletes id and code keys when the room is actually empty", async () => {
        const manager = new SessionManager(new MemoryStore());
        const session = await manager.createSession("PARTY");

        await manager.cleanupSession(session.getId(), 0);

        assert.equal(await manager.getSession(session.getId()), undefined);
        assert.equal(await manager.getSessionByCode("PARTY"), undefined);
        assert.equal(await manager.validateSessionCode("PARTY"), true);
    });
});
