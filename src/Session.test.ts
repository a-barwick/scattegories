import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Session from "./Session";

describe("Session", () => {
    it("adds unique players and reuses an existing username", () => {
        const session = Session.fromCode("PARTY");
        const alice = session.addPlayer("Alice");
        const aliceAgain = session.addPlayer("Alice");
        const bob = session.addPlayer("Bob");

        assert.equal(alice.id, aliceAgain.id);
        assert.equal(session.getGameState().session.players.length, 2);
        assert.equal(session.getPlayer(bob.id)?.username, "Bob");
    });

    it("returns game info for a known player and null otherwise", () => {
        const session = Session.fromCode("PARTY");
        const alice = session.addPlayer("Alice");

        const info = session.getGameInfoByPlayerId(alice.id);
        assert.equal(info?.username, "Alice");
        assert.equal(info?.sessionCode, "PARTY");
        assert.equal(session.getGameInfoByPlayerId("missing"), null);
    });

    it("scores players and ignores unknown ids", () => {
        const session = Session.fromCode("PARTY");
        const alice = session.addPlayer("Alice");

        session.incrementPlayerScore(alice.id);
        session.incrementPlayerScore(alice.id);
        session.decrementPlayerScore(alice.id);
        session.incrementPlayerScore("missing");

        assert.equal(session.getPlayer(alice.id)?.score, 1);
    });

    it("stores submitted answers by player", () => {
        const session = Session.fromCode("PARTY");
        const alice = session.addPlayer("Alice");

        session.submitAnswers(alice.id, { "1": "Aardvark", "2": "Ant" });

        assert.deepEqual(session.getGameState().round.playerAnswers[alice.id], {
            "1": "Aardvark",
            "2": "Ant",
        });
    });

    it("creates a new round with a letter and unique categories", () => {
        const session = Session.fromCode("PARTY");
        session.createRound();

        const round = session.getCurrentRound();
        assert.equal(round.number, 1);
        assert.match(round.letter, /^[A-Y]$/);
        assert.equal(round.categories.length, 10);
        assert.equal(new Set(round.categories).size, 10);

        const firstLetter = round.letter;
        session.createRound();
        assert.notEqual(session.getCurrentRound().letter, firstLetter);
        assert.equal(session.getCurrentRound().number, 2);
    });
});
