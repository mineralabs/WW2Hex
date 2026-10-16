# WW2Hex

A two-player, simultaneous-turn WWII operational wargame on hex maps. The design is in
[WW2_Hex_Game_Development_Brief.md](WW2_Hex_Game_Development_Brief.md).

**Status: Stage 3 (two-player match).**

- One player's computer runs the game host. Both players play in a web browser, each on their own
  computer.
- Both sides plan in secret and lock their orders. The turn then resolves on the host for both at
  once: two hours in twelve ten-minute steps.
- Each player watches a replay of only what their own side saw. The host never sends a browser
  anything its side should not know.
- A match ends when a side holds its objective, wipes out the other side, or the turn limit
  passes. Games are saved as you play and survive closing a browser or restarting the host.

The only scenario is a **synthetic test map** with placeholder counters; nothing in it is
historical.

## Requirements

- **Computers:** Windows or macOS, in any combination. Either can host.
- **Host player:** Node.js 22.12 or newer (developed on 24.15). Nothing else: no database, no paid
  service, no account.
- **Both players:** a desktop browser with WebGL (any current Chrome, Edge, Firefox or Safari).
- **Players in different houses:** Tailscale (free), on both computers.

## Start

```sh
npm install
npm run host       # builds the client and starts the game host → http://localhost:8790
```

The host window prints the addresses the other player can use. On the host computer, open
http://localhost:8790/ and choose **Host a new game**. Then send the other player the invitation
link.

**[docs/connection-guide.md](docs/connection-guide.md)** covers:

- the home network, Tailscale and firewall setup;
- stopping and resuming;
- troubleshooting;
- a test checklist for two computers.

To try both sides on one computer, open the invitation link in a private window or a second
browser.

For development with hot reload, run the host and the dev server side by side:

```sh
npm run host:dev   # game host without rebuilding (port 8790)
npm run dev        # client with hot reload → http://localhost:5173 (talks to the host)
```

## Playing a turn

1. **Plan.** Click a counter, pick **Advance** (`A`), **Attack** (`T`) or **Withdraw** (`W`), then
   right-click the map. **Defend** (`D`) holds and digs in. Hover first to preview the route and
   arrival time. Shift+right-click adds waypoints. Artillery's Attack button reads **Bombard**:
   right-click a hex within range. On a Mac, right-click is a two-finger click on the trackpad, or
   Ctrl+click.
2. **Lock orders.** Your orders are frozen and stay secret. The top bar shows whether the other
   player has locked.
3. **Watch the replay** once both have locked. You can play or pause (`Space`), step (`←` `→`),
   scrub, or change speed. Red lines are fire. Faded dashed counters are enemies last seen at the
   time shown.
4. **Finish replay.** The next turn starts once both players have finished.

The **Objectives** panel shows who holds each objective hex: a star and ring on the map, in the
holder's colour. In the synthetic scenario, the Allied side must hold Northton and the north end
of the bridge at two consecutive turn ends, by the end of turn 8. Otherwise the German side wins.

## Things to try

| Do this | To see |
| --- | --- |
| Attack the town across the bridge with the tanks | Contact made, assault, losses reported as light/moderate/heavy |
| Bombard a hex none of your units can see | Your log says "results not observed"; the German log says "shelled by unseen artillery" |
| Advance towards the enemy | The advance halts when the unit spots an enemy within 2 hexes |
| Compare both players' reports after a turn | The same events described from each point of view |
| Lock, then close the tab and reopen the link | Back in your seat with the orders still locked |
| Stop the host after one side locks, then start it again | Both pages reconnect; the turn resolves when the other side locks |
| Take and hold Northton and the bridge end | The objective hexes change colour, then the result screen after two turn ends |

The rules, numbers and four worked examples are in [docs/combat-rules.md](docs/combat-rules.md).
All numbers are provisional playtest values.

## Checks

```sh
npm test           # 109 tests (Vitest): engine, protocol and host
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
- objectives, control and victory;
- information leakage, checked on the exact messages each player receives;
- message validation, seats, credentials and origin checks;
- duplicate commits;
- reconnecting after a commit;
- restarting the host;
- a failed save never half-applying a turn;
- save and reload producing the same next turn;
- a full match played to victory over real WebSockets;
- determinism.

## Layout

| Path | Contents |
| --- | --- |
| `packages/engine` | Rules with no UI or network code: geometry, map, route finding, orders, spotting, combat, step resolution, observed events, the match lifecycle, validation and balance values |
| `packages/protocol` | Messages between host and browser, per-player view types, and validation of browser messages |
| `apps/client` | React panels and a PixiJS map. Holds only what the host sends this player |
| `apps/server` | The local game-host program: serves the client, rooms and seats, authoritative turns, saving |
| `scenarios/synthetic-test` | The synthetic engine-development scenario |
| `saves` | Saved matches (created by the host; not in git) |
| `docs` | [Connection guide](docs/connection-guide.md), [combat rules](docs/combat-rules.md), [Stage 3 notes](docs/stage-3-notes.md), [Stage 2 notes](docs/stage-2-notes.md), [Stage 1 notes](docs/stage-1-notes.md), [scenario format](docs/scenario-format.md) |

## Next

Stage 3 still needs testing by hand:

- on two computers on the home network;
- then from two houses over Tailscale.

Use the checklist in the [connection guide](docs/connection-guide.md#test-checklist-for-stage-3).

Stage 4 is the historical Nijmegen slice. It adds:

- a georeferenced map with a sourced roster;
- basic supply;
- a reinforcement schedule.

See [docs/stage-3-notes.md](docs/stage-3-notes.md#stage-4-hand-off).
