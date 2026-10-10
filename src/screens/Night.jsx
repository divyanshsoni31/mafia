import { useState } from 'react';
import { nightSlots, validTargets, SLOT_LABEL } from '../game/night.js';
import { nameOf } from '../game/engine.js';
import { ConfirmButton, GodOnly, PlayerGrid } from '../components.jsx';
import { RoleArt } from '../RoleArt.jsx';
import { Skyline } from '../Scenes.jsx';

const SLOT_ROLE = { mafia: 'Mafia', healer: 'Healer', police: 'Policeman' };

const INSTRUCTIONS = {
  mafia: 'Mafia, open your eyes. Silently agree on one player to eliminate.',
  healer: 'Healer, open your eyes. Choose one player to protect tonight.',
  police: 'Policeman, open your eyes. Choose one player to investigate.',
};

export default function Night({ game, dispatch }) {
  const slots = nightSlots(game);
  const [i, setI] = useState(0);
  const slot = slots[i];
  const skipped = [['Healer', 'healer'], ['Policeman', 'police']].filter(([, s]) => !slots.includes(s)).map(([r]) => r);
  const ready = slots.every((s) => game.night[s]);

  const healerRules = [
    !game.settings.healerSelfHeal && 'cannot protect themselves',
    !game.settings.healerConsecutive && 'cannot protect last night’s player again',
  ].filter(Boolean);

  return (
    <section className="stack">
      <Skyline time="night" size="tall">
        <p className="eyebrow">Round {game.round}</p>
        <h2>Night falls</h2>
        <p>Everyone, close your eyes. God controls the phone.</p>
      </Skyline>
      <GodOnly title="God only — night actions">
        <div className="dots" aria-hidden="true">
          {[...slots, 'summary'].map((s, j) => <span key={s} className={j === i ? 'on' : j < i ? 'done' : ''} />)}
        </div>
        {slot ? (
          <div className="stack">
            <div className="row tight"><RoleArt role={SLOT_ROLE[slot]} size={48} /><h3>{SLOT_LABEL[slot]}</h3></div>
            <p className="muted">{INSTRUCTIONS[slot]}</p>
            {slot === 'healer' && healerRules.length > 0 && <p className="muted small">House rule: the Healer {healerRules.join(' and ')}.</p>}
            <PlayerGrid
              players={validTargets(game, slot)}
              selected={game.night[slot]}
              onPick={(id) => dispatch({ type: 'NIGHT_SET', slot, targetId: id })}
            />
            <div className="row">
              <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
              <button className="btn primary" disabled={!game.night[slot]} onClick={() => setI(i + 1)}>Next</button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <h3>Night summary</h3>
            <ul className="list">
              {slots.map((s) => (
                <li key={s} className="listrow">
                  <span className="grow muted">{SLOT_LABEL[s]}</span>
                  <b>{nameOf(game, game.night[s])}</b>
                </li>
              ))}
              {skipped.map((r) => (
                <li key={r} className="listrow">
                  <span className="grow muted">{r}</span>
                  <span className="muted">skipped (none alive)</span>
                </li>
              ))}
            </ul>
            {skipped.length > 0 && (
              <p className="muted small">Tip: still call skipped roles out loud, so nobody can tell who is gone.</p>
            )}
            <div className="row">
              <button className="btn ghost" onClick={() => setI(slots.length - 1)}>Edit</button>
              <ConfirmButton
                className="btn primary"
                disabled={!ready}
                title="Resolve the night?"
                message="All actions take effect at once. You can't change them afterwards unless you undo."
                confirmLabel="Resolve Night"
                onConfirm={() => dispatch({ type: 'RESOLVE_NIGHT' })}
              >
                Resolve Night
              </ConfirmButton>
            </div>
          </div>
        )}
      </GodOnly>
    </section>
  );
}
