# Stage 4 implementation notes

This records what Stage 4, the historical Nijmegen slice, added and the decisions made along the
way. Every number is a provisional playtest value (`rulesVersion 0.6.0-provisional`). The research
behind the scenario is in [research/](research/).

## Completion check

The brief's check for Stage 4: scenario validation passes, uncertain data is labelled, and both
sides have plausible decisions.

| Check | Status |
| --- | --- |
| Scenario validation passes | **Done.** `scenarios/nijmegen-1944/scenario.json` loads with no errors. The one warning is correct: the Gennep road fords the Niers. Covered by `packages/engine/test/nijmegen.test.ts` |
| Uncertain data is labelled | **Done, partly by necessity.** Everything is `provisional`: the scenario, every unit, formation, equipment item, event and supply source. Each unit's `note` names the research file and section it comes from. No value is marked `verified`, because nothing has yet been checked against Margry, Kershaw or the war diaries. The test enforces both |
| Both sides have plausible decisions | **Done in scripted games; not yet in human play.** Scripted plans give different results depending on what each side does (table below). The real test is the two of you playing it |

Scripted games, run on the final data:

| Allied plan | German plan | Result |
| --- | --- | --- |
| Careful: Grenadiers and 2/505 wear down Hunner Park; 3/504 and 1/504 cross by boat on 20 Sep under artillery cover; Oosterhout counter-shelled | Historical: hold the bridges; Kampfgruppen Hermann and Becker attack Heumen and Beek on 20 Sep | **Allied victory on turn 15**, with the bridgehead held and supplied |
| Careful | Everything thrown at the Heumen corridor | **German victory on time**; the corridor fight draws the Allies off |
| A cruder version of the historical plan | Historical | German victory on time; 3/504 is lost on the far bank |
| Passive | Everything at Heumen | **German victory on turn 12**; corridor cut |
| Passive | Passive | German victory on time |

These are crude scripts, not players. They show the outcome depends on choices, and that the
historical plan can work but is not guaranteed. Balance needs real playtesting (Stage 5).

## The scenario

- **Window:** 12:00 on 19 September to 20:00 on 20 September 1944, which is 16 two-hour turns. It
  covers the first attack into Nijmegen, the night, the German attacks from the Reichswald, the
  Waal crossing, and the capture of the bridges at about 19:10 on the 20th.
- **Allied side:** the US 82nd Airborne Division (nine parachute battalions, four artillery
  battalions, engineers) and the Grenadier Guards group on the map. Coming up the corridor: the
  Coldstream, Irish and Welsh groups, divisional artillery, an anti-tank detachment, and the
  Sherwood Rangers on 20 September.
- **German side:** the Nijmegen garrison (Kampfgruppen Euling and Henke, flak at the bridges),
  Kampfgruppe Reinhold and the SS artillery north of the Waal, and the 406th Division facing the
  Groesbeek heights. In the night: Kampfgruppen Becker, Greschick and Hermann from the
  Reichswald. A StuG reaches Lent on the evening of the 20th.
- **Allied objective:** hold both ends of the Waal road bridge at a turn end, with a supplied unit
  there: the brief's "supplied bridgehead".
- **German objective:** hold both ends of the Heumen lock bridge, the corridor's only canal
  crossing for tanks. Otherwise the German side wins by denial at the end.

## What was added

| Area | Where |
| --- | --- |
| Supply: reserves, traced supply routes, timed supply sources, airborne drops | `packages/engine/src/logistics.ts` |
| Reinforcements: scheduled arrivals at entry hexes, known only to their own side | `logistics.ts`, `scenario.ts`, views |
| Crossings limited by movement class, side and turn (railway bridge, assault boats) | `map.ts`, `pathfinding.ts` |
| A supplied-bridgehead objective option | `objectives.ts` |
| Canals and tributaries may end at another river | `validate.ts` |
| Ten new weapon profiles, longer artillery ranges | `rules.ts` |
| Map builder: RD New grid, EU-DEM, OSM rivers, the 1938-42 forest survey, 1944 towns, bridges and roads | `tools/map-builder/` |
| Scenario builder: researched lat/lon to hexes, with reported moves, then validation | `tools/map-builder/build-scenario.ts` |
| The Nijmegen scenario and its sources | `scenarios/nijmegen-1944/` |
| Client: reserves and supply route in the unit panel, a reinforcements panel, crossing details, boat crossings drawn dashed | `apps/client/src` |
| Research notes with sources | `docs/research/` |

## Decisions and defaults

**The map**

- **Grid:** 30 × 31 hexes of 1 km in RD New (EPSG:28992), from x 174 000 and y 437 500 (the centre
  of hex [0,0]). It runs from Grave to the Reichswald heights and from Gennep to Elst, as the
  geography research recommended.
- **Woods** in the Netherlands come from the 1938-42 national forest survey (RCE
  "Bosstatistiek"), read off its colours. In Germany, which the survey does not cover, they come
  from OpenStreetMap. Modern data put woods east of Groesbeek; in 1938-42 that was farmland, and
  in 1944 it was the 82nd's landing zones.
- **Polder** is low ground. The height limit is 10.5 m at the west edge and rises 0.1 m per km
  eastward with the river plain. That makes the Betuwe, the Ooijpolder and the Maas plain
  polder, which matches the research ("flat, waterlogged terrain, nearly impassable for
  tanks").
- **Towns** come from the 1944 built-up extents in the research, never from modern data. That
  excludes Dukenburg, Lindenholt and the Waalsprong. Villages are a single town hex.
- **Rivers** come from OpenStreetMap centre lines, each turned into one continuous line, so twin
  channels and lock chambers collapse. The canal and the Niers are joined to the rivers they
  meet.
- **Bridges** are only those usable in 1944:
  - Grave and Heumen: intact, everyone.
  - The Waal road bridge: everyone.
  - The Waal railway bridge: infantry only.
  - Honinghutje: damaged, no tanks.
  - Malden, Hatert and the Mook railway bridge were blown, so they are left out.
- **The assault-boat crossing** is an Allied-only, foot-only crossing near the power station from
  turn 14 (14:00 on 20 September), when the boats arrived. German players are not sent it.
- **Roads** are the 1944 roads in the research, drawn through anchor points, including the route
  XXX Corps actually took via Overasselt and the Heumen lock bridge.

**The forces**

- **Position:** each unit is placed at the latitude and longitude the research gives. Where two
  units fall in one hex, the build moves one to the nearest reachable hex and says so.
- **Kampfgruppe Euling** includes the SS pioneers and the four disputed armoured vehicles at Hunner
  Park. They were all in one 1 km hex.
- **The 80th Airborne AA Battalion's 57 mm guns** are attached to the battalions they supported.
- **Estimates:** strengths are estimates wherever the research found none, and each note says
  so. Guards units use establishment figures less known losses.
- **Arrival times** without a source are assumptions, and are noted: Coldstream at 16:00 on
  19 September, Welsh at 22:00, Sherwood Rangers at 08:00 on 20 September, and the German night
  arrivals at 04:00.
- **Left out because they arrive after 20:00 on 20 September:** the Panzer IVs ferried at
  Pannerden, SS-Panzergrenadier-Regiment 22, the 325th Glider Infantry and the 43rd Division.
  Kampfgruppe Knaust (disputed timing) and the unknown Kampfgruppen Molzer and Lewin are also
  left out.

**Supply**

- **The 82nd starts at 60% reserves.** It was critically short, but its 18 September drop
  recovered about 80% of 258 tons.
- **Allied road supply** starts at 06:00 on 20 September (turn 10). Nothing reached the 82nd by
  road before then. British units carry their own reserves.
- **Air drops:** a small one at 16:00 on 19 September (about 20% recovered), and a large one at
  18:00 on 20 September (441 tons, about 60% recovered), both on DZ O.
- **German supply** comes from three places:
  - the Kleve road;
  - the Pannerden ferry road;
  - Gennep.

  The Nijmegen garrison is supplied over the road bridge from Lent, so taking the bridge's north
  end cuts it off.

**Rules changes (0.5.0 and 0.6.0)**

These came from playing the scenario: the Stage 2 numbers did not survive contact with real-sized
battalions.

- **Supply and reserves (0.5.0).** As the brief describes: reserves decline through movement and
  combat, a cut route stops replenishment, and status is shown as Supplied, Low or Exhausted.
- **Artillery uses reserves three times as fast as direct fire.** Unlimited artillery fire every
  10-minute step was grinding battalions away. The sources say ammunition was the limit on both
  sides ("about 50 rounds a gun", "5 rounds per mission").
- **A third of the damage per fire point (0.6.0), with the remainder carried over.** At the old
  scale, a German battle group destroyed 34 Shermans in two hours, where the real attack on
  19 September lost about four. Small fire still adds up, because each target carries its
  leftover fire to the next step. The four worked examples in `combat-rules.md` were rewritten
  to match.
- **Pinned units at zero cohesion surrender.** A broken unit with nowhere to go used to hold its
  hex for ever, so no defended hex could be taken without killing every man. The research has
  200-300 Germans surrendering on the railway bridge.
- **Artillery ranges follow the guns' real ranges.** At 1 km hexes the old 8-hex field gun could
  not reach Nijmegen from the 82nd's gun lines.

## Where hidden information lives

New since Stage 3, and covered by the network leakage test with the Nijmegen scenario:

- **Each side's coming reinforcements** are in its own view only.
- **Supply sources** in the scenario a player is sent are their own side's only.
- **The other side's limited crossings**, such as the assault boats, are left off a player's map.
- **Events** are never sent: reinforcements appear in views, and drops as observed events for the
  receiving side.

A unit's supply status can tell its player that its route has been cut, but not where or by whom.

## Known limitations

- **Nothing is verified.** The research is careful but secondary. Many sources were read only
  through online copies or quotations, and several important ones (Margry, Kershaw, the
  regimental histories and the WO 171 war diaries) were not read at all. Open questions are
  listed at the end of each research file.
- **Night is not modelled.** Five of the sixteen turns are in darkness, but spotting and movement
  work as in daylight.
- **Railways, dykes and embankments** are not terrain. The Betuwe's raised roads are only roads.
- **Terrain classes are coarse.** The 1938-42 survey could not be read for heath (lilac came out
  too pale) and covers only the Netherlands. The Kadaster "Topotijdreis" 1944 maps would be
  better evidence for towns and land use, but their licence forbids derived works without
  permission, so they were not used.
- **Balance is from scripts, not players.** The first human games will matter more than anything
  here.
- **The map builder needs the network** (Overpass, OpenTopoData, the RCE map service) the first
  time it runs. Downloads are cached, but not committed.

## Stage 5 hand-off

From the brief: formation orders, clear feedback, readable counters and tuned objectives. The
check is that both players can explain outcomes and find more than one credible plan.

Likely first jobs from playing Nijmegen:

1. **Formation orders.** Thirty-odd counters a side is a lot of clicking.
2. **Night:** shorter spotting ranges, and perhaps slower movement.
3. **Balance** from real games: objective timing, Kampfgruppe Euling's strength, artillery.
4. **A research pass** against the sources not yet read, upgrading values to `verified` where they
   hold.
