# WWII Hex Wargame: Development Brief

15 October 2026. Working specification for an initial prototype.

## 1. Direction

Build a two-player WWII operational wargame on detailed historical hex maps. Both players plan privately, commit orders and watch the same period of battle resolve simultaneously from their own perspective.

The confirmed direction is simultaneous turns, real battlefields, real military formations and equipment, and separate campaign areas such as Market Garden and the Battle of the Bulge. The rules should be straightforward, with strategy arising from terrain, reconnaissance, concentration of force, supply and timing.

An additional requirement is zero ongoing server-hosting fees for personal play. One player's ordinary computer runs the game-host program while they play. This program serves the browser interface, accepts orders, resolves turns and saves the match. A rented server or separate server computer is not required.

The numerical settings below are proposed playtest values. They are not researched historical specifications or decisions already made by the player.

| Element | Initial proposal |
| --- | --- |
| First historical area | Nijmegen sector of Market Garden |
| Command structure | Historically named divisions containing battalion-sized counters |
| Map scale | Approximately 1 km between neighbouring hex centres |
| Starting map extent | Approximately 30 km by 24 km, adjusted to fit researched objectives |
| Turn duration | Two simulated hours |
| Resolution | Twelve ten-minute steps per turn |
| Initial force size | Roughly 12-20 manoeuvre/support counters per side |
| Short scenario length | Initially 16 turns, representing 32 hours |
| Platform | Desktop browser, with each player on their own computer and one player's computer hosting |
| Hosting | Player-hosted locally, with no required paid hosting or paid backend service |
| Planning timer | Untimed initially; an optional timer can follow playtesting |

Large campaigns can span several sessions. Map extent, force count and scenario duration should be adjusted through playtesting.

## 2. First playable scenario

Use the Nijmegen area to test approaches to a defended river crossing, movement through settlements, combined infantry and armour, artillery and reinforcement timing.

The historical basis includes the US 82nd Airborne Division and Guards Armoured Division participating in the capture of the Nijmegen crossings [1, 2]. Research the exact scenario start time, participating sub-units, German forces, positions and available equipment before presenting a scenario as historically verified. Do not assume every unit in either division was present in the selected area.

Develop two clearly labelled scenario datasets:

- A small synthetic test map with placeholder counters for engine development.
- A researched Nijmegen scenario using the same engine and schemas. Keep any uncertain strengths or locations marked provisional.

An initial objective proposal is for the Allied side to secure the designated crossing and establish a supplied bridgehead before the scenario ends. The German side wins by denying that result. Define the necessary objective hexes, supply route and consecutive holding period explicitly in scenario data. Victory is evaluated at turn boundaries. These are proposed game conditions, not a statement of historical orders.

The eventual full Market Garden map should support the relief corridor and separated airborne positions. The Bulge should become a separate scenario package with its own terrain, force roster, supply conditions, arrival schedule and objectives.

## 3. Player decisions and interface

Use four shared orders. Units continue their standing orders until completed, interrupted or changed.

| Order | Behaviour |
| --- | --- |
| Advance | Follow a plotted route; halt on detected opposition and engage within valid range |
| Attack | Move towards a designated objective and engage opposition; close assault requires sufficient cohesion |
| Defend | Hold position, engage eligible targets and gradually improve defensive preparation |
| Withdraw | Follow a route towards friendly positions, prioritising disengagement |

Artillery uses Attack to designate a bombardment hex. Its range, ammunition use and ability to fire while moving come from equipment and unit rules. Direct-fire units require a valid observed target. Indirect fire can target a hex, but unobserved casualties are not reported to the firing player.

Allow selection by counter or formation. A formation order generates editable individual routes and objectives; show the resulting routes before commitment. Use individual-counter orders in the first milestone and add formation selection when movement is reliable.

The main display should provide:

- A readable historical map with restrained terrain colours, rivers, bridges, roads and place names.
- Unit counters with formation identity, type, strength and a small readiness indicator.
- A selection panel showing personnel, equipment, cohesion, supply and current order.
- Clear route arrows, movement estimates and warnings about conflicts between friendly orders.
- A clock and turn indicator, both players' Ready status and a visible order-lock state.
- Replay controls for pause, step and playback speed, plus a short observed-events report.

Use shared, consistent rules across unit types. Historical equipment and organisation change capabilities within those rules. Initially provide strength, cohesion and a supply status as the main readable indicators; detailed equipment counts belong in the expanded unit panel.

## 4. Simultaneous resolution contract

Make the engine independent of rendering and network timing. The authoritative state and both committed order sets must produce the same next state and event log on every run.

Turn lifecycle:

1. Planning: each side edits its private order set using its own observed information.
2. Commitment: the server validates ownership and order structure, freezes that side's orders and acknowledges the lock. Orders remain secret. There is no automatic unlock after the opponent commits.
3. Resolution: after both sides commit, the server runs all twelve simulation steps.
4. Replay: each side receives only the events and contacts it could observe.
5. Next planning period: start after both players finish or skip their replay. Saving and reconnecting must preserve the current phase.

For each simulation step:

1. Calculate intended movement from the same starting snapshot, using stored progress and integer travel costs.
2. Resolve friendly occupancy constraints, contested destinations and opposing movement across the same edge as a batch.
3. Apply permitted movement together and calculate spotting at the resulting positions.
4. Calculate all eligible fire and assault effects from the same pre-damage snapshot.
5. Apply losses and cohesion effects together, then resolve withdrawals and destruction.
6. Update observations, supply consumption and the event log. Recalculate spotting when losses or withdrawals change what can be observed.

Proposed collision rules for the first engine:

- One manoeuvre/support counter can occupy a hex. Reinforcements enter only when their entry location has capacity.
- Friendly moves into a hex being successfully vacated are permitted. Friendly reciprocal swaps or movement cycles are permitted when every destination is uniquely assigned and the whole cycle is otherwise legal.
- Multiple friendly units attempting the same destination all wait. The planning interface warns of predictable conflicts. This avoids an arbitrary unit-ID priority rule.
- Opposing units attempting the same empty destination both halt outside it and register contact. Fire occurs only when range and visibility permit from their retained positions.
- Opposing units attempting to exchange positions remain in their original hexes and engage when eligible.
- A unit cannot move into an enemy-occupied hex. Attacks take place from legal positions; the attacker can enter only after the defender has vacated or been destroyed.
- Resolve chains of blocked movement to a stable result before moving any units. A rejected move cannot silently allow a following unit into an occupied hex.

Test these rules using very small maps before adding detailed terrain or large forces. Road bottlenecks should produce understandable queues. Any later road-capacity or stacking model needs its own explicit rules and tests.

Travel progress persists across simulation steps and turns. Changing an order must not grant free distance or reset movement in the player's favour. Replay speed and rendering frame rate never affect combat outcomes.

## 5. Combat, cohesion and supply

Begin with deterministic combat. Derive performance from current personnel and equipment, relevant attack type, range, terrain, preparation, cohesion and supply. Use integer or fixed-point calculations with documented rounding. Keep coefficients in a versioned balance configuration.

Before implementing combat, write a compact formula table and worked examples for infantry against infantry, armour against anti-tank forces, an attack into a town, and artillery against a defended position. Treat the first coefficients as playtest values. Distinguish research-derived equipment facts from gameplay coefficients.

All eligible units calculate fire before that step's damage is applied. Actual equipment losses update the roster and subsequent capability. Cohesion can cause a formation to halt or withdraw before its personnel and vehicles are exhausted. Report the decisive factors behind observed outcomes.

A retreat goes to an eligible friendly-controlled or uncontested neighbouring hex that increases distance from the known threat. Resolve retreat conflicts as a batch. If there is no legal route, the unit stays pinned and suffers the specified cohesion penalty. Use a documented geometric tie-break only for equivalent retreat choices; never let array order choose the winner of a contested hex.

Supply should be automatic to the player. Trace an eligible route to a source through friendly-controlled, passable terrain using configured range/cost limits. Roads improve its reach. A cut route stops replenishment; existing reserves decline through movement and combat rather than disappearing immediately. Display Supplied, Low or Exhausted from those reserves.

The full Market Garden campaign will also need airborne units with initial reserves and researched resupply opportunities. Keep those as scenario supply events or sources so the engine does not assume every formation begins with a ground route to a depot.

## 6. Fog of war and multiplayer

Store the complete game state in the host program on the hosting player's computer. References to a server in this specification mean that local program. Each player receives their own forces, public map information, observed enemy contacts, and an explicitly defined objective-status view. Keep last-seen contacts with an observation time; remove their live movement and strength updates when contact is lost.

Filter both state and replay events before sending them to the browser. Hiding counters visually is insufficient. Private orders, unobserved equipment, hidden casualties, undiscovered reinforcements and full enemy trajectories must not appear in network messages or normal save downloads.

Order validation must not become a way to discover concealed enemy units. Accept structurally legal routes based on the player's available knowledge and handle an unforeseen obstruction during resolution. Artillery reports must follow the same observation rules.

Provide Host Game and Join Game controls. The host starts the local service and plays through its browser interface. The joining player supplies the host address and port, plus a private room code. An invitation can combine those details; a short room code alone cannot discover a home computer without a separate directory service.

On the same home network, connect using the host's local network address. For personal games from different houses, initially support connection over Tailscale: both players install it and join an authorised private network, then the guest uses the host's Tailscale address. Its current free Personal plan explicitly includes playing games with friends [6]. Tailscale attempts direct connectivity and can relay traffic when necessary [7]. This uses a third-party connection service but does not require renting a game server. Keep the game compatible with ordinary reachable network addresses so this connection helper remains replaceable.

Separate player credentials control the two sides; a room code alone does not grant a side's identity. Reconnection uses an unguessable side-specific credential and restores the player's filtered view, committed orders and phase. An interrupted connection does not replace the player or erase a committed turn.

The host computer must remain running and connected during a live match. Save the game on that computer so both players can stop and resume later. Automatic resolution while the host is switched off is outside this hosting model. Provide a simple connection guide and a visible listening address; avoid requiring router changes for the initial remote-play setup.

Persist the authoritative checkpoint, frozen order sets, phase, turn number, rules/scenario versions and filtered replay progress. Resolve a committed turn exactly once, even if Ready messages are retried or the server restarts. A finished or paused match must resume consistently.

## 7. Historical map and scenario data

Build the map as editable geographic data with a hex overlay. Retain its geographic origin, orientation, metric coordinate reference system and scale. Use terrain classes and elevations derived from sourced map layers; check roads, bridges, settlement extent and other strategically important features against wartime evidence.

Represent rivers and crossings on hex edges. Units must not be able to cross a major river by taking a diagonal around a river hex. A bridge connects specific adjacent cells across a defined edge. Validate connected roads, bridge endpoints, reinforcement entry points, objectives and supply routes.

Keep scenario content outside the engine:

| Dataset | Contents |
| --- | --- |
| Map | Hex coordinates, terrain, elevation, roads, river edges, bridges and place names |
| Equipment catalogue | Historical type, role, capabilities, source references and research status |
| Formation hierarchy | Side, historical name, parent formation and subordinate counters |
| Starting forces | Location, personnel, equipment counts, cohesion, reserves and initial orders |
| Events | Reinforcements, supply arrivals and scenario conditions |
| Objectives | Eligible hexes, deadlines, holding conditions and victory evaluation |
| Provenance | Source URLs, map georeferencing notes, reuse terms and unresolved uncertainties |

Separate verified values from provisional assumptions. Use historically available equipment for each participating unit and date. Research actual operational strength where possible; establishment strength and battlefield strength are different inputs.

## 8. Proposed implementation

Use TypeScript throughout. A desktop browser client allows two computers to join the same match. React can manage panels and controls; PixiJS can draw the map, counters and overlays [3]. Use a Node.js host program with the ws library for WebSocket messages, and the browser's native WebSocket client [4]. Run the host program on one player's computer and serve the built client from the same local service. This is a proposed architecture, not a deployed service.

Development starts with a documented local start command. A later launcher can start the service and open the host's browser automatically. Keep the default build independent of subscriptions, rented infrastructure and a centrally hosted matchmaking service. The host persists match files locally. Personal remote-play testing should use the free connection option described above.

Keep the project organised around:

- `packages/engine`: hex geometry, rules, pathfinding, resolution, visibility and scenario validation.
- `packages/protocol`: validated messages and per-player public view types.
- `apps/client`: React panels and a PixiJS map/replay renderer.
- `apps/server`: the local game-host program, client serving, rooms, player sessions, order locking, authoritative resolution and persistence.
- `scenarios`: versioned maps, rosters, equipment and objectives.
- `docs`: rule tables, historical references and playtest notes.

Use a versioned local persistent store for development, such as SQLite. Keep the storage adapter separate from game rules. Select compatible maintained dependencies during setup and commit a lockfile.

Animation consumes the engine's event log. It never decides movement, casualties or victory. Keep the engine callable from tests without a browser or running server.

## 9. Build sequence and completion checks

| Stage | Deliverable | Completion check |
| --- | --- | --- |
| 1. Map and orders | Small synthetic hex map, terrain, river edges, bridge, counters, selection, pan/zoom, route preview and editable orders | Legal routes respect terrain and crossings; a unit can follow and continue a queued route |
| 2. Simultaneous engine | Two private order sets, locking, step resolution, collisions, deterministic combat and observed-event generation | Both sides resolve from the same snapshots; identical inputs produce identical results |
| 3. Two-player game | Local Host/Join, address-based invitation, separate sides, filtered views, replay, simple objective and local save/reconnect | Two browser sessions complete a match; repeat on two computers on the home network, then remotely using the free connection helper |
| 4. Historical Nijmegen slice | Georeferenced map, sourced roster and hardware, basic cohesion/supply and reinforcement schedule | Scenario validation passes; uncertain data is labelled; both sides have plausible decisions |
| 5. Playtest and presentation | Formation orders, clear feedback, readable counters and tuned objectives | Both players can explain outcomes and identify more than one credible plan |
| 6. Campaign expansion | Full Market Garden data, then a Bulge scenario | New scenarios load through data without branching the core rules for every battle |

During stages 1-3, placeholder data is sufficient when clearly labelled. Historical research can proceed alongside the engine. The first milestone should remain small enough to inspect and run before implementing the rest.

Meaningful automated checks should cover river barriers and bridge routing; movement collisions and blocked chains; opposing swaps; simultaneous fire; deterministic replay; visibility changes; information leakage in state and replay payloads; duplicate commitments; reconnecting after commitment; restarting the host program; and save/reload producing the same next turn. Manually verify connection and resumption between two separate computers.

Initial playtest questions:

- Can a newcomer issue a sensible plan after a short explanation?
- Are delays, failed attacks and supply problems understandable?
- Are there worthwhile alternatives to a frontal attack?
- Does reconnaissance change decisions?
- Can the defender trade territory for time?
- Can a player recover from an error without the winner becoming predetermined too early?

## 10. First instruction for the coding session

Put this file in an empty project folder and open that folder in VS Code. Give the coding assistant this instruction:

> Read WW2_Hex_Game_Development_Brief.md and implement Stage 1 only. Create the TypeScript project structure, a runnable browser client, an engine package independent of the UI, and a clearly labelled synthetic scenario. Implement hex selection, pan/zoom, terrain, edge-based rivers and a usable bridge, unit selection, route previews, Advance orders and a development control that steps movement through a turn. Preserve unfinished movement across turns. Keep committed-order and event types suitable for the simultaneous resolver in Stage 2. Design for a host program running on one player's computer, with zero required paid hosting or paid backend services. Add meaningful checks for pathfinding and river crossings, run the relevant checks, and document how to start and inspect the prototype. Keep historical quantities and equipment explicitly provisional until sourced. Record routine implementation assumptions and proceed with sensible defaults.

After inspecting Stage 1, use Stage 2 to establish fair simultaneous resolution. Stage 3 is the first complete two-player match. Wider campaign content follows the successful playtest of that match.

## Sources

These references establish the broad historical setting and the proposed tools. They do not constitute a researched order of battle or a fully sourced 1944 map.

1. National Army Museum, Operation Market Garden: https://www.nam.ac.uk/explore/market-garden
2. Imperial War Museums, 30th Corps captures the great road bridge at Nijmegen, film record: https://film.iwmcollections.org.uk/record/29691
3. PixiJS, Introduction: https://pixijs.com/8.x/guides/getting-started/intro
4. websockets/ws, official repository and documentation: https://github.com/websockets/ws
5. US Army Garrison Benelux, Battle of the Bulge 101: https://home.army.mil/benelux/index.php/my-fort/news/battle-bulge-101
6. Tailscale, current Personal plan and personal-use examples, checked 15 October 2026: https://tailscale.com/pricing
7. Tailscale, direct and relayed connection types: https://tailscale.com/docs/reference/connection-types
