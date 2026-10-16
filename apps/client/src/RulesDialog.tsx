import type { Rules } from '@ww2hex/engine';
import { useEffect } from 'react';
import { READINESS } from './map/style.ts';

/**
 * The rules in brief, for reading mid-game. Every number comes from the rules
 * object, so this text cannot drift from what the engine does. The full
 * player's guide is docs/players-guide.md.
 */
export function RulesDialog({ rules, onClose }: { rules: Rules; onClose: () => void }) {
  const r = rules;
  const turnMinutes = r.stepMinutes * r.stepsPerTurn;
  const indirectRanges = Object.values(r.weapons)
    .map((w) => w.indirectRange)
    .filter((n) => n > 0);
  const indirectMin = Math.min(...indirectRanges);
  const indirectMax = Math.max(...indirectRanges);
  const rifleRange = r.weapons['rifle-section']?.directRange ?? 1;
  const tankRange = r.weapons['medium-tank']?.directRange ?? 2;
  const flakRange = r.weapons['heavy-flak']?.directRange ?? 3;
  const prepLevel3 = 100 - r.preparationPerLevel * r.maxPreparationDefend;
  const perTurnRecovery = r.cohesionRecovery * r.stepsPerTurn;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal rules" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Rules in brief">
        <h2>Rules in brief</h2>
        <p className="muted small">
          Numbers are provisional playtest values (rules {r.rulesVersion}). The full{' '}
          <a href="guide.html" target="_blank" rel="noopener">
            player’s guide
          </a>{' '}
          opens in a new tab and can be searched.
        </p>

        <section>
          <h3>The turn</h3>
          <ul>
            <li>
              Both players plan in secret and <strong>lock</strong>. The turn then plays out for both at once: {turnMinutes / 60} hours
              in {r.stepsPerTurn} steps of {r.stepMinutes} minutes. Nobody moves first.
            </li>
            <li>You see only what your own units saw. Enemy units are contacts: a position, a rough type, when last seen.</li>
            <li>One unit per hex. Orders stand until completed or changed; a unit with no order holds and returns fire.</li>
          </ul>
        </section>

        <section>
          <h3>Orders</h3>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Moves</th>
                <th>Fires</th>
                <th>Stops</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Advance</strong> <kbd>A</kbd>
                </td>
                <td>Along the route</td>
                <td>Yes, weaker while moving</td>
                <td>On seeing an enemy within {r.advanceHaltRadius} hexes, or at the destination</td>
              </tr>
              <tr>
                <td>
                  <strong>Attack</strong> <kbd>T</kbd>
                </td>
                <td>To the target, never halting</td>
                <td>Yes, with the assault bonus into the hex it is entering</td>
                <td>When the hex is taken; it then Defends there</td>
              </tr>
              <tr>
                <td>
                  <strong>Attack</strong> (artillery)
                </td>
                <td>No</td>
                <td>Bombards the chosen hex every step, seen or not</td>
                <td>When you change the order</td>
              </tr>
              <tr>
                <td>
                  <strong>Withdraw</strong> <kbd>W</kbd>
                </td>
                <td>Along the route, never halting</td>
                <td>
                  <strong>No</strong>
                </td>
                <td>At the destination. Quiet: not firing keeps it harder to see</td>
              </tr>
              <tr>
                <td>
                  <strong>Defend</strong> <kbd>D</kbd>
                </td>
                <td>No</td>
                <td>Yes</td>
                <td>Digs in to level {r.maxPreparationDefend}</td>
              </tr>
              <tr>
                <td>No order</td>
                <td>No</td>
                <td>Yes</td>
                <td>Digs in to level {r.maxPreparationOther} only</td>
              </tr>
            </tbody>
          </table>
          <ul>
            <li>
              <kbd>Shift</kbd>+right-click adds waypoints; a plain right-click on the destination places the order.
            </li>
            <li>
              Routes go round your own stopped units and never round the enemy. A route into an enemy-held hex stops in front of it.
            </li>
            <li>
              Columns queue: the unit that has waited longest goes first. A moving unit passes straight through one stopped friend when
              its route goes on beyond.
            </li>
            <li>
              <strong>Digging in:</strong> one level per {r.stepsPerPreparationLevel * r.stepMinutes} minutes standing still, each cutting
              damage taken by {r.preparationPerLevel} points (level {r.maxPreparationDefend} takes {prepLevel3}%). Moving resets it.
            </li>
          </ul>
        </section>

        <section>
          <h3>Seeing</h3>
          <ul>
            <li>
              A unit sees {r.spotRange.infantry} hexes ({r.spotRange.recon} for reconnaissance), with line of sight. Woods, towns and higher
              ground in between block the view. Your side shares everything any unit sees.
            </li>
            <li>
              A target in <strong>woods or a town</strong> can be seen from only {r.concealment.woods} hex; in the open from{' '}
              {r.concealment.clear}. Moving adds {r.movedVisibilityBonus}, <strong>firing adds {r.firedVisibilityBonus}</strong>.
            </li>
            <li>A lost contact stays on your map at its last-seen time until one of your units finds the hex empty.</li>
            <li>
              <strong>Dusk and night:</strong> in twilight every spotting distance is halved; at night a unit sees only the next hex, except an
              enemy that fires, whose muzzle flash shows out to {r.night.flashSpotRange} hexes.
            </li>
          </ul>
        </section>

        <section>
          <h3>Fighting</h3>
          <ul>
            <li>
              Every step each unit fires at the target it would hurt most; both sides fire at once. Infantry reaches {rifleRange} hex,
              tanks and anti-tank guns {tankRange}, the 8.8 cm flak {flakRange}; direct fire is {r.rangePercent.slice(1).join('% / ')}% at
              1 / 2 / 3 hexes. Artillery bombards {indirectMin} to {indirectMax} hexes at full effect, or a hex nobody can see at{' '}
              {r.unobservedIndirectPercent}%.
            </li>
            <li>
              Tanks and armoured cars are hard targets: anti-tank guns hurt them, rifles barely do. Everything else is soft. Every{' '}
              {r.damagePerVehicle} damage to a hard target knocks out a vehicle and its crew.
            </li>
          </ul>
          <table>
            <thead>
              <tr>
                <th>Factor</th>
                <th>Fire</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Firer’s cohesion</td>
                <td>50% + half the cohesion</td>
              </tr>
              <tr>
                <td>Firer’s supply</td>
                <td>
                  Supplied {r.supplyPercent.supplied}%, Low {r.supplyPercent.low}%, Exhausted {r.supplyPercent.exhausted}%
                </td>
              </tr>
              <tr>
                <td>Target’s terrain</td>
                <td>
                  Clear {r.terrainProtection.clear}%, polder {r.terrainProtection.polder}%, woods {r.terrainProtection.woods}%, town{' '}
                  {r.terrainProtection.town}%
                </td>
              </tr>
              <tr>
                <td>Target dug in</td>
                <td>
                  −{r.preparationPerLevel}% per level (level {r.maxPreparationDefend}: {prepLevel3}%)
                </td>
              </tr>
              <tr>
                <td>Target caught moving in the open</td>
                <td>{r.exposedPercent}%</td>
              </tr>
              <tr>
                <td>Assault (Attack into the hex it is entering, cohesion ≥ {r.assaultMinCohesion})</td>
                <td>
                  <strong>{r.assaultPercent}%</strong>
                </td>
              </tr>
              <tr>
                <td>Assault across a river, bridge or not</td>
                <td>
                  Major river {r.riverAssaultPercent.major}%, stream {r.riverAssaultPercent.stream}%
                </td>
              </tr>
              <tr>
                <td>Bombarding a hex nobody on your side can see</td>
                <td>{r.unobservedIndirectPercent}%</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3>Cohesion</h3>
          <ul>
            <li>
              Taking any damage costs {r.cohesionHitPenalty}, plus {r.cohesionPerLossPercent} per percent of starting strength lost that
              step. A step without damage gives back <strong>+{r.cohesionRecovery}</strong>: about {perTurnRecovery} in a quiet turn.
            </li>
            <li>
              Below <strong>{r.breakCohesion}</strong> a unit breaks: its order is cleared and it falls back one hex. With nowhere to go it
              is pinned (−{r.pinnedPenalty}), and a pinned unit at 0 surrenders. Down to {r.destroyedAtPercent}% of its strength it is
              destroyed.
            </li>
            <li>Men and vehicles never come back. Pull a battered unit out of sight, let it stand a turn or two, and it fights again, smaller.</li>
          </ul>
        </section>

        <section>
          <h3>Supply</h3>
          <ul>
            <li>
              Reserves (0 to 100) fall {r.supply.fireCost} a step firing, {r.supply.indirectFireCost} bombarding, {r.supply.moveCost} moving,
              and refill +{r.supply.resupplyPerStep} a step while a route from a supply source reaches the unit.
            </li>
            <li>
              <strong>Low</strong> below {r.supply.lowBelow} (fire {r.supplyPercent.low}%), <strong>Exhausted</strong> below{' '}
              {r.supply.exhaustedBelow} (fire {r.supplyPercent.exhausted}%).
            </li>
            <li>
              A route cannot pass an enemy-held hex or a hex next to an enemy unless you hold it. An enemy astride the road behind you cuts
              everything beyond.
            </li>
          </ul>
        </section>

        <section>
          <h3>Winning</h3>
          <ul>
            <li>
              An objective is held when your units stand in every one of its hexes at the <strong>end of a turn</strong>; passing through
              captures nothing. Some also need the unit there to be in supply.
            </li>
            <li>Hold it for the required number of turn ends and you win. Both on the same turn is a draw. A side with no units left loses.</li>
            <li>After the last turn, the scenario names the winner by default.</li>
          </ul>
        </section>

        <section>
          <h3>Counters</h3>
          <ul>
            <li>
              Bottom line: men (own units) or when last seen (contacts). In the replay a red number is the men lost this turn.
            </li>
            <li>
              Dot: cohesion {READINESS.good}+ green, {READINESS.fair}+ amber, below red; hollow when supply is Low or Exhausted. A red mark
              top-left means halted by something in the way.
            </li>
            <li>Dashed outline: a contact no longer seen. Colours: US olive, British khaki, German grey.</li>
          </ul>
        </section>

        <button className="primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
