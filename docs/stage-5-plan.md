# Stage 5, part 1: making the game legible

Agreed on 16 October 2026, before the first Nijmegen game. **All eight items were built the same
day; see [stage-5-notes.md](stage-5-notes.md) for what was decided along the way.** The aim is that a player who has never
read the rules, including a younger one, can tell what happened in a turn and why, and that
someone used to turn-based games is not lost in the replay. The brief's Stage 5 check: both
players can explain outcomes and identify more than one credible plan.

Everything here is presentation. Nothing changes the rules, and the engine's event log stays the
single source of truth: every picture, caption and sentence is drawn from events the player's side
was allowed to see, so the fog of war is unchanged.

## What will be built, in order

1. **Reasons behind fire.** The engine already works out every factor in a fight (cohesion,
   supply, terrain, dug-in level, moving, assault, river, unseen target) but never reports them.
   Each observed fire event gains a short list of the factors that applied, filtered by viewpoint:
   your own fire shows everything about you and what you could see of the target; enemy fire on
   you shows only what you could observe (your terrain and cover, that it was an assault, that it
   came across a river). The leakage tests check that enemy cohesion and supply never appear.

2. **Turn summary.** Five to eight plain sentences per turn, built from the observed events and
   grouped by what happened rather than by the minute: objectives changed, units lost, the fights
   (where, who, how it went, what it cost), new enemy sightings, arrivals, supply, and movement
   worth mentioning. Shown at the end of the replay and kept as "the story so far" for the match.
   The event log stays, as the fine print.

3. **Key moments in the replay.** The replay pauses briefly on the events that matter, with a
   caption, and the map pans to the place: first contact, an assault going in, a unit breaking or
   being lost, an objective changing hands, reinforcements arriving, a supply drop. Markers on the
   scrub bar let the player jump between moments. A "Skip to summary" button is there for anyone
   who does not want to watch.

4. **Pictorial counters.** Silhouettes instead of map symbols: a soldier, a paratrooper, a tank,
   an armoured car, an anti-tank gun, a howitzer, a flak gun, an engineer, a headquarters flag.
   Own units show their actual kit (a Sherman, a Firefly with its long gun, a Cromwell, a Stuart, a
   Panzer IV, a StuG, an M10); enemy contacts get a generic silhouette for the type seen, which is
   all the player knows. Each nationality has its own colour (US olive, British khaki, German
   grey) and a small formation badge. The map symbols stay as a toggle for players who prefer
   them; the choice is remembered in the browser.

5. **Visible fighting.** Drawn from the events, never deciding anything: units move smoothly
   through the hexes they crossed; a unit that is hit flashes, with its losses floating up; shells
   burst; a unit that breaks visibly runs; a destroyed unit leaves a wreck for the rest of the
   replay. Fire lines fade rather than snapping on and off.

6. **The "what changed" picture.** At the end of the replay, and on request during the next
   planning phase, the map shows the turn in one picture: a ghost of where each of your units
   started, a trail to where it ended, a flash where there was fighting, a cross where a unit was
   lost.

7. **Why cards.** Click a fight in the event log, or select a unit during the replay, to see the
   reasons behind the result in words: "Half damage: they were in a town. A third less: they were
   dug in. Your assault came across the river."

8. **Documentation and check.** Notes on the decisions, the README, screenshots of the replay
   from both sides, and the usual typecheck, tests and build before committing.

## Decisions already taken

- **Summaries are made in the browser** from the replay it was sent, and the story so far is kept
  in that browser. Rejoining from a different browser starts the story from that point. The host
  keeps only the current turn's replay, and this avoids changing the save format.
- **Dug-in level of a seen enemy is reported** as a factor. A player who can see a unit can see
  that it is dug in. Enemy cohesion, supply and movement penalties are not reported.
- **Pictures are drawn as simple stylised shapes** in the game's own code, so there is nothing to
  license.
- **Nationality comes from the formation**, with a new optional `nation` field (`us`, `uk`, `de`)
  and badge on top-level formations. The synthetic map stays as it is.
- **No sound**, and no changes to terrain drawing, for now.

## Out of scope for this part

Formation orders, night, tuning the Nijmegen balance, verifying research. Those follow the first
game.
