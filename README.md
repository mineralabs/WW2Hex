# WW2Hex

A two-player, simultaneous-turn WWII operational wargame on hex maps. The design is in
[WW2_Hex_Game_Development_Brief.md](WW2_Hex_Game_Development_Brief.md).

**Status: Stage 2 (simultaneous engine).**

- Both sides plan in secret, lock their orders, and the turn resolves for both at once: two hours
  in twelve ten-minute steps.
- Movement, spotting, fire and losses are all worked out from the same snapshots.
- Each side then watches a replay of only what its own units saw.

For now both players share one browser, taking turns at the screen ("hot-seat"). Playing across
two computers is Stage 3. The only scenario is a **synthetic test map** with placeholder
counters; nothing in it is historical.

## Requirements

- Node.js 22.12 or newer (developed on 24.15). Nothing else: no database, no paid service, no
  account.
- A desktop browser with WebGL (any current Chrome, Edge or Firefox).

## Start

```sh
npm install
npm run dev        # development server with hot reload → http://localhost:5173
```

Or run it the way it will eventually be played, from the local game-host program:

```sh
npm run host       # builds the client, then serves it → http://localhost:8790
```

The host listens only on this computer by default. `HOST=0.0.0.0 npm run host` (PowerShell:
`$env:HOST='0.0.0.0'; npm run host`) makes it reachable from the home network. Set `PORT` to
change the port.

## Playing a turn

1. **Allied player plans.** Click a counter, pick **Advance** (`A`), **Attack** (`T`) or
   **Withdraw** (`W`), then right-click the map. **Defend** (`D`) holds and digs in. Hover first
   to preview the route and arrival time. Shift+right-click adds waypoints. Artillery's Attack
   button reads **Bombard**: right-click a hex within range.
2. **Lock Allied orders.** A hand-over screen appears for the German player.
3. **German player plans and locks.** The turn resolves immediately.
4. **Replays.** Each player in turn watches what their own side saw: play/pause (`Space`), step
   (`←` `→`), scrub, or change speed. Red lines are fire. Faded dashed counters are enemies last
   seen at the time shown.
5. **Finish replay.** Once both players have finished, planning for the next turn begins.

**Umpire** (top bar) is a development view. It shows everything, lets you order and lock either
side, and replays the complete event log.

## Things to try

| Do this | To see |
| --- | --- |
| Attack the town across the bridge with the tanks | Contact made, assault, losses reported as light/moderate/heavy |
| Bombard a hex none of your units can see | Your log says "results not observed"; the German log says "shelled by unseen artillery" |
| Advance towards the enemy | The advance halts when the unit spots an enemy within 2 hexes |
| Switch between Allied, German and Umpire after a turn | The same events described from each point of view |
| Lock, then try to change orders | Locked orders cannot be changed until the turn resolves |

The rules, numbers and four worked examples are in [docs/combat-rules.md](docs/combat-rules.md).
All numbers are provisional playtest values.

## Checks

```sh
npm test           # 76 engine tests (Vitest)
npm run typecheck  # TypeScript across all packages
npm run check      # both
```

The tests cover:

- geometry, scenario validation, river crossings and route finding;
- movement and collisions;
- every combat worked example;
- spotting and line of sight;
- simultaneous fire;
- batch retreats;
- contact tracking;
- information leakage in views and replays;
- duplicate commits;
- save and reload;
- determinism.

## Layout

| Path | Contents |
| --- | --- |
| `packages/engine` | Rules with no UI or network code: geometry, map, route finding, orders, spotting, combat, step resolution, observed events, the match lifecycle, validation and balance values |
| `packages/protocol` | Message and per-player view types for Stage 3. Types only so far |
| `apps/client` | React panels and a PixiJS map. Stage 2 runs the match in the browser (hot-seat) |
| `apps/server` | The local game-host program. Serves the built client only so far |
| `scenarios/synthetic-test` | The synthetic engine-development scenario |
| `docs` | [Combat rules](docs/combat-rules.md), [Stage 2 notes](docs/stage-2-notes.md), [Stage 1 notes](docs/stage-1-notes.md), [scenario format](docs/scenario-format.md) |

## Next

Stage 3 is the first real two-player match. It adds:

- Host Game and Join Game across two computers, with each player sent only their own view;
- simple objectives and victory;
- saving, reconnecting, and restarting the host program.

See [docs/stage-2-notes.md](docs/stage-2-notes.md#stage-3-hand-off).
