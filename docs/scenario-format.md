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
| `equipment` | Catalogue: `id`, `name`, `role`, `researchStatus`, `sources[]` |
| `formations` | `id`, `side`, `name`, `parentId` (or `null`), `dataStatus`. Parents must exist, be on the same side, and not form a cycle |
| `units` | One counter each. See below |
| `events` | Reinforcements, supply arrivals and conditions. Reserved; not read until Stage 4 |
| `objectives` | Victory conditions. Reserved; not read until Stage 3 |
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
