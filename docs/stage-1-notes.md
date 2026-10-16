# Stage 1 implementation notes

This records the assumptions and defaults chosen while implementing Stage 1 (map and orders). Each
can be changed. Numbers marked *provisional* are playtest values, not research.

## Scope delivered

The deliverable and completion check come from section 9 of the brief.

- **Synthetic hex map**: 22 × 16 hexes at about 1 km per hex. It has terrain, elevation, roads,
  one major river with a single road bridge, a fordable stream, a lake, and named places.
- **Units**: 11 placeholder counters in three formations.
- **Map interaction**: selection, pan and zoom, route preview, and editable Advance orders with
  waypoints.
- **Development stepper**: one step, play a turn, or finish a turn.
- **Completion check**: legal routes respect terrain and crossings, and units follow and continue
  queued routes across turns. Both are covered by automated tests and were checked in the running
  client.

## Coordinates and geometry

- The map uses pointy-top hexes in axial coordinates (`q, r`) inside the engine. Scenario files
  author positions as odd-r offset `[col, row]`, with row 0 in the north, because that suits a
  rectangular map. The interface shows `[col, row]`.
- An **edge** is identified by the unordered pair of hexes on either side. A **corner** is the
  unordered triple of hexes that meet there. Rivers and bridges are stored on edges, never on
  cells.
- Each move crosses exactly one edge, so there are no diagonal moves. A river can only be bypassed
  through a gap in its edge chain or around an end. Validation rejects both cases:
  - **`river-gap`**: the river's edges must form one connected chain through shared corners.
  - **`river-open-end`**: each loose end of a major river must touch the map edge or a water hex.

  The tests remove the bridge and confirm that no hex north of the river can then be reached
  from the south.

## Movement model

- **Integer minutes.** Entering a hex costs a whole number of minutes, set by movement class
  (foot, wheeled or tracked) and the destination's terrain. Moving along a road edge uses the road
  cost instead. A major-river edge is impassable unless a bridge sits on that exact edge. A stream
  edge adds a crossing cost; for wheeled units the cost is null, meaning they cannot ford.
- **Ticks within a step.** Each ten-minute step is resolved as ten one-minute movement ticks, so
  fast road movement can cover several hexes in a step while each tick still resolves conflicts
  as a batch. Each moving unit gains one minute of progress per tick. When progress reaches the
  next hex's cost, the unit requests to enter that hex.
- **Progress cap.** A unit that is held up keeps its progress at the cost of the next hex. It
  enters as soon as the way clears, but it cannot bank extra time while waiting.
- **No free distance.** If a new order enters the same next hex, progress is kept. Otherwise it is
  reset to zero. Re-issuing an order is therefore never faster than leaving it alone, and turning
  round forfeits progress towards the abandoned hex. Both cases are tested.
- **Persistence.** Progress and the remaining path are part of the saved unit state. Turn
  boundaries do not touch them.
- **Exact estimates.** Arrival estimates are exact when nothing blocks the route. A test checks
  that move events occur at the estimated minutes.

## Collision rules implemented

All of these follow section 4 of the brief. Each move is decided from the same pre-tick snapshot,
and all permitted moves are applied together.

| Situation | Result | Event reason |
| --- | --- | --- |
| Several friendly units want one hex | All wait. No unit-id priority. **Changed in Stage 3:** the longest-waiting unit goes first, with a compass-direction tie-break ([combat-rules.md](combat-rules.md#queues-and-stopped-units)) | `friendly-conflict` |
| Opposing units want the same empty hex | Both halt outside it | `contested` |
| Next hex holds an enemy | The unit does not enter | `enemy-occupied` |
| Opposing units try to swap hexes | Both stay (each target is enemy-held) | `enemy-occupied` |
| Next hex holds a friendly unit that is leaving | The unit follows in the same tick | — |
| Friendly swap or rotation, all destinations unique | All move | — |
| Chain behind a stationary unit | The whole chain waits; nobody enters an occupied hex. **Changed in Stage 3:** a unit blocked by a stopped friendly unit routes round it if it can | `occupied` |
| Next move became impossible | The order is cancelled | `impassable` |

Chains are settled before anything moves. Because each destination has at most one requester after
the conflict filter, the dependencies form simple chains that end in an empty hex, a blocked unit or
a cycle.

A randomised test gives every unit on the synthetic map random destinations for 15 seeds and checks
that two counters never share a hex.

A blocked event is logged once when a unit becomes blocked, not on every tick.

Stage 1 has no contact or combat. An Advance that meets an enemy waits outside the enemy's hex
indefinitely. Stage 2 adds spotting, halting on detected opposition and engagement.

## Determinism

- `resolveStep` is pure. It copies the state, sorts units by id and never reads the clock,
  randomness or rendering timing.
- Tests show that identical inputs give identical state and events, that the order units are
  stored in makes no difference, and that the input state is never modified.
- Path-finding (A*) breaks every tie on a total order (f, then g, then hex), so routes do not
  depend on the order nodes are pushed onto the queue.
- Game state is plain JSON, cloned by JSON round-trip, ready for Stage 3 persistence.

## Route planning and information

Routes are planned from static map knowledge only, which is what the player can see. Enemy units are
ignored at planning time so that order validation cannot reveal concealed units. This matches the
brief. Obstructions are discovered during resolution.

## Provisional movement costs

The values are set in `packages/engine/src/rules.ts`, `rulesVersion 0.1.0-provisional`. Costs are
minutes to enter one hex. The road row applies when moving along a road edge, whatever the
terrain. The stream row is added when fording a stream; a dash means the unit cannot ford.

| Terrain | Foot | Wheeled | Tracked |
| --- | ---: | ---: | ---: |
| Clear | 15 | 15 | 8 |
| Polder | 25 | 40 | 25 |
| Woods | 25 | 45 | 30 |
| Town | 20 | 12 | 15 |
| Water | — | — | — |
| Road edge | 12 | 4 | 6 |
| Stream crossing (extra) | +10 | — | +20 |

These are invented playtest values that make roads matter and polder slow. They are not historical
rates. Elevation is stored and shaded on the map but does not yet affect movement.

## Interface decisions

- Development view: both sides are visible and orderable, and orders apply immediately. Fog of war
  and per-side planning come in Stages 2 and 3.
- Clicking a hex selects the unit in it, if any. Right-click orders an Advance. Shift+right-click
  adds a waypoint.
- Orange hex outlines and an "Order warnings" panel flag friendly orders that end on the same hex.
- Counters show a short name, a simplified NATO-style type symbol, personnel, a coloured stripe for
  the formation, and a readiness dot.
- Selected units show a "Placeholder data" badge whenever the unit's data status is not
  `verified`.
- The client imports the scenario JSON at build time. It is validated on load, and a scenario with
  errors shows the error list instead of a map.

## Hosting

- `apps/server` is a dependency-free Node program, run directly by Node's TypeScript type
  stripping. It serves the built client from the same port that will carry WebSockets in Stage 3.
- By default it binds to `127.0.0.1`, so nothing is exposed to the network until the player opts
  in with `HOST=0.0.0.0`.
- Path traversal outside `apps/client/dist` was tried during testing and is refused.
- No paid service, account, database or router change is required.

## Data honesty

- Every unit, formation and equipment entry in the test scenario has data status `synthetic`. The
  scenario name and the interface banner both say it is not historical.
- The validator refuses a scenario marked `verified` that contains unverified units, formations or
  equipment, or that lists no sources.

## Stage 2 hand-off

What the existing code already provides:

- `CommittedOrderSet` and `applyOrderSet` check ownership, turn number, duplicate orders and route
  legality, and reject the whole set if any order is invalid.
- `GameEvent` carries time, turn and step, ready for per-player filtering.
- `resolveStep` has a marked place after movement for spotting, fire, losses and supply.

What Stage 2 needs to add:

1. Line-of-sight and spotting, and visibility-filtered views. The types are already in
   `packages/protocol`.
2. Halting on detected opposition. The Attack, Defend and Withdraw orders.
3. The combat formula table with worked examples (section 5 of the brief) before any combat code.
4. Committing both sides' order sets, then resolving both together.
5. Tests for simultaneous fire, information leakage and duplicate commitments.

Known limitations:

- One movement rate per unit. There are no march columns or road-capacity rules.
- Elevation has no effect on movement yet.
- Bridges cannot be destroyed. The `impassable` path exists for when they can be.
- Large counters can hide terrain detail at low zoom.
