# The Market Garden campaign

The third historical scenario joins the other two. It runs from 15:00 on 17 September to
21:00 on 20 September 1944: 39 two-hour turns on one map from Grave to Arnhem. The Nijmegen and
Arnhem scenarios stay as they were and can still be played on their own. Everything is
**provisional**. The research behind it is:

- [research](research) and [research-arnhem](research-arnhem), as for the separate scenarios;
- [research/sept-17-18.md](research/sept-17-18.md): the Nijmegen sector on 17 and 18 September;
- [research-arnhem/sept-19-20.md](research-arnhem/sept-19-20.md): the Arnhem sector on 19 and
  20 September.

## The map

- **Window:** global hexes columns 2023-2052, rows 2734-2791 (30 × 58). It is built by
  [`combine-maps.ts`](../tools/map-builder/combine-maps.ts) from the two generated maps, so its
  terrain, elevation, rivers, bridges, roads and places are theirs hex for hex. Rows 0-25 are the
  Arnhem map; rows 26-57 are the Nijmegen map, 26 rows down.
  - Rebuild it with `npm run build:map:campaign`, after either part has been rebuilt.
  - The relief for the 3D view is fetched again over the whole window.
- **What the join adds:**
  - **The Nederrijn is traced again over the whole window.** Its OpenStreetMap line now carries on
    as the Pannerdensch Kanaal to the Waal. Each part only had the edges between its own hexes,
    so on the separate maps the Rhine stopped at the seam. Now the Betuwe, between Arnhem and
    Nijmegen, is an island again: from the east you get into it only over a river.
  - **The Pannerden ferry** crosses the canal where the Bemmel road meets it, for foot and wheeled
    traffic. Euling, Baumgärtel and Reinhold crossed there on 18 September.
  - **The Arnhem-Elst-Nijmegen main road** is one road across the seam.
  - **The assault-boat crossing of the Waal** opens on turn 37 (15:00 on 20 September). It was
    turn 14 of the Nijmegen scenario.
- **What it leaves out.** The Arnhem scenario's German supply source on the Elst road is dropped,
  because Elst is now on the map. South-bank units at Arnhem draw supply through the Betuwe from
  the Pannerden ferry road.

## The clock and the turns

- **Clock:** Allied "A" time (GMT+1) throughout. Turn 1 is 15:00 on 17 September, as in Arnhem.
- **Nijmegen events move 22 turns later.** The Nijmegen scenario starts at 12:00 on 19 September,
  halfway through campaign turn 23. Its turn *n* event comes on campaign turn *n* + 22, an hour
  earlier on the clock. The exceptions follow the research's timings
  ([sept-17-18.md](research/sept-17-18.md) 8.3):
  - the 19 September drop, turn 25;
  - KG Budde, turn 37;
  - the Frundsberg assault guns, turn 38;
  - the 20 September drop, turn 38;
  - the corridor supply from Uden, from turn 32.
- **Nights:** 17/18, 18/19 and 19/20 September are all played. It is dark from about 19:20 to
  05:40.

## The opening, turn 1

- **Arnhem:** exactly the Arnhem scenario's start.
- **Nijmegen sector, Allied:** the 82nd Airborne's first lift is down and its nine parachute
  battalions are moving off their zones:
  - the 504th from DZ O at Overasselt, for the Grave bridge and the canal bridges;
  - the 505th through Groesbeek, toward Mook;
  - the 508th on DZ T, below the Groesbeek heights.

  The 376th's pack howitzers are at Colonjes and Battery A of the 80th AA (AT) Battalion is by
  LZ N. Detached companies, such as E/504 south of the Maas and D/508 on LZ T, are folded into
  their battalions.
- **Nijmegen sector, German:** only Henke's weak garrison: the mixed battalion at the station,
  the fort, and the flak on both banks. With it are small local garrisons at Grave, the
  Honinghutje bridge and Mook, and Schwappacher's guns at Oosterhout.
- **Bridges:** the Malden and Hatert canal bridges are not on the map (both were blown on
  17 September), and neither is the Mook railway bridge. The engine has no demolitions, so the
  Grave, Heumen and Honinghutje bridges stand unless they are taken.

## Arrivals

**17-18 September, Nijmegen sector**

| Turn | Time | Side | What |
| --- | --- | --- | --- |
| 3 | 19:00 17 Sep | German | Ersatz-Btl. 6 (Henke), from Kleve |
| 8 | 05:00 18 Sep | German | Korps Feldt's attack on the landing zones: 406th Division groups from Wyler, the Reichswald and Gennep, with von Fürstenberg's half-tracks; Baumgärtel's SS pioneers at the Pannerden ferry road |
| 9 | 07:00 | German | Euling, over the Pannerden ferry; Feldt's 152 mm guns |
| 11 | 11:00 | German | Reinhold |
| 12 | 13:00 | German | A 10th SS battery |
| 13 | 15:00 | Allied | The 82nd's glider lift: the 319th, 320th and 456th FA Battalions and Battery B of the 80th |
| 14 | 17:00 | Allied | The B-24 supply drop on DZ N (+24 reserves; about 80% of 258 tons recovered) |
| 18 | 01:00 19 Sep | German | Inf.Btl. 526 |
| 21 | 07:00 | Allied | The Household Cavalry from Uden: XXX Corps arrives |
| 22 | 09:00 | Allied | The Grenadier Guards group |

**19-20 September, Arnhem sector** (from turn 23 the Nijmegen scenario's own events follow too)

| Turn | Time | Side | What |
| --- | --- | --- | --- |
| 21 | 07:00 19 Sep | German | StuG-Brigade 280; KG Knoche and Pz.Kp. 224's French tanks from Ede; Flak-Brigade Swoboda |
| 23 | 11:00 | German | Krafft's naval and police troops |
| 25 | 15:00 | Allied | The Polish anti-tank detachment on LZ L |
| 26 | 17:00 | Allied | The 19 Sep drop on SDP V, held by the Germans (+8, denied if a German holds the point) |
| 27 | 19:00 | German | The first two Tigers of s.Pz.Kp. Hummel |
| 29 | 23:00 | German | Btl. Wossowski |
| 31 | 03:00 20 Sep | German | KG Bruhn |
| 33 | 07:00 | German | The rest of Hummel's Tigers |
| 37, 38 | 13:00, 15:00 | Allied | The 20 Sep drops on the Hartenstein (+6, +8) |
| 39 | 19:00 | German | III./SS-Gren.Rgt. 1 "Landstorm Nederland" |

**Supply:**
- **The Arnhem division** draws on LZ Z until turn 22, then only on the Hartenstein (from
  turn 13): it left the landing zones on 19 September.
- **The 82nd** has no supply source, as in the Nijmegen scenario. It lives on its reserves and the
  drops until the corridor road from Uden opens on turn 32.

## Victory

- **Allied:** hold both ends of the **Grave, Heumen, Nijmegen and Arnhem road bridges** at once,
  at the end of turn 21 or later, with a supplied unit on one of them. That is the corridor of
  the plan, open from the Maas to the Rhine. Counting only from turn 21, when XXX Corps can
  arrive, stops the airborne divisions winning alone by seizing the big bridges early.
- **German:**
  - hold both ends of the **Grave bridge** at the end of turn 21 or later; or
  - hold both ends of the **Heumen lock bridge** at the end of turn 23 or later.

  Either way the corridor cannot cross the Maas or the canal.
- **Otherwise** the German side wins after turn 39. That is the historical result: at 21:00 on
  20 September the Allies held Grave, Heumen and the whole Waal crossing, but at Arnhem only part
  of the north end of the bridge, which German armour was already crossing.
- **Not modelled:** demolitions; the flak's effect on the drops (only a quarter of Swoboda's guns
  appear, in the ground role); the wireless failures; weather; air strikes.

## Decisions made without the research settling them

- **Euling** enters on turn 9, as the research says. On foot he reaches the bridge in about two
  turns, so he is there at about 11:00, as in 1944.
- **Korps Feldt's groups** enter at the research's 18 September strengths (about 600, 600 and
  500) and let play decide their losses, rather than being scripted down to the Nijmegen
  scenario's 19 September strengths.
- **Gräbner** is the Arnhem scenario's counter at Hoenderloo. Whether he drives south to Nijmegen
  and back, as on 17-18 September, is the German player's choice. No separate counter is left at
  the Waal bridge.
- **New equipment:**
  - the **Tiger I**, under a new heavy-tank class (rules 0.8.0: fire 7 against infantry and 14
    against vehicles, 3 hexes);
  - **captured French tanks**, rated as light tanks and shown as a Char B1 bis.

  Both have 3D models and Gun Park entries.
- **The Poles** are their own formation under I Airborne Corps, with British markings.

## Scripted games

Crude scripted plans, played through the real engine for all 39 turns, as for the other
scenarios. They use the same re-ordering rules as the Arnhem scripts (see
[arnhem-notes.md](arnhem-notes.md)).

**The Allied plans**

- **Historical:**
  - Arnhem as in the Arnhem scripts;
  - the 504th takes the Grave and Heumen bridges;
  - 1/508 goes for the Nijmegen bridge from 21:00 on the 17th;
  - XXX Corps attacks along the corridor bridge by bridge.
- **Rush:** the same, but all three 508th battalions go for the Nijmegen bridge at once, and the
  bridge parties at Arnhem go straight for its north end.
- **Passive:** the Allies only defend.

**The German plans**

- **Historical:**
  - Arnhem as in the Arnhem scripts, then the new arrivals attack the Hartenstein, with the
    Tigers at the bridge;
  - Euling and the pioneers go to the south end of the Waal bridge, Reinhold to Lent;
  - Feldt attacks the landing zones until turn 12;
  - the 20 September Kampfgruppen attack Groesbeek.
- **Corridor:** the same at Arnhem, but everything in the Nijmegen sector attacks the Heumen
  bridge.
- **Passive:** the Germans only defend.

**Results**

| Allied plan | German plan | Result | Corridor at the end |
| --- | --- | --- | --- |
| Historical | Historical | German on time | Grave and Heumen Allied; the Nijmegen bridge's south end Allied, north end German; Arnhem German |
| Historical | Corridor | German on time | Grave and Heumen Allied; Nijmegen and Arnhem German |
| Historical | Passive | **Allied victory on turn 30** | All Allied |
| Rush | Historical | German on time | Grave, Heumen and Nijmegen Allied; Arnhem German |
| Rush | Corridor | German on time | Grave, Heumen and Nijmegen Allied; Arnhem German |
| Rush | Passive | German on time | All but the Arnhem bridge's south end |
| Passive | any | German victory on turn 21 (Grave) | — |

The corridor objective can be reached, and against a defending German player the scripts end
close to the historical result. The scripts cannot flank, use boats or co-ordinate across
sectors, so they understate both sides. Balance needs the two of you playing it.
