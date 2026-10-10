import { useState } from 'react';
import { nameOf } from '../game/engine.js';
import { WIN_MESSAGES } from '../game/elimination.js';
import { Avatar, ConfirmButton, GodOnly } from '../components.jsx';
import { Graveyard, Skyline, Stamp } from '../Scenes.jsx';

export function Morning({ game, dispatch }) {
  const [show, setShow] = useState(false);
  const result = game.policeResults.find((r) => r.round === game.round);
  const announcement = game.announcements.find((a) => a.round === game.round && a.time === 'night');
  const killed = game.eliminations.find((e) => e.round === game.round && e.cause === 'night');

  return (
    <section className="stack">
      {result && (
        <GodOnly title="God only — Policeman's result">
          {show ? (
            <div className="stack">
              <p className="big">
                {nameOf(game, result.targetId)} is{' '}
                <b className={result.isMafia ? 'txt-danger' : 'txt-success'}>{result.isMafia ? 'MAFIA' : 'NOT Mafia'}</b>
              </p>
              <button className="btn primary" onClick={() => setShow(false)}>Hide result</button>
            </div>
          ) : (
            <button className="btn ghost" onClick={() => setShow(true)}>Show investigation result</button>
          )}
          <p className="muted small">Tell the Policeman privately (for example, thumbs up or down), then hide this before showing the group.</p>
        </GodOnly>
      )}

      {!show && (
        <>
          <Skyline time="dawn" size="tall">
            <p className="eyebrow">Morning · Day {game.round}</p>
            <h2>{announcement?.text}</h2>
            {game.winner && <p className="big">{WIN_MESSAGES[game.winner]}</p>}
          </Skyline>
          {killed ? (
            <Stamp name={nameOf(game, killed.playerId)} label="Killed" />
          ) : (
            <div className="stamp-wrap"><span className="safe-emblem">🛡️</span><span className="stamp safe">Everyone survived</span></div>
          )}
          <div className="row">
            <ConfirmButton
              className="btn ghost"
              title="Undo this night?"
              message="The night's results will be reverted and you can re-enter the actions."
              confirmLabel="Undo night"
              danger
              onConfirm={() => dispatch({ type: 'UNDO_NIGHT' })}
            >
              Undo night
            </ConfirmButton>
            <button className="btn primary" onClick={() => dispatch({ type: 'START_DAY' })}>
              {game.winner ? 'See results' : 'Begin discussion'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function Discussion({ game, dispatch }) {
  const alive = game.players.filter((p) => p.alive);
  return (
    <section className="stack">
      <Skyline time="dawn" size="banner">
        <p className="eyebrow">Day {game.round}</p>
        <h2>Discussion</h2>
        <p>Talk it out. When the group is ready, start a vote.</p>
      </Skyline>
      <div className="card">
        <h3>Living players ({alive.length})</h3>
        <div className="tokens static">
          {alive.map((p) => (
            <span key={p.id} className="token">
              <Avatar name={p.name} size={54} />
              <span className="token-name">{p.name}</span>
            </span>
          ))}
        </div>
      </div>
      <Graveyard game={game} />
      <button className="btn primary big" onClick={() => dispatch({ type: 'START_PRIMARY' })}>Start primary vote (nominations)</button>
      <ConfirmButton
        className="btn ghost big"
        title="Skip straight to the final vote?"
        message="Skip nominations and defense. Every living player votes for anyone; whoever gets the most votes is eliminated. A tie goes to a runoff."
        confirmLabel="Go to final vote"
        onConfirm={() => dispatch({ type: 'START_OPEN_VOTE' })}
      >
        Skip to final vote
      </ConfirmButton>
      <ConfirmButton
        className="btn ghost"
        title="Skip voting today?"
        message={`Nobody will be eliminated today. Night ${game.round + 1} begins.`}
        confirmLabel="Skip to night"
        onConfirm={() => dispatch({ type: 'START_NIGHT' })}
      >
        Skip vote & start night
      </ConfirmButton>
    </section>
  );
}

export function Defense({ game, dispatch }) {
  const [speaking, setSpeaking] = useState(null);
  const [done, setDone] = useState([]);
  return (
    <section className="stack">
      <div className="card">
        <p className="eyebrow">Day {game.round}</p>
        <h2>Defense</h2>
        <p className="muted">Each nominee gets a chance to defend themselves.</p>
      </div>
      <ul className="list">
        {game.nominees.map((id) => (
          <li key={id} className={`card listrow${speaking === id ? ' speaking' : ''}`}>
            <Avatar name={nameOf(game, id)} size={40} />
            <span className="pname grow">{nameOf(game, id)}{speaking === id && <span className="mic"> 🎙️ speaking…</span>}</span>
            {speaking === id ? (
              <button className="btn small primary" onClick={() => { setSpeaking(null); setDone([...done, id]); }}>End defense</button>
            ) : done.includes(id) ? (
              <span className="txt-success">✓ Done</span>
            ) : (
              <button className="btn small ghost" disabled={speaking !== null} onClick={() => setSpeaking(id)}>Start defense</button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmButton
        className="btn primary big"
        title="Start the final vote?"
        message={`${done.length} of ${game.nominees.length} defenses marked complete.`}
        confirmLabel="Start final vote"
        onConfirm={() => dispatch({ type: 'START_FINAL' })}
      >
        Start final vote
      </ConfirmButton>
    </section>
  );
}

export function DayEnd({ game, dispatch }) {
  const lines = game.announcements.filter((a) => a.round === game.round && a.time === 'day');
  const out = game.eliminations.filter((e) => e.round === game.round && e.cause !== 'night');
  return (
    <section className="stack">
      <div className="card announce">
        <p className="eyebrow">End of Day {game.round}</p>
        {lines.map((l, i) => <h2 key={i}>{l.text}</h2>)}
      </div>
      {out.length > 0 && (
        <div className="row stamps">
          {out.map((e) => (
            <Stamp key={e.playerId} name={nameOf(game, e.playerId)} label={e.cause === 'bomber' ? 'Blown up' : 'Voted out'} />
          ))}
        </div>
      )}
      <Graveyard game={game} />
      <ConfirmButton
        className="btn primary big"
        title={`Start Night ${game.round + 1}?`}
        message="Everyone should close their eyes."
        confirmLabel="Start night"
        onConfirm={() => dispatch({ type: 'START_NIGHT' })}
      >
        Start Night {game.round + 1}
      </ConfirmButton>
    </section>
  );
}
