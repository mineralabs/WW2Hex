# Combat, spotting, cohesion and supply rules

This document is written for the designer and playtesters. It explains how a fight is worked out,
with four worked examples. Every number is a **provisional playtest value** from
`packages/engine/src/rules.ts` (`rulesVersion 0.6.0-provisional`). None of them is a researched
historical rate.

Research-derived facts belong in the scenario's equipment catalogue: name, role and sources. The
catalogue gives each item a `combatClass`. That class looks up the gameplay coefficients below, so
the historical record and the game tuning stay separate.

The test file `packages/engine/test/combat.test.ts` reproduces every worked example, so this
document and the code cannot drift apart.

## Rounding

All values are whole numbers. Percentages are applied one at a time, and the result is rounded down
after each one. Fire is counted in hundredths of a fire point, so rounding never wipes out small
effects early.

## Order of events in each ten-minute step

Both sides decide from the same snapshot at every stage. Nothing depends on which unit happens to
be listed first.

1. **Halt check.** An Advance stops if the unit itself can see an enemy within 2 hexes. The
   order is cleared and the unit fights where it stands.
2. **Movement.** Ten one-minute ticks, using the Stage 1 collision rules with two Stage 3
   changes (see [Queues and stopped units](#queues-and-stopped-units)).
3. **Spotting** at the new positions.
4. **Fire.** Every eligible unit picks a target and works out its damage from the same pre-damage
   snapshot.
5. **Damage.** All damage is applied together. Then cohesion changes, destruction, and retreats
   by broken units, which are resolved as a batch.
6. **Supply and arrivals.** Reserves are used and topped up (see [Supply](#supply-and-reserves)).
   At the end of a turn, objective control is updated and airborne supply drops land.
   Reinforcements whose turn has come join the map.
7. **Observation.** Spotting is worked out again, so units that just fired or moved are easier to
   see. Each side's contact list is updated and each side's observed-event log is written.

## Spotting

A unit sees an enemy when:

- the distance is no more than the unit's **spot range**: 3 hexes, or 4 for reconnaissance;
- the distance is no more than the target's **concealment** limit:

  | Target terrain | Clear | Polder | Woods | Town |
  | --- | ---: | ---: | ---: | ---: |
  | Visible up to (hexes) | 4 | 4 | 1 | 1 |

  The limit is raised by **+2** if the target fired during the step, and by **+1** if it moved;
- and there is **line of sight**. Line of sight is blocked by any hex in between that is woods or
  town, unless the observer is at least 10 m higher than that hex. It is also blocked by any hex
  in between that is higher than both the observer and the target.

Adjacent units always see each other.

A side sees whatever any of its units sees. A **contact** is an enemy as the other side knows it:
an anonymous contact id, a position, an apparent type and the time it was last seen.

When a contact is lost, it stays on the map as **last seen at a time**, with no further updates. It
is removed once the side looks at that hex and finds it empty. If the same enemy is spotted
somewhere else, it appears as a new contact, so the player cannot tell it is the same unit.

## Orders

| Order | Movement | Fire | Notes |
| --- | --- | --- | --- |
| Advance | Follows its route | Yes. At 50% while moving for most weapons (see the weapon table) | Halts when it sees an enemy within 2 hexes |
| Attack (ground) | Moves towards the objective and does not halt | Yes. Gets the **assault** bonus against the hex it is trying to enter if its cohesion is at least 50 | Enters only once the defender has gone. On reaching the objective, it switches to Defend |
| Attack (artillery) | None | Bombards the chosen hex every step while it is in indirect range | Hits whoever is in the hex, seen or not |
| Defend | None | Yes | Preparation builds up to level 3 |
| Withdraw | Follows its route and does not halt | **No** | Puts disengaging first |
| No order | None | Yes | Preparation builds up to level 1 |

**Preparation.** A unit gains one level for every 3 steps (30 minutes) it stays still, up to the
cap for its order. Each level cuts the damage it takes by 15 percentage points. Moving resets it
to 0.

## Weapons (gameplay profile per combat class)

| Combat class | Fire vs soft | Fire vs hard | Direct range (hexes) | Indirect range (hexes) | Fire while moving | Armoured | Used for |
| --- | ---: | ---: | ---: | ---: | ---: | :---: | --- |
| rifle-section | 4 | 1 | 1 | – | 50% | | Rifle sections and squads, with their light support weapons |
| medium-tank | 6 | 8 | 2 | – | 50% | ✓ | Sherman (75 mm), Cromwell, Panzer IV |
| tank-17pdr | 6 | 12 | 2 | – | 50% | ✓ | Sherman Firefly, Challenger |
| light-tank | 4 | 4 | 2 | – | 60% | ✓ | Stuart |
| assault-gun | 5 | 11 | 2 | – | 25% | ✓ | StuG III, Jagdpanzer IV |
| tank-destroyer | 4 | 12 | 2 | – | 25% | ✓ | M10 Achilles |
| armoured-car | 3 | 1 | 2 | – | 75% | ✓ | Daimler and German armoured cars |
| at-gun | 1 | 10 | 2 | – | 0% | | 6-pdr, 17-pdr, US 57 mm |
| light-at-gun | 1 | 6 | 2 | – | 0% | | 3.7 to 5 cm anti-tank guns |
| heavy-flak | 4 | 14 | 3 | – | 0% | | 8.8 cm Flak in the ground role |
| light-flak | 4 | 2 | 2 | – | 0% | | 2 cm Flak |
| flak-halftrack | 4 | 2 | 2 | – | 50% | | 2 cm Flak on a halftrack |
| field-gun | 10 | 2 | 1 | 10 | 0% | | 25-pdr, Sexton, 10.5 cm leFH 18, 105 mm M3 |
| pack-howitzer | 7 | 2 | 1 | 8 | 0% | | 75 mm pack howitzer M1A1 |
| medium-gun | 16 | 3 | – | 13 | 0% | | 15 cm sFH 18, captured 152 mm |
| transport | 0 | 0 | – | – | – | | Lorries, jeeps, carriers |

Indirect ranges are in 1 km hexes and follow the guns' real ranges, rounded: the 25-pdr reached
about 12 km, the leFH 18 10.7 km and the US M3 7.6 km (10 for the class), the pack howitzer
8.8 km, and the sFH 18 13 km. The fire values are gameplay coefficients, not research.

Direct fire loses strength with distance:

| Distance | 1 hex | 2 hexes | 3 hexes |
| --- | ---: | ---: | ---: |
| Effectiveness | 100% | 60% | 40% |

Indirect fire is 100% at any distance within range.

A unit is a **hard target** when its armoured vehicles × 15 ≥ its personnel. In practice that
means tank and armoured-car units. Everything else is a **soft target**. Each firer uses the
soft or hard fire value to match its target.

## The fire formula

Each firing unit chooses one target per step. If it has both direct and indirect weapons it uses
whichever does more damage. The target must be one the firer can see (direct fire) or one its
side can see (indirect fire). An artillery Attack order instead fires at its chosen hex.

The firer picks the target it would damage most. Ties go to the nearer target, then to the more
northerly hex, then to the more westerly.

**Base fire** is worked out for each weapon type and added up:

> base = ⌊ Σ (items × fire value × range % × moving %) ÷ 100 ⌋

The result is in hundredths of a fire point. Weapons out of range contribute nothing. The
moving % is 100 if the firer did not move this step; otherwise it is the weapon's
"fire while moving" value.

Each modifier is then applied in order, rounding down after each:

| # | Modifier | Value |
| --- | --- | --- |
| 1 | Firer cohesion | 50 + ⌊cohesion ÷ 2⌋ % (100 cohesion → 100%, 0 → 50%) |
| 2 | Firer supply | Supplied 100%, Low 75%, Exhausted 40% |
| 3 | Target terrain | Clear 100%, Polder 90%, Woods 60%, Town 50% |
| 4 | Target preparation | 100 − 15 × level % (level 3 → 55%) |
| 5 | Target exposed | 125% if the target moved this step in clear or polder |
| 6 | Assault | 150% for an Attack firing into the hex it is trying to enter, cohesion ≥ 50 |
| 7 | Assault across a river | Across a major river 60%, even over a bridge; across a stream 80%. Applies only to an assault, and only when a river edge lies between the two hexes. It appears in a calculation only when it applies |
| 8 | Unseen bombardment | 50% for indirect fire on a target the firing side cannot see |

> **damage = ⌊ (result + carried) ÷ 3000 ⌋**

That is 30 fire points per damage point. All the fire on one target in a step is added up in
hundredths of a fire point. Whatever falls short of a whole damage point is **carried** on the
target to its next step, so steady small fire still adds up. The carried amount is dropped in a
step with no incoming fire. (Before rules 0.6.0 this was 10 fire points and nothing carried. Real
battalions on a historical map lost a quarter of their strength in a turn of firing, so the scale
was cut to a third.)

Then:

- **Soft target:** each damage point is one casualty.
- **Hard target:** every 3 damage points knock out one armoured vehicle and its 5 crew.
  Leftover points carry over to the next step. Vehicles are lost from the most numerous armoured
  type first.
- **Non-armoured equipment** shrinks with personnel, rounded up. For example, rifle sections stay
  proportional to the men left.

**Example: assaulting over a bridge.** The Allied battalion from worked example 1 assaults the
German battalion across a bridged major river. Neither unit is prepared, and both are in clear
terrain.

| Step | Value |
| --- | ---: |
| Base | 10 800 |
| × cohesion, supply, terrain and preparation, all 100% | 10 800 |
| × assault 150% | 16 200 |
| × across a major river 60% | 9 720 |
| **Damage** ⌊9 720 ÷ 3000⌋ | **3 casualties** (5 without the river) |

The river makes an assault over the bridge no better than plain fire (also 3), so it pays to wear
the defender down with fire and artillery before going in.

## Queues and stopped units

Each hex holds one counter, so units on the same road form a queue. Stage 3 changed two of the
Stage 1 rules after a playtest showed units getting stuck for good.

- **Several friendly units want the same hex.** The one that has been waiting longest goes first.
  Waiting means being ready to enter the next hex and being held back. If they became ready in
  the same minute, the one coming from the earliest direction in the fixed compass order E, NE,
  NW, W, SW, SE goes first. Units always come from different directions, because each hex holds
  one unit. Unit ids and the order units are listed in never decide it. Before Stage 3 all of them
  waited, and kept waiting for ever.
- **A friendly unit that has stopped is in the way.** "Stopped" means it has no route to follow:
  no order, Defend, or it has finished its move. The moving unit finds a way round it, avoiding
  every stopped unit of its own side. It keeps any waypoints still ahead, and starts its progress
  afresh. If there is no way round, such as a stopped unit on the bridge, it waits. If the
  stopped unit holds the moving unit's destination, the moving unit stops where it is. An Attack
  whose objective is held by friends switches to Defend.
- **Units of the other side are never avoided.** A route only ever avoids the unit's own side, so
  movement reveals nothing about hidden enemies. Opposing units that want the same empty hex
  both halt, as before.

## Cohesion, retreat and destruction

| Event | Effect |
| --- | --- |
| Took any damage this step | −2 |
| Personnel lost | −2 per whole percent of starting personnel lost this step |
| Took no damage this step | +3, up to 100 |
| Cohesion below 25 | The unit **breaks**. Its order is cleared and it retreats one hex |
| Broken with nowhere to go | **Pinned**: stays put, −10 |
| Pinned with cohesion down to 0 | **Surrenders**: removed, and reported as having surrendered |
| Personnel (or armoured vehicles) at or below 15% of starting strength | **Destroyed** |

**Retreat destination.** A broken unit moves to an empty, passable neighbouring hex that takes it
further from the nearest enemy its side can see. Among equal choices it takes the hex furthest from
that enemy, then the one furthest from all seen enemies combined. If choices are still tied it uses
a fixed compass order: E, NE, NW, W, SW, SE.

If two retreating units choose the same hex, neither gets it. Both then choose again without that
hex. This repeats until nothing changes, so the order units are listed in never decides who gets a
hex. A broken unit whose side can see no enemy does not retreat; its order is simply cleared.

## Worked examples

### 1. Infantry against infantry in the open

An Allied infantry battalion fires at an adjacent German infantry battalion standing unprepared in
clear terrain.

| | Allied battalion (firer) | German battalion (target) |
| --- | --- | --- |
| Strength | 27 rifle sections, 620 men | 22 rifle sections, 500 men |
| Cohesion | 100 | 100 |
| Situation | Not moving, supplied | Not moving, clear terrain, preparation 0 |

| Step | Value |
| --- | ---: |
| Base: 27 × 4 × 100 × 100 ÷ 100 | 10 800 |
| × cohesion 100%, supply 100%, clear 100%, preparation 100% | 10 800 |
| **Damage** ⌊10 800 ÷ 3000⌋ | **3 casualties**, 1 800 carried |
| Target cohesion: −2 − 2 × ⌊300 ÷ 500⌋ | 100 → 98 |
| Target rifle sections: ⌈22 × 497 ÷ 500⌉ | still 22 |

The German battalion fires back in the same step from the same snapshot. Its base is
22 × 4 × 100 = 8 800, which gives **2 casualties** to the Allied battalion, with 2 800 carried.
Over a two-hour turn of the same exchange that is about 43 and 35 casualties.

If the German battalion holds a **town with preparation 3** instead, the Allied fire is
10 800 → ×50% = 5 400 → ×55% = 2 970. That is **no casualty** in the step, but it is all carried:
a turn of it adds up to 35 640, which is 11 casualties.

### 2. Armour against anti-tank guns

An Allied tank battalion (50 medium tanks, 540 men) advances across clear ground. A German
anti-tank company (10 AT guns, 120 men) is hidden in a town 2 hexes away, preparation 1.

**Step 1.** The guns are in a town, so they can only be seen from 1 hex until they fire. The tanks
cannot see them. Only the guns fire.

| Step | Value |
| --- | ---: |
| Base: 10 × 10 (hard) × 60% (2 hexes) × 100 ÷ 100 | 6 000 |
| × cohesion 100%, supply 100%, clear 100%, preparation 100% | 6 000 |
| × exposed 125% (the tanks moved in the open) | 7 500 |
| **Damage** ⌊7 500 ÷ 3000⌋ | **2** |
| Tanks knocked out: ⌊2 ÷ 3⌋, 2 points carried over | **none yet** |
| Tank cohesion: −2 (hit), no casualties | 100 → 98 |

**Step 2.** Having fired, the guns can be seen from up to 3 hexes. The tanks spot them 2 hexes away
and the Advance halts. Both sides now fire from the same snapshot:

| Guns → tanks (tanks not moving) | Value |
| --- | ---: |
| Base | 6 000 |
| **Damage** 2 + 2 carried over = 4 | **1 tank, 5 crew** (1 point carried over) |

| Tanks → guns | Value |
| --- | ---: |
| Base: 50 × 6 (soft) × 60% × 100 ÷ 100 | 18 000 |
| × cohesion 99% (50 + 98 ÷ 2) | 17 820 |
| × supply 100%, × town 50% | 8 910 |
| × preparation 1 (85%) | 7 573 |
| **Damage** | **2 casualties** (of 120) |

In the open, the guns would take 17 820 × 85% = 15 147, which is 5 casualties a step. The lesson is
to scout or shell a town before sending armour past it.

### 3. An attack into a town

An Allied infantry battalion (27 sections, cohesion 80) has an **Attack** order. It is next to a
German battalion (22 sections, cohesion 100) holding a town at preparation 2. The attacker arrived
in the previous step and is not moving now.

| Attacker → defender | Value |
| --- | ---: |
| Base | 10 800 |
| × cohesion 90% (50 + 80 ÷ 2) | 9 720 |
| × supply 100%, × town 50% | 4 860 |
| × preparation 2 (70%) | 3 402 |
| × **assault 150%** | 5 103 |
| **Damage** | **1 casualty**, 2 103 carried |

| Defender → attacker (in clear, not moving, preparation 0) | Value |
| --- | ---: |
| Base: 22 × 4 × 100 × 100 ÷ 100 | 8 800 |
| **Damage** | **2 casualties**, 2 800 carried |

A frontal assault on a prepared town costs the attacker more than the defender. Without the
assault bonus, the same fire would be 3 402, about two-thirds as much. An attacker worn down to
cohesion 40 loses the bonus, because assault needs cohesion 50, and its lower cohesion also weakens
its fire: 2 646, under a casualty a step. Artillery preparation (example 4) and attacking from
more than one side change that balance.

### 4. Artillery against a defended position

An Allied field artillery battalion (24 field guns, cohesion 100, supplied, not moving) bombards a
hex 5 hexes away. A German infantry battalion holds it: town, preparation 3.

| Step | Seen by the Allies | Not seen |
| --- | ---: | ---: |
| Base: 24 × 10 × 100 × 100 ÷ 100 | 24 000 | 24 000 |
| × cohesion, supply 100% | 24 000 | 24 000 |
| × town 50% | 12 000 | 12 000 |
| × preparation 3 (55%) | 6 600 | 6 600 |
| × unseen bombardment | – | 3 300 |
| **Damage** | **2** | **1** |
| Firing player is told the result | yes ("light") | **no** ("results not observed") |

The same guns firing on unprepared infantry in the open do **8** damage, or **10** if the
infantry are moving. Each step of firing also costs the guns 9 points of reserves (see below), so
a battery cannot keep this up all day without a supply route.

## Supply and reserves

Each unit carries **reserves** from 0 to 100: ammunition, fuel and food.

| Event | Reserves |
| --- | ---: |
| A step in which the unit fired directly | −3 |
| A step in which the unit fired indirectly (artillery) | −9 |
| A step in which the unit moved | −1 |
| A step ending with a supply route to the unit | +6, up to 100 |
| An airborne supply drop within its radius | + the drop's amount |

The **supply status** shown to the player comes from the reserves: **Supplied** at 50 or more,
**Low** from 20 to 49, **Exhausted** below 20. It affects fire through the supply modifier
(100%, 75%, 40%).

A **supply route** is traced from the side's supply sources, which are places named in the
scenario, such as a road entering from a depot. It is costed as wheeled travel, so roads reach
much further than open country, out to the source's range in minutes. A route cannot pass:
- a hex holding an enemy unit;
- a hex next to an enemy unit, unless a friendly unit holds it.

So a unit in contact keeps its own hex in supply, but an enemy unit astride the road behind it
cuts the route. A supply source may open later in the scenario. A side whose scenario lists no
supply sources is always in supply, as on the synthetic test map.

A cut route bites gradually. Reserves keep falling with use and are not topped up, so a unit goes
from Supplied to Low to Exhausted over a few hours of fighting.

Supply is automatic. A player sees their own units' reserves, status and whether the route is
open. That tells them a route has been cut, but not where or by whom.

## Reinforcements

Units scheduled to arrive at the start of a turn join the map at the first of their listed entry
hexes that is free and passable. If all are occupied, they wait, and the owning player is told
once. A player sees their own side's coming reinforcements (unit, turn and entry point) but
nothing about the enemy's until they are spotted.

## What each side is told

- **Your own units:** exact losses, cohesion, retreats and halts.
- **Your fire:** what you fired at. If you could see the target you also get a rough result:
  - no effect;
  - light (up to 2% of the target's starting strength);
  - moderate (up to 5%);
  - heavy (more than 5%).

  An unseen target gives "results not observed".
- **Enemy fire on you:** where it came from, if your side can see the firer after it fired.
  Otherwise it is "fire from an unseen position". Bombardment by unseen guns reports only that
  the hex was shelled.
- **Enemy movement, retreats and destruction:** only what your units could see at the time.
- Hidden enemy strength, equipment, orders, routes and unseen losses never appear in a player's
  view or event log. Tests check the actual messages for this, not only what is drawn.
