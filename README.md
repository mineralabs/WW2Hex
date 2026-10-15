# WW2Hex

A two-player, simultaneous-turn WWII operational wargame on hex maps. The design is in
[WW2_Hex_Game_Development_Brief.md](WW2_Hex_Game_Development_Brief.md).

**Status: Stage 1 (map and orders).** One browser, development controls, both sides visible.
There is no combat, fog of war or networking yet. The only scenario is a **synthetic test map**
with placeholder counters. Nothing in it is historical.

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
`$env:HOST='0.0.0.0'; npm run host`) makes it reachable from the home network and prints the
addresses. Set `PORT` to change the port. Stage 1 has nothing that needs a second computer yet.

## What to try

| Do this | To see |
| --- | --- |
| Click a counter | Unit panel: formation, type, personnel, equipment, cohesion, supply, current order |
| Click an empty hex | Hex panel: terrain, elevation, roads, river sides, entry costs |
| Drag, mouse wheel | Pan and zoom. **Fit map** resets the view |
| Select a unit, hover a hex | Route preview with time and arrival clock |
| Right-click | Order an **Advance** along that route |
| Shift+right-click, then right-click | Route through waypoints. `Esc` clears them |
| **Step 10 min** or `N` | Resolve one ten-minute step |
| **Play turn** / **Finish turn** | Watch, or jump to the end of the two-hour turn |
| Order a southern unit north of the river | Every route uses the bridge; there is no other crossing |
| Order two units of one side to the same hex | An orange warning before; both wait during resolution |
| Order a unit into an enemy hex | It halts outside, the route turns dashed and the log says why |
| Order a long march, then finish two turns | Unfinished movement carries over between turns |

On the map, solid arrows are standing orders, a white dot marks where the unit will be at the end of
this turn, and a red dot on a counter means it is halted. The dot at the top right of a counter
shows cohesion (green/amber/red) and is hollow when supply is not normal.

## Checks

```sh
npm test           # engine tests (Vitest): geometry, validation, rivers, routes, movement, collisions, determinism
npm run typecheck  # TypeScript across all packages
npm run check      # both
```

## Layout

| Path | Contents |
| --- | --- |
| `packages/engine` | Rules with no UI or network code: hex geometry, map building, pathfinding, orders, step resolution, scenario validation, balance configuration |
| `packages/protocol` | Message and per-player view types for Stage 2/3. Types only so far |
| `apps/client` | React panels and a PixiJS map renderer. Stage 1 runs the engine in the browser |
| `apps/server` | The local game-host program. Stage 1 serves the built client only |
| `scenarios/synthetic-test` | The synthetic engine-development scenario |
| `docs` | [Stage 1 implementation notes](docs/stage-1-notes.md) and the [scenario file format](docs/scenario-format.md) |

## Next

Stage 2 is the simultaneous engine: private order sets, commit/lock, spotting, deterministic
combat, and filtered observed-event logs. See section 9 of the brief and the "Stage 2 hand-off"
list in [docs/stage-1-notes.md](docs/stage-1-notes.md).
