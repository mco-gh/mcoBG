# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (available but not used by mcoBG)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Real-time**: Socket.io (server + client)
- **Video chat**: PeerJS (WebRTC)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server + Socket.io game logic
│   └── mcobg/              # React + Vite frontend for Backgammon game
├── lib/                    # Shared libraries
│   ├── backgammon/         # Shared game types and constants (used by api-server + mcobg)
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## mcoBG — Multiplayer Backgammon

### Architecture

- **Frontend** (`artifacts/mcobg`): React + Vite + Tailwind CSS app with Socket.io client and PeerJS video chat
- **Backend** (`artifacts/api-server`): Express + Socket.io server handling game state, move validation, and room management
- **Game Logic** (`artifacts/api-server/src/game-logic.ts`): Complete Backgammon rules engine

### Game Features

- Create/join games via 6-character Game ID
- Full Backgammon rule enforcement (movement, hitting, bar, bearing off, doubles)
- Real-time state sync via Socket.io
- Click-to-select + click-to-move checker interaction with visual highlights
- Animated dice rolling
- PeerJS video/audio chat between players
- Dark mode (default) / light mode toggle
- Modals: About/How to Play, Config (theme toggle, board direction toggle, movement info, player info), Connect (Game ID + Peer ID with copy)
- Rematch support
- Graceful disconnection handling

### Frontend Routing

Uses wouter v3 with `<Router base={BASE_URL}>`:
- `/` — Main game app (landing → waiting → playing → gameover phases)
- `/dev` — Interactive dev console for testing Socket.io events directly

### Key Files

- `artifacts/api-server/src/socket-handler.ts` — Socket.io event handlers for game rooms
- `artifacts/api-server/src/game-logic.ts` — Backgammon rules (board init, move validation, bearing off, etc.)
- `artifacts/mcobg/src/hooks/useGame.ts` — Game state management hook
- `artifacts/mcobg/src/components/BackgammonBoard.tsx` — SVG board rendering
- `artifacts/mcobg/src/components/DiceTray.tsx` — Dice display with animations
- `artifacts/mcobg/src/components/VideoFeed.tsx` — PeerJS video chat component
- `artifacts/mcobg/src/components/GameScreen.tsx` — Main game UI with modals
- `artifacts/mcobg/src/components/LandingPage.tsx` — Create/Join game landing
- `artifacts/mcobg/src/pages/DevConsole.tsx` — Interactive Socket.io testing panel
- `artifacts/mcobg/src/lib/socket.ts` — Socket.io client singleton (path: /api/socket.io)

### Socket.io Events

- `create-game` — Creates room, assigns white to creator
- `join-game` — Second player joins as black, triggers `game-started`
- `roll-dice` — Server generates dice, computes valid moves
- `move-piece` — Server validates and applies move
- `end-turn` — Switches active player
- `share-peer-id` — Relays PeerJS IDs for video connection
- `request-rematch` / `accept-rematch` — Rematch flow
- `disconnect` — Notifies opponent, cleans up room

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with Socket.io for real-time game state management.

- Entry: `src/index.ts` — creates HTTP server, attaches Socket.io, starts Express
- Socket handler: `src/socket-handler.ts` — all game room management
- Game logic: `src/game-logic.ts` — Backgammon rules engine
- Routes: `src/routes/` — REST endpoints (health check)
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `artifacts/mcobg` (`@workspace/mcobg`)

React + Vite frontend for the Backgammon game.

- Uses Socket.io client for real-time communication
- Uses PeerJS for WebRTC video/audio chat
- Tailwind CSS for styling with dark/light theme
- SVG-based board rendering

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Available but not used by mcoBG (game state is in-memory).

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec and Orval config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package.
