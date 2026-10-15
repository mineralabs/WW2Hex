# Stage 2 implementation notes

This records what Stage 2 (the simultaneous engine) added, and the decisions and defaults chosen
along the way. The rules themselves are in [combat-rules.md](combat-rules.md). Every number is a
provisional playtest value (`rulesVersion 0.2.0-provisional`).

## Completion check

The brief's check for Stage 2 is that both sides resolve from the same snapshots, and identical
inputs produce identical results. The tests show both:

- Every phase of a step decides from one shared snapshot (`resolveStep` in
  `packages/engine/src/resolve.ts`). A unit destroyed in a step still fires in that step.
- Results do not depend on the order units are stored in, or on which side commits first.
- Identical inputs give identical state, events and replays across many randomised turns.
- Saving the match as JSON part-way through a turn and reloading it gives the same next turn.

## What was added

| Area | Where |
| --- | --- |
| Attack, Defend and Withdraw orders, with artillery bombardment as a form of Attack | `orders.ts` |
| Spotting: spot ranges, terrain concealment, units revealed by moving or firing, line of sight blocked by woods, towns and higher ground | `visibility.ts` |
| Deterministic integer combat, damage, cohesion, destruction, batch retreats | `combat.ts` |
| Contact lists, per-side observed events, per-side views | `observe.ts` |
| Turn lifecycle: commit, lock, resolve exactly once, replay, next turn | `match.ts` |
| Hot-seat client: per-side planning, hand-over screen, lock buttons, replay with step/speed controls, fire lines, contact markers, Umpire view | `apps/client` |

## Decisions and defaults

**Data and rules**

- **Equipment facts and game coefficients are kept apart.** Each catalogue item now has a
  `combatClass`. Its gameplay numbers come from `rules.weapons`, so researched equipment data
  never holds tuning values.
- **Hard or soft target** is worked out from the unit's equipment (armoured vehicles × 15 ≥
  personnel), not from its type label.
- **Ammunition is not modelled yet.** Artillery can fire every step. Supply status still affects
  fire through the supply modifier. Reserves and resupply belong to Stage 4's supply tracing.

**Orders and movement**

- **Advance halts** when the unit itself sees an enemy within 2 hexes. The order is cleared,
  rather than paused, so the player decides what happens next. The unit keeps fighting where it
  stands.
- **Attack** doesn't halt. It assaults the hex it is trying to enter, enters once that hex is
  empty, and then switches to Defend.
- **Only units hit while broken retreat.** A unit breaks below cohesion 25. Requiring a hit as
  well stops broken units fleeing every step while they recover.
- **A broken unit with no visible enemy holds** rather than retreating, because "away from the
  threat" is undefined. Its order is cleared.
- **Retreats use positions after destruction, before any retreat.** A unit can't retreat into a
  hex being vacated by another retreating unit in the same step.

**What players see**

- **A re-sighted enemy gets a new contact id** unless it is seen again exactly where it was last
  seen. A player cannot use contact ids to track identity they never observed.
- **Last-seen markers are cleared** when a side could see a unit standing still in that hex and
  nothing is there. A unit that moves out of sight while its old hex stays in view leaves no
  marker; its last visible position is on the map only if the player saw it move.
- **Initial contacts** are worked out when the scenario loads, so turn 1 planning shows what each
  side can already see.
- **Fire results are reported as levels.** The firing side sees light, moderate or heavy, measured
  against the target's starting strength, and only if it could see the target. It never sees
  exact enemy losses.
- **Fire with zero damage is not reported**, and does not reveal the firer.

**Hot-seat**

- Each hand-over hides the screen.
- Selection, the hex outline and the order mode are cleared between players.
- The Umpire view is a development tool and deliberately shows everything.

## Where hidden information lives

In Stage 2 the whole match still runs in one browser, so the full state is in that browser's
memory. It isn't sent anywhere, but nothing protects it from a player who opens the browser's
developer tools.

The protection from the brief starts in Stage 3. There, the host builds each side's `SideView` and
`ObservedEvent` list, which `observe.ts` already produces, and sends only those. The leakage test
checks those exact payloads, not what is drawn on screen.

## Stage 3 hand-off

What the existing code already provides:

- `MatchState` is plain JSON. Persist it and resume.
- `commitOrders` refuses a different set after locking and accepts an identical one, so a retried
  Ready message is harmless.
- Only the second commit resolves the turn, and a commit during replay is refused, so a turn
  resolves exactly once.
- `lastTurn.replays[side]` is exactly what to send each player. Never send
  `lastTurn.authoritative`.

What Stage 3 needs to build:

1. Host Game and Join Game, rooms and side credentials over WebSocket (`ws`), with message shapes
   from `packages/protocol`.
2. Simple objectives and victory checked at turn boundaries, held in scenario data.
3. Saving matches on the host; reconnecting after a commit; restarting the host program.
4. Testing on two browsers, then two computers on the home network, then remotely over
   Tailscale.

Known limitations:

- **Combat:**
  - No ammunition.
  - No terrain-control or zone-of-control model.
  - Assault only into the hex directly ahead.
  - One target per unit per step.
- **Spotting:** works per step, not per tick. A unit can drive past an enemy within a single step
  without either seeing the other in between.
- **Replay:** steps through ten-minute frames. Moves within a step jump rather than animate tick
  by tick.
