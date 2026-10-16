# Scenario file format (schema version 1)

A scenario is one JSON file, kept outside the engine under `scenarios/<id>/scenario.json`. The
TypeScript definition is `ScenarioFile` in `packages/engine/src/types.ts`, and `validateScenario`
checks it. Run `npm test` after any edit. The synthetic scenario is checked by the test suite.

All positions are odd-r offset `[col, row]` with row 0 in the north. Odd rows sit half a hex to
the right.

## Top level

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Always `1` for now |
| `id`, `name`, `description` | Identification. A synthetic scenario must say so in its name |
| `dataStatus` | `synthetic`, `provisional` or `verified`. `verified` is rejected while any unit, formation or equipment entry is not verified, or while `provenance.sources` is empty |
| `start` | `{ day, minuteOfDay }` at the start of turn 1 |
| `map` | See below |
| `equipment` | Catalogue: `id`, `name`, `role`, `combatClass`, `researchStatus`, `sources[]`. Historical facts and sources go here. `combatClass` names a weapon profile in the rules, such as `rifle-section` or `medium-tank`. The game numbers live in that profile, never in the catalogue |
| `formations` | `id`, `side`, `name`, `parentId` (or `null`), `dataStatus`. Parents must exist, be on the same side, and not form a cycle |
| `units` | One counter each. See below |
| `events` | Reinforcements, supply arrivals and conditions. Reserved; not read until Stage 4 |
| `objectives` | Hexes a side must hold. See below |
| `victory` | Optional. `lastTurn` and `otherwise`. See below. Without it the scenario has no time limit |
| `provenance` | `status`, `sources[]` (`title`, `url`, `reuse`) and `notes[]`. Records map georeferencing, reuse terms and open questions |

## `map`

| Field | Meaning |
| --- | --- |
| `geo` | `crs` (a metric CRS such as an EPSG code), `origin` (projected coordinate of hex `[0,0]`, or `null` when synthetic), `orientation`, `hexSpacingMeters` |
| `cols`, `rows` | Grid size |
| `terrainLegend` | One character per terrain: `clear`, `polder`, `woods`, `town`, `water` |
| `terrain` | `rows` strings of `cols` characters each |
| `elevationStepMeters`, `elevation` | Same shape as `terrain`. Each digit × step = metres |
| `rivers` | `id`, `name`, `kind` (`major` or `stream`), and `edges`: pairs of adjacent hexes `[[c,r],[c,r]]` with the river between them |
| `bridges` | `id`, `name`, `edge`: a river edge the bridge crosses |
| `roads` | `id`, `name`, `kind` (`main` or `secondary`), and `hexes`: a chain of adjacent hexes |
| `places` | `name`, `kind` (`town`, `village` or `feature`), `at` |

Validation rules for the map:

- Every river edge joins two adjacent map hexes.
- Each river's edges form one continuous chain.
- Each loose end of a major river reaches the map edge or water.
- Bridges sit on river edges and touch no water.
- Roads are continuous and do not run onto water.
- A road crosses a major river only at a bridge. Fording a stream gives a warning, not an error.

## `objectives` and `victory`

Victory is checked only at turn boundaries.

| Field | Meaning |
| --- | --- |
| `id`, `name`, `description` | Identification. Players see the name and description |
| `side` | The side that must achieve it |
| `kind` | `hold` (the only kind so far) |
| `hexes` | The side must control **every** one of these hexes |
| `holdTurns` | How many consecutive turn ends the side must control all of them |
| `initialControl` | `allied`, `german` or `null`: who controls the hexes at the start |
| `victory.lastTurn` | The match ends once this turn has resolved |
| `victory.otherwise` | The winner if no objective has been met by then, or `null` for a draw |

Control rules:

- A hex is controlled by the last side with a unit standing in it at the end of a turn. Passing
  through during a turn does not change control.
- Control is public. Both players see who holds each objective hex.

How the result is decided:

- A side with no units left loses. If both sides are left with no units, it is a draw.
- A side wins when one of its objectives reaches its holding count.
- If both sides meet an objective at the same turn end, it is a draw.

Validation rules:

- Objective ids are unique.
- Hexes are on the map and not water, with no duplicates.
- `holdTurns` is at least 1.
- Objectives that share a hex agree on its `initialControl`.
- An objective that needs more turns than `lastTurn` gives a warning.
- Objectives without a `victory` block give a warning.

The Stage 3 objective in the synthetic scenario is a placeholder for testing the match flow. The
Allied side must hold Northton `[10,5]` and the north end of the bridge `[10,6]` for 2 turn ends,
by the end of turn 8. Otherwise the German side wins.

## `units`

| Field | Meaning |
| --- | --- |
| `id`, `side` | `side` is `allied` or `german` |
| `name`, `shortName` | Full name for panels; short label for the counter |
| `formationId` | Must exist and be on the same side |
| `type` | `infantry`, `airborne-infantry`, `armour`, `recon`, `anti-tank`, `artillery`, `engineer`, `headquarters` |
| `movementClass` | `foot`, `wheeled` or `tracked`. Selects the movement cost row |
| `at` | Starting hex. Must be passable for the movement class. One counter per hex |
| `personnel` | Non-negative integer. Use **battlefield** strength where known, not establishment strength |
| `equipment` | `{ equipmentId: count }`. Ids must exist in the catalogue |
| `cohesion` | 0-100 |
| `supply` | `supplied`, `low` or `exhausted` |
| `dataStatus` | Anything not `verified` is shown as provisional or placeholder in the interface |
