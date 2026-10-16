# The Europe grid and the 3D view

Every scenario map is a window onto **one hex grid covering all of Europe**. Maps of neighbouring
areas share hex edges, so they can later be joined into larger campaigns without redrawing
anything.

## The grid

- **Projection:** ETRS89 / LAEA Europe (EPSG:3035), the European Environment Agency's
  equal-area reference grid. It covers the whole continent in metres, x east and y north. The
  conversion is in [`tools/map-builder/geo.ts`](../tools/map-builder/geo.ts) and is tested
  against the EPSG worked example.
- **Hexes:** pointy-top, 1 km between centres, "odd-r" offset as the engine expects. Row 0 is
  the northernmost row, rows run south, and odd rows sit half a hex east.
- **Origin:** global hex `[0,0]` is centred at LAEA (2 000 000, 5 600 000), north-west of
  Iceland, so every European hex has positive coordinates. Nijmegen's hex `[0,0]` is global hex
  `[2023, 2760]`.
- **Windows:** a map's `map-config.json` names the global column and row of its hex `[0,0]` and
  its size. The row must be even, or the odd-row shifting would flip. The built map records the
  window in `map.geo.grid`, so the engine can keep working in local coordinates.

A neighbouring scenario picks its own window, and any hex in both maps has the same global
coordinates. For example, Arnhem would be a window a few dozen rows north of Nijmegen's.

## Data sources

| What | Source | Used for |
| --- | --- | --- |
| Hex elevation | EU-DEM 25 m (OpenTopoData API), seven points per hex | Rules: spotting and line of sight |
| Fine relief | Copernicus DEM GLO-30, 1° tiles on AWS open data | The 3D view only |
| Rivers, woods outside the Netherlands | OpenStreetMap (Overpass API) | Terrain and river edges |
| Woods in the Netherlands | The 1938-42 Bosstatistiek, read in the Dutch national grid (RD New) and converted | Terrain |
| Towns, bridges, roads, place names | Hand-researched 1944 features in `map-config.json` | Everything else |

The relief is sampled every 100 m over the window and one hex beyond it, stored as 16-bit
heights in quarter metres, about 230 KB for Nijmegen. GLO-30 is a surface model, so woods and
towns stand slightly proud of the ground. For larger areas, the Copernicus tiles scale to the
whole of Europe; the EU-DEM API used for hex elevations has a daily limit and will need
replacing with the same tiles.

## The 3D view

The **2D / 3D** switch in the game's toolbar changes only how the map is drawn. The 2D renderer
draws the whole board (terrain, roads, routes, counters, effects) into an off-screen picture, and
the 3D view lays that picture over the relief like a map on a sand table. So everything the 2D
view shows also appears in 3D, and a click lands on the hex under the pointer.

- Drag moves the map; Shift+drag or ⌘+drag (or right-drag with a mouse) turns and tilts it; scroll or pinch zooms.
- Right-click without dragging still gives an order; Ctrl+click does the same on a Mac.
- **Relief −/+** in the corner sets the height exaggeration, from ×1 to ×12. Low country needs
  about ×4 to show its hills at all.
- **Pieces:** one button in the corner cycles through three ways of showing units, its icon
  showing the current one:
  - **Miniatures** (the default): low-poly tanks, guns, cars and groups of soldiers built from
    simple shapes in [`models3d.ts`](../apps/client/src/map/models3d.ts), one for each of the 2D
    counter pictures (Sherman, Firefly, Cromwell, Stuart, Panzer IV, StuG, M10, armoured car,
    flak half-track, AT gun, howitzer, 8.8 cm and light flak, infantry, paratroops, engineers,
    HQ). Each stands on a base in its side's colour, with a nameplate showing readiness, name and
    strength, a yellow ring when selected, and faces the way it last moved.
  - **Counter blocks:** the 2D counter as a block, its face drawn by the 2D renderer. Blocks lean
    to face the camera, lying almost flat in the top-down view.

  - **Flat counters:** the 2D counters drawn on the ground picture.

  Pieces glide along their routes in a replay, and clicking one selects its hex.
- **Scenery** (the tree button): miniature trees in every woods hex, conifers more common towards
  the Reichswald, and brick houses with gable roofs in the towns, with a few round each named
  village and a church for every town and village. It is placed from the map's terrain, seeded by
  hex so it never moves, and kept clear of hex centres (where units stand), roads and rivers.
  [`scenery3d.ts`](../apps/client/src/map/scenery3d.ts) draws it with instancing: about 2,600 trees
  and 750 buildings at Nijmegen in 12 draw calls.
- **Time of day** (the sun button): the sun follows the game clock, placed by NOAA's solar
  position formulas from the scenario's `start.date`, `start.utcOffsetMinutes` and the map's
  centre (`map.geo.centre`). At Nijmegen on 19-20 September 1944 (German wartime time, UTC+2) it
  rises about 07:25, is due south at 13:30 and sets about 19:37, so the Guards' bridge crossing at
  19:10 comes in a low, red sun. Shadows lengthen and warm towards dusk, the sky darkens through
  twilight, and the night is lit by a dim blue moon. Off, the board has a fixed afternoon sun.
- **Big maps:** the board picture is drawn at a fixed sharpness (1.6 canvas pixels per map pixel)
  in tiles of at most 4,096 pixels a side ([`tiles.ts`](../apps/client/src/map/tiles.ts)), each on
  its own patch of ground. A Nijmegen-sized map is one tile drawn straight from the board's canvas;
  a corridor-sized map (about 110 × 45 hexes) takes three. For a much larger map, the relief's
  `reliefSpacingMeters` can be raised from 100 m to keep the scenario file small.
- Three.js loads only when a player first switches to 3D.

## The Gun Park

**Gun Park**, in the lobby and the game toolbar, shows every piece of equipment in the scenario
full size on a turntable, built to the real proportions: the artillery, anti-tank guns and flak
in [`ordnance3d.ts`](../apps/client/src/map/ordnance3d.ts), the tanks, tank destroyers and
armoured vehicles in [`vehicles3d.ts`](../apps/client/src/map/vehicles3d.ts) (listed in
[`catalog3d.ts`](../apps/client/src/map/catalog3d.ts)), and the five kinds of soldier in
[`figures3d.ts`](../apps/client/src/map/figures3d.ts), told apart by their helmets: the US M2,
the British Mk II, the German M42 (with a camouflage cover for the Waffen-SS) and the
Fallschirmjäger helmet. Each gun's card gives its real and in-game range and the units that use
it, and each vehicle's weight, crew, gun, armour and speed with the game's rating for it;
**Line-up to scale** sets the group being viewed side by side.

Each model offers the paint schemes of its army ([`paint.ts`](../apps/client/src/map/paint.ts)):
for example dunkelgelb, sprayed or hard-edged three-tone and panzer grey for German guns, or
splinter and marsh-pattern smocks for Fallschirmjäger. Patterns are drawn from 3D noise over the
model's own coordinates, so they run unbroken across every part. A choice is kept in that browser
only and repaints the miniatures on the 3D map at once. It is purely cosmetic and never sent to
the host.

On the 3D map, own units show their real gun and soldiers. Enemy contacts show only what can be
seen: the side's usual field gun and ordinary soldiers (or paratroops, when the contact looks
airborne), never which unit it is.

## Next steps

- **Formation orders:** give a division or regiment one order, as larger maps will need.
