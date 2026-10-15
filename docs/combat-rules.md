# Combat, spotting and cohesion rules (Stage 2)

This document is written for the designer and playtesters. It explains how a fight is worked out,
with four worked examples. Every number is a **provisional playtest value** from
`packages/engine/src/rules.ts` (`rulesVersion 0.2.0-provisional`). None of them is a researched
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
2. **Movement.** Ten one-minute ticks, using the Stage 1 collision rules.
3. **Spotting** at the new positions.
4. **Fire.** Every eligible unit picks a target and works out its damage from the same pre-damage
   snapshot.
5. **Damage.** All damage is applied together. Then cohesion changes, destruction, and retreats
   by broken units, which are resolved as a batch.
6. **Observation.** Spotting is worked out again, so units that just fired or moved are easier to
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

| Combat class | Fire vs soft | Fire vs hard | Direct range (hexes) | Indirect range (hexes) | Fire while moving | Armoured |
| --- | ---: | ---: | ---: | ---: | ---: | :---: |
| rifle-section | 4 | 1 | 1 | – | 50% | |
| medium-tank | 6 | 8 | 2 | – | 50% | ✓ |
| armoured-car | 3 | 1 | 2 | – | 75% | ✓ |
| at-gun | 1 | 10 | 2 | – | 0% | |
| field-gun | 10 | 2 | 1 | 8 | 0% | |
| transport | 0 | 0 | – | – | – | |

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
| 7 | Unseen bombardment | 50% for indirect fire on a target the firing side cannot see |

> **damage = ⌊ result ÷ 1000 ⌋**

That is 10 fire points per damage point.

All damage on one target in a step is added together. Then:

- **Soft target:** each damage point is one casualty.
- **Hard target:** every 3 damage points knock out one armoured vehicle and its 5 crew.
  Leftover points carry over to the next step. Vehicles are lost from the most numerous armoured
  type first.
- **Non-armoured equipment** shrinks with personnel, rounded up. For example, rifle sections stay
  proportional to the men left.

## Cohesion, retreat and destruction

| Event | Effect |
| --- | --- |
| Took any damage this step | −2 |
| Personnel lost | −2 per whole percent of starting personnel lost this step |
| Took no damage this step | +3, up to 100 |
| Cohesion below 25 | The unit **breaks**. Its order is cleared and it retreats one hex |
| Broken with nowhere to go | **Pinned**: stays put, −10 |
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
| **Damage** ⌊10 800 ÷ 1000⌋ | **10 casualties** |
| Target cohesion: −2 − 2 × ⌊1000 ÷ 500⌋ | 100 → 94 |
| Target rifle sections: ⌈22 × 490 ÷ 500⌉ | still 22 |

The German battalion fires back in the same step from the same snapshot. Its base is
22 × 4 × 100 = 8 800, which gives **8 casualties** to the Allied battalion.

If the German battalion holds a **town with preparation 3** instead, the Allied fire is
10 800 → ×50% = 5 400 → ×55% = 2 970, which is **2 casualties**.

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
| **Damage** | **7** |
| Tanks knocked out: ⌊7 ÷ 3⌋, 1 point carried over | **2 tanks, 10 crew** |
| Tank cohesion: −2 − 2 × ⌊1000 ÷ 540⌋ | 100 → 96 |

**Step 2.** Having fired, the guns can be seen from up to 3 hexes. The tanks spot them 2 hexes away
and the Advance halts. Both sides now fire from the same snapshot:

| Guns → tanks (tanks not moving) | Value |
| --- | ---: |
| Base | 6 000 |
| **Damage** 6 + 1 carried over = 7 | **2 tanks** (1 carried over) |

| Tanks → guns | Value |
| --- | ---: |
| Base: 48 × 6 (soft) × 60% × 100 ÷ 100 | 17 280 |
| × cohesion 98% (50 + 96 ÷ 2) | 16 934 |
| × supply 100%, × town 50% | 8 467 |
| × preparation 1 (85%) | 7 196 |
| **Damage** | **7 casualties** (of 120) |

In the open, the guns would take 16 934 × 85% = 14 393, which is 14 casualties a step. The
lesson is to scout or shell a town before sending armour past it.

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
| **Damage** | **5 casualties** |

| Defender → attacker (in clear, not moving, preparation 0) | Value |
| --- | ---: |
| Base: 22 × 4 × 100 × 100 ÷ 100 | 8 800 |
| **Damage** | **8 casualties** |

A frontal assault on a prepared town costs the attacker more than the defender. Without the
assault bonus, the same fire would do only **3**. An attacker worn down to cohesion 40 loses the
bonus, because assault needs cohesion 50, and its lower cohesion also weakens its fire. It deals
just **2**. Artillery preparation (example 4) and attacking from more than one side change that
balance.

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
| **Damage** | **6** | **3** |
| Firing player is told the result | yes ("light") | **no** ("results not observed") |

The same guns firing on unprepared infantry in the open do **24** damage, or **30** if the
infantry are moving.

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
