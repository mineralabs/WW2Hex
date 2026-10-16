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
| `dataStatus` | `synthetic`, `provisional` or `verified`. `verified` is rejected while any unit, formation, equipment entry, event or supply source is not verified, or while `provenance.sources` is empty |
| `start` | `{ day, minuteOfDay }` at the start of turn 1. Optional `date` (ISO, such as `"1944-09-19"`, whose day must match `day`) and `utcOffsetMinutes` (the clock the scenario's times are in) let the 3D view place the sun |
| `map` | See below |
| `equipment` | Catalogue: `id`, `name`, `role`, `combatClass`, `researchStatus`, `sources[]`. Historical facts and sources go here. `combatClass` names a weapon profile in the rules, such as `rifle-section` or `medium-tank`. The game numbers live in that profile, never in the catalogue |
| `formations` | `id`, `side`, `name`, `parentId` (or `null`), `dataStatus`. Optional `nation` (`us`, `uk` or `de`: counter colours) and `badge` (up to four characters shown on its counters), both inherited by child formations and units. Parents must exist, be on the same side, and not form a cycle |
| `units` | One counter each. See below |
| `events` | Reinforcements and airborne supply drops. See below |
| `supplySources` | Optional. Where each side's supply comes from. A side with none is always in supply. See below |
| `objectives` | Hexes a side must hold. See below |
| `victory` | Optional. `lastTurn` and `otherwise`. See below. Without it the scenario has no time limit |
| `provenance` | `status`, `sources[]` (`title`, `url`, `reuse`) and `notes[]`. Records map georeferencing, reuse terms and open questions |

## `map`

| Field | Meaning |
| --- | --- |
| `geo` | `crs` (a metric CRS such as an EPSG code), `origin` (projected coordinate of hex `[0,0]`, or `null` when synthetic), `orientation`, `hexSpacingMeters`. Optional `grid`: `id`, `col`, `row`, where hex `[0,0]` sits in a shared grid such as the Europe grid, so maps of neighbouring areas line up. Optional `centre`: the map centre's `lat` and `lon`, for the sun |
| `cols`, `rows` | Grid size |
| `terrainLegend` | One character per terrain: `clear`, `polder`, `woods`, `town`, `water` |
| `terrain` | `rows` strings of `cols` characters each |
| `elevationStepMeters`, `elevation` | Same shape as `terrain`. Each digit × step = metres |
| `rivers` | `id`, `name`, `kind` (`major` or `stream`), and `edges`: pairs of adjacent hexes `[[c,r],[c,r]]` with the river between them |
| `bridges` | `id`, `name`, `edge`: a river edge the bridge crosses. Optional: `movementClasses` (who can use it, e.g. `["foot"]` for a railway or damaged bridge; default all), `side` (only that side may use it, such as an assault-boat crossing; the other side's players are not sent it), `fromTurn` (usable from that turn) |
| `roads` | `id`, `name`, `kind` (`main` or `secondary`), and `hexes`: a chain of adjacent hexes |
| `places` | `name`, `kind` (`town`, `village` or `feature`), `at` |
| `relief` | Optional fine terrain for the 3D view; the rules never read it. `source`, `crs`, `origin` (projected position of the north-west sample), `spacingMeters`, `cols`, `rows`, `metresPerUnit`, and `heights`: `cols` × `rows` little-endian 16-bit signed integers, row by row from the north, in base64 |

Validation rules for the map:

- Every river edge joins two adjacent map hexes.
- Each river's edges form one continuous chain.
- Each loose end of a major river reaches the map edge, water, or another river (a canal joining a river).
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
| `requireSupply` | Optional. A supplied bridgehead: at each of those turn ends, a unit of the side standing on one of the hexes must also have a supply route |
| `fromTurn` | Optional. Turn ends count only from the end of this turn (default 1), for an objective that matters only once, say, the ground forces can arrive |
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
| `reserves` | Optional, 0-100. Starting reserves. If left out: supplied 100, low 40, exhausted 10 |
| `dataStatus` | Anything not `verified` is shown as provisional or placeholder in the interface |
| `note` | Optional. Where the data comes from and how sure it is |

## `events`

Each event has `id` (unique), `kind`, `side`, `turn`, `dataStatus` and an optional `note`.

| Kind | Further fields | Effect |
| --- | --- | --- |
| `reinforcement` | `entry`: candidate hexes in order of preference; `units`: as in `units`, without `at` and `side` | At the start of `turn`, each unit enters at the first free entry hex it can enter. If none is free it waits and arrives as soon as one clears. Its own side sees it in advance; the other side does not |
| `supply-drop` | `at`, `radius` (hexes), `amount` (reserve points, 1-100) | At the start of `turn`, every unit of `side` within `radius` of `at` gains `amount` reserves, unless an enemy unit holds `at` |

Validation: event ids are unique; turns are at least 1 (a turn after `victory.lastTurn` gives a
warning); reinforcement units are checked like starting units, and at least one entry hex must
be passable for each.

## `supplySources`

`id`, `name`, `side`, `at`, `range` (minutes of wheeled travel), optional `fromTurn` and `toTurn` (the first and last turns it supplies),
optional `toward` (the place the road leads to off the map, shown as a sign at the map edge, e.g.
`"Kleve"`), `dataStatus` and `note`. Supply routes are traced from these; see
[combat-rules.md](combat-rules.md#supply-and-reserves). Each side's players are sent only their
own side's sources, and only their own side's supply drops, which their map shows as drop zones.

## Building a historical scenario

The Nijmegen scenario is not written by hand. It is assembled from research by two scripts:

```sh
npm run build:map       # scenarios/nijmegen-1944/source/map-config.json -> map.generated.json
npm run build:scenario  # map.generated.json + scenario.source.json -> scenarios/nijmegen-1944/scenario.json
```

- **`map-config.json`** sets which part of the Europe grid the map covers (`grid`: the global
  `col` and `row` of its hex `[0,0]`, which must be an even row, and its `cols` and `rows`), the
  spacing of the 3D relief (`reliefSpacingMeters`), and lists the 1944 features:
  settlements with their built-up radius, bridges, roads as chains of points, and named
  features. Each entry carries a `source` note.
- **`build-map.ts`** downloads the open data it needs and caches it in
  `tools/map-builder/.cache`:
  - elevation (EU-DEM);
  - fine relief for the 3D view (Copernicus DEM GLO-30, read from AWS open data);
  - rivers and canals (OpenStreetMap);
  - woodland, from the 1938-42 forest survey in the Netherlands and OpenStreetMap in Germany.

  It then classifies each hex and places rivers on hex edges, giving each river one continuous
  line. Bridges snap to the nearest river edge, and roads follow the hexes nearest the straight
  line between their points, crossing major rivers only at bridges.
- **`scenario.source.json`** holds everything else, with positions as the latitude and longitude
  from the research. **`build-scenario.ts`** converts them to hexes. If a unit's hex is taken or
  impassable, it moves to the nearest hex the unit could reach, and every such move is reported.
  The script then validates the result.
