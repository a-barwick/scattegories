import ShortUniqueId from "short-unique-id";
import GameSession from "./GameSession.js";
const idGenerator = new ShortUniqueId({ length: 6 });

const session = new GameSession(idGenerator);
let s = new Set();
for (let i = 0; i < 1000; i++) {
    s.add(session.getRandomLetter());
}
console.log([...s].sort());