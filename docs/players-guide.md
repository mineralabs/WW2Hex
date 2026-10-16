# Player's guide

How to play WW2Hex, in the order you will meet things. It covers the controls, what each order
does, what the numbers mean, and how units fight, break, recover and run short. The exact
arithmetic, with worked examples, is in [combat-rules.md](combat-rules.md); this guide gives the
rules a player needs. Every number is a provisional playtest value (`rulesVersion
0.6.1-provisional`) and will change with tuning.

The same text, in short form, is behind the **Rules** button in the game's top bar.

## 1. The shape of a game

- **Two players, one on each side.** One player's computer hosts; both play in a browser.
- **A turn is two hours of battle.** Both players plan in secret, then **lock**. When both have
  locked, the host plays the two hours out in twelve ten-minute steps, both sides' orders at
  once. Nobody moves first.
- **You see only what your side sees.** Each player then watches a replay of what their own units
  observed. Enemy units are **contacts**: a position, a rough type, and when they were last seen.
  You never see enemy strength, orders or routes.
- **One unit per hex.** On the Nijmegen map a hex is one kilometre across. Units are battalions
  and companies.
- **The game ends** when a side has held its objective for the required number of turn ends,
  when one side has no units left, or when the last turn is over.

## 2. Controls

| Do | How |
| --- | --- |
| Select a unit or hex | Click it |
| Pan, zoom | Drag; mouse wheel or pinch. **Fit** shows the whole map |
| See the map in relief | **3D** in the toolbar (**2D** goes back). Drag to move; **Shift+drag** (or ⌘+drag, or right-drag with a mouse) to turn and tilt; wheel, two-finger scroll or pinch to zoom; the icons in the corner give set views, all seen from your own side's lines (oblique views of the board and key places, top-down, low, and face the front: north up for the Allies, south up for the Germans), cycle the units between miniatures (little tanks, guns and soldiers), counter blocks and flat counters, and **Gun Park** shows the guns and soldiers close up and lets you choose their paint schemes for the 3D map, and set how much heights are exaggerated. Clicks and orders work as in 2D |
| Choose what a right-click gives | **A** Advance, **T** Attack, **W** Withdraw, or the buttons in the unit panel |
| Give the order | Right-click the destination (on a Mac: two-finger click, or Ctrl+click) |
| A route with turns in it | **Shift**+right-click each waypoint, then a plain right-click on the final destination |
| Order a whole formation | Select a unit, press **F** (or **Whole formation** in the unit panel), then give the order as usual. Every unit of that formation gets it: the nearest takes the hex you clicked, the others the nearest free hexes round it, so they arrive on a front. In an attack the formation's guns bombard the target instead. **D** then puts the whole formation on Defend. Press **F** again to go back to single units |
| Defend in place | **D** |
| Cancel an order | **Hold (no order)** in the unit panel |
| Change your mind | **undo change** in the unit panel, any time before you lock |
| Finish planning | **Lock orders**. Orders can't be changed after locking |
| Replay | **Space** plays or pauses; **←** **→** step; the bar at the bottom has the key moments; **Skip to summary** jumps to the end |
| See a unit's reach | Select it: the ring on the map is how far it can fire; the panel gives the ranges |

An order **stands until it is completed or changed**. A unit with no order holds its ground and
returns fire. You do not have to order every unit every turn.

## 3. Reading a counter

- **Name** and, top-left, a **badge** with the formation's letters in its colour.
- **Picture** of the unit's main equipment, or a map symbol if you switch to **Symbols** in the
  top bar.
- **Bottom line:** men for your own units; a **?** or a time for a contact (when it was last seen).
  During the replay a red number in the corner is the men lost since the start of the turn.
- **Dot, top-right:** readiness. Green is cohesion 70 or more, amber 40 to 69, red below 40.
  A **hollow** dot means supply is Low or Exhausted.
- **Red mark, top-left:** the unit is halted by something in its way.
- **Dashed outline:** a contact that is no longer seen, shown where it was last seen.
- **Colours:** US olive, British khaki, German grey.

Select a unit for the full picture: men and vehicles (against what it started with, and against
the start of this turn), cohesion, supply and reserves, how dug in it is, its ranges, and during
a replay, what it fired at and what fired at it, with the reasons.

## 4. Orders

| Order | Moves? | Fires? | Stops when? | Use it to |
| --- | --- | --- | --- | --- |
| **Advance** | Along the route | Yes, at half strength while moving (most weapons) | When it sees an enemy within 2 hexes, or at the destination | Move up carefully; it will not blunder into the enemy |
| **Attack** | Towards the target, without halting | Yes, and gets the **assault** bonus against the hex it is trying to enter | When the target hex is taken (it then Defends there) | Take a hex. It enters only once the defender has gone |
| **Attack** (artillery) | No | Bombards the chosen hex every step | When you change the order | Shell a hex, seen or not |
| **Withdraw** | Along the route, without halting | **No** | At the destination | Get out, or slip past: it is quiet (see §6) and never stops, but it cannot shoot back |
| **Defend** | No | Yes | – | Hold ground. Digs in up to level 3 |
| **No order** | No | Yes | – | Hold ground. Digs in to level 1 only |

Things to know:

- **Routes avoid your own stopped units, never the enemy.** Plotting a route can tell you nothing
  about hidden enemies, so the planner ignores them. If your route runs into an enemy-held hex,
  the unit stops in front of it. Put the waypoints round them yourself.
- **Columns.** Units on the same road queue. When two want the same hex, the one that has waited
  longest goes first. A moving unit goes round a stopped friend if it can, and passes straight
  through one standing in its way when the route goes on beyond. It cannot pass two stopped
  friends in a row, and nothing passes a stopped friend on a bridge if the bridge is the only way.
  The turn summary tells you who was held up and behind whom.
- **Attack a hex your own side already holds** and the unit switches to Defend when it gets there.
- **Digging in (preparation).** A unit that stays still gains a level every 30 minutes: level 1
  for anything standing still, up to level 3 on Defend. Each level cuts the damage it takes by 15
  percentage points, so a unit at level 3 takes 55% of normal damage. Moving resets it to 0.
- **The unit panel shows the arrival time** "if unopposed": the time the route takes with nobody
  in the way.

## 5. Moving

Minutes to enter one hex:

| | Road | Clear | Town | Polder | Woods | Stream (no bridge) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| On foot | 12 | 15 | 20 | 25 | 25 | +10 |
| Wheeled (lorried infantry, towed guns) | 4 | 15 | 12 | 40 | 45 | cannot |
| Tracked (tanks, Sextons) | 6 | 8 | 15 | 25 | 30 | +20 |

A turn is 120 minutes, so a tank battalion covers 20 road hexes a turn and a marching battalion
10, if nothing is in the way. Off the road, tanks in polder and lorries in woods crawl. **Major
rivers can be crossed only at bridges**, and some crossings take only some traffic: the Waal
railway bridge is for foot troops; the assault-boat crossing opens for the Allies on a set turn
and takes foot troops only.

## 6. Seeing and being seen

A unit sees an enemy when the enemy is **within its spot range** (3 hexes; 4 for reconnaissance),
**within the distance that terrain allows**, and in line of sight.

| Enemy standing in | Clear | Polder | Woods | Town |
| --- | ---: | ---: | ---: | ---: |
| Can be seen from (hexes) | 4 | 4 | 1 | 1 |
| …+1 if it moved this step, +2 if it fired | | | | |

Woods and towns block the view behind them unless the observer is 10 m higher; so does higher
ground between you and the target. Adjacent units always see each other. Your whole side shares
what any unit sees.

**Dusk and night.** The clock shows **Twilight** or **Night** when it is dark. In twilight every
distance above is halved. At night a unit sees only the hexes next to it, except an enemy that
**fires**: its muzzle flash shows out to 3 hexes. At Nijmegen twilight starts at about 18:40 and it is night from about 19:15 to 05:45.

What this means:

- A unit in a **town or wood that has not fired is invisible beyond the next hex**. Expect to
  find defenders by being shot at. Scout with a small unit, or shell the hex blind.
- **Firing gives you away**: a battalion in a town becomes visible from 3 hexes once it opens
  fire. Moving gives away less (+1).
- A **Withdraw** never fires, so a column withdrawing through cover with 3 hexes between it and
  the enemy will often pass unseen.
- A **lost contact stays on your map** at its last-seen time until one of your units looks at the
  hex and finds it empty. An enemy spotted somewhere else appears as a new contact; you cannot
  tell it is the same unit.

## 7. Fighting

Every step, each unit that can fire picks the target it would hurt most and fires. There is no
separate "fire" order. Damage is worked out for both sides at once from the same picture, so
nobody gets a free first shot.

**Ranges.** Infantry fires 1 hex. Tanks, anti-tank guns, armoured cars and light flak fire 2; the
8.8 cm flak fires 3. Direct fire falls off with distance: 100% at 1 hex, 60% at 2, 40% at 3.
Artillery bombards anything its side can see within its range at full effect, or a hex nobody can
see at **half** effect. Ranges are each gun's real maximum, rounded down to whole kilometres: the
US 105 mm M3 7 hexes, the 75 mm pack howitzer 8, the leFH 18 10, the 25-pounder and Sexton 12, the
sFH 18 13 and the captured 152 mm ML-20 17. Guns cannot fire
while moving; infantry and tanks fire at half strength on the move.

**What makes fire stronger or weaker**, in the order the reasons are listed in the game:

| Factor | Effect |
| --- | --- |
| Firer's cohesion | Full fire at 100, half at 0 |
| Firer's supply | Supplied 100%, Low 75%, Exhausted 40% |
| Target's terrain | Clear 100%, polder 90%, woods 60%, **town 50%** |
| Target dug in | −15% per level, so level 3 → 55% |
| Target caught moving in the open (clear or polder) | +25% |
| **Assault**: an Attack firing into the hex it is trying to enter, cohesion 50 or more | **+50%** |
| Assault across a **river**, bridge or no bridge | Major river 60%, stream 80% |
| Bombarding a hex nobody on your side can see | 50% |

**Hard and soft targets.** Tank and armoured-car units are hard targets: anti-tank guns, 8.8s,
Fireflies and StuGs hurt them; rifles barely do. Everything else is soft: infantry, artillery and
tank guns hurt it; anti-tank guns barely do. Three "damage" to a hard target knocks out one
vehicle and its crew.

**Rules of thumb that fall out of the numbers:**

- A battalion dug in at level 3 in a town takes about a quarter of the damage of one standing in
  the open. Frontal assault on it costs the attacker more than the defender. Shell it first, and
  come at it from more than one side.
- An assault over a bridge is no better than plain fire: the river takes back what the assault
  bonus gives. Wear the far end down before going across.
- Tanks moving in the open past an unseen anti-tank position lose vehicles before they see it.
  Scout or shell a town before sending armour past it.
- Artillery is the strongest fire in the game and can reach most of the map, but it runs out of
  shells (§9) and does half damage at hexes nobody can see.

## 8. Cohesion: breaking and recovering

Cohesion (0 to 100) is a unit's steadiness. It changes every step:

| | Cohesion |
| --- | ---: |
| Took any damage | −2 |
| For each whole percent of starting strength lost this step | −2 more |
| Took no damage | **+3**, up to 100 |

- Fire strength is **50% + half the cohesion**: a unit at 60 fires at 80%.
- An Attack needs cohesion **50 or more** for the assault bonus.
- **Below 25 the unit breaks**: its order is cleared and it falls back one hex, away from the
  nearest enemy it knows of. It falls back again only if hit again.
- A broken unit with **nowhere to go is pinned**: it stays, and loses 10 more. A pinned unit worn
  down to 0 **surrenders**.
- A unit **down to 15% of its men or vehicles is destroyed**.

**Recovery.** Cohesion is the only thing that comes back. A unit left alone regains 3 a step, 36
a turn: a battalion that broke at 20 is above 50 after one quiet turn and near full after two.
Men and vehicles never come back; there are no replacements. So a battered unit is worth pulling
out of reach (§6: out of sight, not just out of range), standing on Defend for a turn or two,
and using again, but it will be smaller.

Holding is often better than running: a unit at 40 cohesion and full strength on Defend recovers
just as fast where it stands if nothing hits it, and keeps its dug-in level and its hex. Below
25 it will break anyway, so get it out before that.

## 9. Supply

Each unit carries **reserves** (0 to 100): ammunition, fuel and food.

| | Reserves |
| --- | ---: |
| A step of direct fire | −3 |
| A step of bombardment (artillery) | −9 |
| A step of movement | −1 |
| A step ending with a supply route to the unit | **+6**, up to 100 |
| An air drop within its radius (Allied airborne) | + the drop's amount |

**Supplied** is 50 or more; **Low** is 20 to 49 (fire at 75%); **Exhausted** is below 20 (fire at
40%). The unit panel shows the reserves and whether the route is open.

A **supply route** runs from your side's supply sources (fixed by the scenario; see §12 for
Nijmegen) along roads and across country, and cannot pass through an enemy-held hex or a hex next
to an enemy unless one of your units holds it. So a unit in contact
keeps its own hex supplied, but an enemy astride the road behind it cuts everything beyond. A cut
route bites slowly: the unit goes on fighting on what it carries, and a battalion that fires all
turn uses 36 a turn. Artillery firing all turn uses 108: a battery with no route is empty in two
turns.

Supply is automatic. You cannot move it, only protect the road.

Your map shows your own side's supply: a small arrow and a name (such as *To Kleve*) where each
supply road leaves the map, marked *from turn N* until it opens, and a dashed green zone for each
air drop still to come, captioned with its turn, time and amount. The other side's roads and drops
are never shown to you.

## 10. Objectives and winning

- An objective is one or more hexes a side must **hold at the end of a turn**: a unit of that
  side must be standing in each hex when the turn ends. Passing through during the turn captures
  nothing. Control is public; both players see who holds each hex.
- Some objectives also need the holding unit to be **in supply** (the Nijmegen bridgehead does).
- A side wins at the end of the turn in which it has held its objective for the required number
  of consecutive turn ends. If both sides manage it on the same turn, it is a draw.
- A side with no units left loses. After the last turn, the scenario says who wins by default.

## 11. Reinforcements and scripted events

Reinforcements arrive at the **start of a turn** at the first free hex of their listed entry
points; if all are occupied they wait and you are told. The Reinforcements panel lists your own
side's arrivals, turn and place. You learn nothing of the enemy's until you see them. Scenarios
may also open a crossing or a supply source on a set turn, or drop supplies on the airborne.

## 12. Nijmegen in brief

12:00 on 19 September to 20:00 on 20 September 1944: sixteen turns.

- **Allied:** seize the Waal road bridge and hold **both ends** at the end of a turn with a unit
  there that has a supply route. The 82nd Airborne starts Low on supply with no road behind it;
  the XXX Corps road from Uden opens on turn 10, and air drops land on turns 3 and 16. The
  Guards Armoured Division arrives from the south-west in groups on turns 3, 4, 6 and 11. The
  assault-boat crossing west of the railway bridge opens on turn 14, for foot troops.
- **German:** deny that, or hold **both ends** of the Heumen lock bridge, the only canal crossing
  that takes tanks (the Honinghutje bridge takes foot and wheeled traffic only), at the end of a
  turn. The garrison is supplied over the Pannerden ferry, the Kleve road and the Gennep road;
  counter-attack groups arrive from the Reichswald on turns 9, 14 and 15.
- If neither side has won by the end of turn 16, the German side wins.

## 13. What the game tells you, and what it hides

You get exact figures for your own units: losses, cohesion, halts, retreats, and the reasons
behind every fire result. For enemy units you get what your units could see: where they were,
roughly what they are, whether your fire did "no visible effect", "light", "moderate" or "heavy"
losses (and "results not observed" if nobody could see the target). Enemy fire on you is
reported from where it came, if the firer was seen; otherwise "from an unseen position". The
enemy's cohesion, supply, strength and orders never appear, and nothing the host sends your
browser contains them.
