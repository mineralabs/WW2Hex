# Stage 5 implementation notes, part 1: making the game legible

This records what was built from [stage-5-plan.md](stage-5-plan.md), before the first Nijmegen
game, and the decisions made along the way. Nothing here changes the rules
(`rulesVersion 0.6.0-provisional` is unchanged). Everything a player now sees, reads or watches is
drawn from the events their side was allowed to observe, so the fog of war is exactly as it was.

## What was built

| Plan item | Where |
| --- | --- |
| 1. Reasons behind fire: each fire event carries the factors that applied, filtered by viewpoint | `packages/engine/src/combat.ts` (`FireCalculation.factors`), `observe.ts` |
| 2. Turn summary and "the story so far" | `apps/client/src/narrative.ts` (`summarizeTurn`), `SummaryPanel` |
| 3. Key moments: captions, pauses, camera, scrub-bar markers, "Skip to summary" | `narrative.ts` (`keyMoments`), `ReplayBar`, `MapRenderer.panTo` |
| 4. Pictorial counters, nationality colours, formation badges, Pictures/Symbols toggle | `apps/client/src/map/silhouettes.ts`, `renderer.ts`, formations' `nation` and `badge` |
| 5. Visible fighting: movement through each hex, hit flashes, floating losses, bursts, retreat arrows, wrecks, fading fire lines | `renderer.ts` (effects layer), `Game.tsx` (`effects`) |
| 6. The "what changed" picture: ghosts, trails, fight starbursts, losses | `renderer.ts` (`TurnPicture`), `Game.tsx` |
| 7. Why cards in the event log and the unit panel | `format.ts` (`describeFactors`), `EventLog`, `UnitPanel` |

Tests: `apps/client/test/narrative.test.ts` plays a real fight through the engine and checks the
sentences and moments each side gets; `packages/engine/test` checks the factors on the worked
examples and that enemy fire reports only what the target could observe; the network leakage test
checks the same on the wire.

## Decisions and defaults

**Reasons behind fire**

- **What is reported.** Every factor that changed the result, plus the range. For your own fire at
  a seen target: everything. For your fire at an unseen hex: only your own factors and the
  "shelling blind" penalty. For enemy fire on your unit: your terrain, your dug-in level, whether
  you were caught moving, whether it was an assault, whether it came across a river, and the
  range only if the firer was seen. Never the enemy's cohesion, supply or movement, and never
  whether the enemy could see you.
- **A seen enemy's dug-in level is reported.** A unit you can see is a unit whose entrenchment
  you can see. It is the one piece of enemy state the reasons give away, and it is deliberate.
- **Range and moving are aggregates.** A unit with mixed weapons has several ranges; the
  reported percentage is the actual fire over what the same weapons would do at full range
  (or standing still).

**Summaries and moments**

- **Fights are grouped by place**, with an exchange of fire grouped by where the enemy fire came
  from, and fights within two hexes of each other folded into one. Losses count towards a fight
  only when they were taken under that fight's fire, so a unit in two fights is not charged twice.
- **Places are named from the map**: a named place, "near" one within two hexes, a bridge at
  either end, or a coordinate. Objective names are not used as places, because they are tasks
  ("Secure Northton and the bridge"), not locations.
- **At most ten moments a turn**, one per step and place, the most important kept: objectives,
  units lost, units breaking, assaults, first contact, coming under fire, arrivals, drops, halts.
- **The replay rests 2.6 seconds on a moment** at 1× speed, then carries on. It only pans when the
  moment is reached; dragging the map cancels a pan.
- **The story so far lives in the browser**, in that tab's session, as the plan said. Rejoining
  from another browser starts the story from there.

**Pictures**

- **Shapes, not images.** Each silhouette is a few filled shapes in a 26 × 14 box. There are no
  image files and nothing to license.
- **Own units show their kit; contacts show only their type.** A Firefly's long gun and muzzle
  brake, a StuG's low casemate and an M10's open turret are drawn from the unit's most numerous
  armoured vehicle. A contact is only ever "armour", so it gets the generic tank.
- **Nationality is a formation property** (`nation`: `us`, `uk`, `de`), inherited down the
  formation tree, with colours US olive, British khaki and German field grey. Enemy contacts use
  the side's usual nationality (for Nijmegen: German contacts grey, and US paratroop contacts
  khaki, because the German player cannot tell).
- **Badges** (`badge`, up to four characters, inherited the same way) sit top-left in the
  formation's colour. The name shrinks to fit beside the badge.
- **The symbols stay** as a toggle in the top bar, remembered in the browser.

**Visible fighting**

- **Movement follows the hexes crossed**, from the step's `unit-moved` events, over 650 ms so it
  fits inside a replay frame at 1×. At 4× the move is cut short by the next frame.
- **Own losses float up as numbers**; enemy results float up as the words the rules allow
  ("light", "moderate", "heavy"), never numbers.
- **Wrecks persist** for the rest of the replay and in the turn picture; a surrender shows a
  white flag instead. They are offset within the hex so a counter can stand there.

## Known limitations

- **No sound**, and terrain is drawn as before.
- **The story so far is per browser tab.**
- **Captions and floating words can overlap place names**, since both sit above the hex.
- **The unit panel's "This step" list** shows only during the replay, for the frame shown.
- **Untested with a real player.** Every judgement about what is readable was made from
  screenshots. The first game will decide.

## What comes next

The second part of Stage 5 follows the first Nijmegen game: formation orders, night, and tuning
the balance and objectives from what the game shows.
