DENO := deno
ENTRY := src/server.ts

.PHONY: dev build start

dev:
	deno run --unstable-hmr --allow-read --allow-net --allow-env ./src/server.ts

build:
	deno bundle --unstable ./src/server.ts ./dist/server.js

start:
	deno run --allow-read --allow-net --allow-env ./dist/server.js

default: dev
