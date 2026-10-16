# The Arnhem scenario

The second historical scenario, and the first built on the Europe grid from the start. It covers
the 1st British Airborne Division from 15:00 on 17 September to 21:00 on 18 September 1944: the
march on the road bridge, the fight for it, the blocking lines in western Arnhem and round
Oosterbeek, and the second lift. Everything is **provisional**: the research is in
[research-arnhem](research-arnhem), with every conflict and open question.

## The map

- **Window:** global hexes columns 2023-2052, rows 2734-2759 (30 × 26). It uses the same columns
  as Nijmegen and ends where Nijmegen begins, so the two join into one 30 × 58 strip of the Market
  Garden ground, hex edge for hex edge. It runs from Ede and Wageningen in the west to Velp,
  Westervoort and the IJssel in the east, and from Hoenderloo and Deelen in the north to the
  Betuwe polder south of the Rhine.
- **Crossings:** the Arnhem road bridge (intact, open to all); the Heveadorp-Driel ferry (foot and
  wheeled); the Westervoort IJssel bridges. Left out: the Oosterbeek railway bridge, blown on
  17 September as 2 Para's C Company stepped onto it, and the Arnhem pontoon bridge, whose middle
  section had been removed.
- **The river at 1 km.** In central Arnhem the Rhine runs through the hexes, and each hex goes to
  the bank its centre lies on. Two consequences, both handled:
  - The road bridge joins two hexes side by side ((17,20) and (18,20)); the **north-bank end is
    (18,20)**, and the German bridge guard starts there.
  - The St Elisabeth Hospital's true position falls in a hex whose centre is just south of the
    river, so its label and the objective use the north-bank hex east of it, (16,18), on the
    Utrechtseweg towards the bridge.
  - The riverside route 2 Para took in 1944 (LION) and the Utrechtseweg share one corridor of
    hexes through Den Brink and the hospital.

## The scenario

- **Start at 15:00.** The first lift landed from 13:00 to 14:10, and the battalions moved off
  from their rendezvous at about 15:00. Starting then keeps 2 Para from reaching western Arnhem
  in the first turn; the landings themselves are not played.
- **Clock:** Allied "A" time (GMT+1), the clock of the Allied orders and diaries. German-clock times
  were moved an hour earlier. Sunset is about 18:42 and it is night from about 19:21 to 05:42.
- **Second lift on turn 12** (13:00 on 18 September), the turn the research gives for its
  14:00-15:15 arrival after the fog delay. The 18 September resupply lands on DZ X on turn 14 (the
  Division HQ log's position; Pegasus gives LZ L), worth +8 reserves: about 14% of 87 tons was
  collected.
- **Allied supply:** from the divisional area on LZ Z, and the Hartenstein from turn 13, so units
  that are cut off, at the bridge especially, live on what they carry.
- **German supply:** the Apeldoorn, Velp-Zutphen, Zevenaar, Ede and Wageningen roads and the Elst
  road on the south bank. Division von Tettau drew only on the west in 1944; the engine traces
  supply per side, not per formation, so that limit is not modelled.
- **Victory:** the Allies win by holding the north end of the bridge and the Utrechtseweg hex
  east of the hospital at four turn ends in a row with a supplied unit (the bridge plus a link
  with the division), or both ends of the bridge at two turn ends in a row (the plan's
  objective). Otherwise the Germans win at the end of turn 15. Historically the Allies held the
  north end but never linked up or reached the south end: a German win, close to the "marginal
  Allied loss" the Allied research describes.
- **Not modelled:** the wireless failures and Urquhart's absence, the ammunition depletion beyond
  the general supply rules, weather on the second lift, and the strafing of the zones.

## Scripted games

Crude scripted plans through the real engine, as for Nijmegen. Each unit is re-ordered when it
is idle, when it has taken one step of its plan and sits on Defend short of its target, or when its
attack is blocked by an enemy in the way, which it then attacks.

| Allied plan | German plan | Result |
| --- | --- | --- |
| Historical: 2 Para for the bridge, 1 and 3 Para for the hospital, the airlanding brigade on the zones, the second lift into the town | Historical: Krafft holds at Wolfheze, Spindler's groups form the western line, Brinkmann, Knaust and Mielke at the bridge, Tettau on the zones | German on time. The Allies take the hospital hex; 2 Para loses the race for the bridge to Brinkmann, who is beside it by 21:00 |
| Historical | Passive | **Allied victory on turn 6** |
| Historical | Everything at the bridge | German on time |
| Aggressive: everything for the bridge and the hospital | Historical | German on time |
| Aggressive | Passive | **Allied victory on turn 5** |
| Aggressive | Everything at the bridge | German on time; the naval companies hold the north end |
| Passive | any | German on time |

The objective is reachable and the German player has to defend it. The scripts cannot flank or
use the bridge's eastern approach, so they understate the Allied side; balance needs the two of
you playing it.
