# Stage 3 implementation notes

This records what Stage 3 (the first two-player match) added, and the decisions and defaults chosen
along the way. Every number is still a provisional playtest value (`rulesVersion
0.4.0-provisional`). Setting up and testing a game between two computers is covered in
[connection-guide.md](connection-guide.md).

## Completion check

The brief's check for Stage 3 is that two browser sessions complete a match, then the same on two
computers on the home network, then remotely using the free connection helper.

| Check | Status |
| --- | --- |
| Two browser sessions complete a match | **Done.** An automated test plays a full match to victory over real WebSockets. Separately, two Edge sessions were scripted through the actual interface, against a running host, from Host and Join to the result screen. The German page was reloaded mid-match and rejoined by itself. The host was also killed after one side locked, and restarted while both pages stayed open: both reconnected and the turn resolved |
| Two computers on the home network | **To do by hand.** Follow checklist B in the connection guide |
| Remotely over Tailscale | **To do by hand.** Follow checklist C in the connection guide |

The automated checks the brief lists for this stage are all in `apps/server/test/host.test.ts`:

- information leakage, checked on the exact messages each player receives;
- duplicate commitments;
- reconnecting after commitment;
- restarting the host program;
- save and reload producing the same next turn.

## What was added

| Area | Where |
| --- | --- |
| Objectives, hex control and victory, checked at turn boundaries | `packages/engine/src/objectives.ts`, scenario `objectives` and `victory` |
| A `finished` match phase, and the outcome held in the match state | `packages/engine/src/match.ts` |
| Message types, and validation of everything a browser sends | `packages/protocol` |
| Rooms, seats, credentials and the match lifecycle on the host | `apps/server/src/host.ts` |
| The only code that builds what a player receives | `apps/server/src/views.ts` |
| Saved matches: one JSON file per match | `apps/server/src/storage.ts` |
| HTTP and WebSocket server, origin checks, heartbeats, invitation addresses | `apps/server/src/server.ts` |
| Lobby (Host / Join / saved games), invitation box, objectives panel, result screen, reconnecting | `apps/client/src` |

## Decisions and defaults

**Objectives and victory**

- **Control changes only at the end of a turn.** The hex goes to the side with a unit standing in
  it then. Driving through during a turn captures nothing, and nothing needs tracking per step.
- **Control is public.** Both players see who holds each objective hex. It means holding an
  objective reveals that you have a unit there at the end of a turn. That seemed the right trade
  for a visible scoreboard.
- **How the result is decided.** A side with no units cannot win; if one side is wiped out, the
  other wins. Then objectives: if both sides meet one on the same turn, it is a draw. Then the
  time limit, with the scenario's default result.
- **The result is shown after the replay.** It stays hidden until a player has watched the turn
  that decided it. During a replay, the objectives panel shows control as it was before the turn.
- **The synthetic objective is a placeholder, not tuned.** The Allied side must hold Northton and
  the north end of the bridge for 2 turn ends by turn 8. Scripted engine runs under the 0.3.0
  rules:
  - an all-out Allied attack won on turn 3 against a passive defence;
  - a German counter-attack held out to the turn 8 time limit.

  Under 0.4.0 (below), the same counter-attack loses on turn 5. The old jam had been holding the
  Allied follow-up units short of the bridge. Balance needs playtesting.
- **`rulesVersion` 0.3.0 added objective control** to the game state.

**Changes after the first playtest (`rulesVersion 0.4.0-provisional`)**

- **Queues no longer jam.** When several friendly units want the same hex, the one that has waited
  longest goes first. A fixed compass order decides a tie. Previously all of them waited for ever.
  The playtester's units got stuck at the road junction south of the bridge for three turns.
- **Units go round their own stopped units.** If they can't, they wait. If a stopped friend holds
  their destination, they stop. Only the unit's own side is avoided, so movement reveals nothing
  about the enemy.
- **Assaults across a river are harder.** Across a major river the assault does 60%, even over a
  bridge; across a stream, 80%. An assault over the Northton bridge is now weaker than plain fire,
  which gives the defender of a river crossing the advantage the brief's scenario is about.
- Details and an example are in
  [combat-rules.md](combat-rules.md#queues-and-stopped-units).

**Identity and seats**

- **The room code claims an open side once.** Claiming issues a credential: 24 random bytes. The
  host stores only its SHA-256 hash. After both sides are claimed, the room code alone gets
  nothing. The guest's side is offered first.
- **Some actions work only from the host computer.** Creating games, listing saved games and
  releasing a seat are allowed only from the host computer itself. That means a browser
  connecting from `localhost`, or from one of the host computer's own network addresses (so the
  home-network link works on the host computer too). A guest cannot see or start anything else on
  the host.
- **Releasing a seat is the recovery route.** It covers a lost or changed browser. The host
  releases that side, and the room code can then claim it again.
- **Ten wrong room codes or credentials from one address** block it for a minute.
- **WebSocket connections from other websites are refused.** The page must come from the host
  itself, and the address used to reach it must be one of:
  - an IP address;
  - `localhost`;
  - this computer's name;
  - a Tailscale `*.ts.net` name;
  - a name listed in `ALLOWED_HOSTS`.

  That blocks a web page the host player visits from talking to the host, including through DNS
  rebinding.
- **The browser keeps two copies of a seat.** The tab's current seat is in `sessionStorage`, so a
  reload rejoins it, and two tabs in one browser can test opposite sides. Every seat is also kept
  in `localStorage`, so it can be rejoined after the browser closes.

**Hosting and saving**

- **`npm run host` now listens on the network by default** (`HOST=0.0.0.0`, previously
  `127.0.0.1`). The whole point of the command is now to let a second computer join.
  `HOST=127.0.0.1` restores the old behaviour. Joining still needs the room code, and only the
  host computer can start or manage games.
- **Saves are JSON files, not SQLite.** One file per match in `saves/` (git-ignored). A write goes
  to a temporary file which then replaces the old one, so a crash mid-save leaves the previous
  save intact. Writes are synchronous. The storage adapter is separate, so SQLite can replace it
  later.
- **Every change is saved before anyone is told about it.** If saving fails, the change is not
  applied and the player gets an error. A retry then works. This, together with the engine's
  rule that only the second lock resolves, means a turn resolves exactly once, even across
  restarts.
- **A save holds a copy of its scenario.** Later edits to a scenario file cannot corrupt a match
  in progress.
- **A save made under a different `rulesVersion` is listed but will not resume.** Old rules would
  give different results.
- **One host can hold several matches.** Each has its own room code.
- **Dropped connections show within about 10–20 seconds.** The host pings every 10 seconds.

**What the browser gets**

- **The client no longer contains the scenario.** In Stage 2 the whole scenario file was compiled
  into the page, enemy forces included. Now the host sends each player a public version: the map,
  equipment catalogue, objectives and that side's own formations. It carries no units, no enemy
  formations and no events.
- **Hot-seat play and the Umpire view are gone.** Both needed the full game state in the browser,
  and keeping it out of the browser is the purpose of this stage. Two browser windows on one
  computer replace hot-seat testing. The Stage 2 commit still has both if they are wanted as a
  separate development tool.
- **Order validation gives the same answer for an enemy unit and a missing one.** The message is
  "allied has no unit X" in both cases. The old messages differed, which over the network would
  have let a player test whether a hidden enemy unit was still alive.
- **A lock is sent again if it may not have arrived.** If the connection drops after you press
  Lock, the page sends the orders again on reconnecting. A repeat is harmless.
- **Draft orders survive a page reload.** They are kept in `sessionStorage` per turn.

**Windows and macOS**

- **Either kind of computer can host or join.** Nothing in the host or client is specific to
  Windows.
- **Ctrl+click counts as a right-click on every platform.** On a Mac it is the usual way to
  right-click. Two-finger trackpad clicks are already true right-clicks.
- **Trackpad pinch zooms the map.** Firefox's line-based scroll wheel zooms at the same rate as
  other browsers.
- **The invitation box lists real network addresses first.** Adapters belonging to virtual
  machines and containers (Hyper-V, WSL, Docker, VirtualBox, VMware, Parallels) come last.
- **Not yet tested on a Mac or in Safari.** The browser runs used Edge on Windows.

## Where hidden information lives

- **The host program and its save files** hold the complete state. They never send it to a
  browser.
- **Each browser** receives only:
  - its own side's view (`SideView`);
  - the events its side observed;
  - the public objective status;
  - its own locked orders.

  The leakage test reads every message each player received over a four-turn battle. It checks
  that none contains:
  - an enemy unit or formation id or name;
  - the authoritative event log;
  - enemy losses;
  - credential hashes.

  A deliberately leaky change to `views.ts` makes the test fail.
- **The host player could open the files in `saves/`** and see everything. That is inherent in one
  player's computer being the server; the brief's hosting model accepts it.
- **Traffic is plain HTTP.** On a home network, the WebSocket traffic is unencrypted. Over
  Tailscale it is encrypted by Tailscale.

## Stage 4 hand-off

What the existing code already provides:

- **Scenario objectives** are data. More `kind`s, such as a supplied bridgehead, fit beside
  `hold`.
- **`evaluateVictory`** runs at every turn boundary, so supply-based conditions can be added
  there.
- **The host sends players only `views.ts` output.** New information, such as supply status or
  reinforcement arrivals, should be added there and to the leakage test.
- **Saves embed the scenario and check `rulesVersion`**, so changing rules will not silently break
  old matches.

What Stage 4 needs (from the brief):

1. **A georeferenced Nijmegen map**, with a sourced roster and equipment, and uncertain values
   labelled.
2. **Basic supply tracing**: Supplied, Low and Exhausted, with reserves. This allows the brief's
   "supplied bridgehead" objective.
3. **A reinforcement schedule** through scenario `events`. The public scenario already strips
   `events`.

## Known limitations

- **The browser test script is not in the repository.** It needs `playwright-core` and an
  installed Edge, so it was kept out. The WebSocket-level match test covers the same flow
  automatically.
- **Replay position is not saved.** A reload during a replay starts it again from the beginning.
  Whether each player has finished is saved.
- **No spectators, no planning timer, no in-game chat.**
- **Seats are tied to a browser profile.** Anyone using that profile can rejoin the seat.
- **Only the synthetic scenario exists.**
