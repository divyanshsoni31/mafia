import { useState } from 'react';
import { nameOf } from '../game/engine.js';
import { tally, topIds, finalOutcome } from '../game/voting.js';
import { Avatar, ConfirmButton, GodOnly, PlayerGrid } from '../components.jsx';
import { BallotBox, Gavel, Explosion } from '../Scenes.jsx';

function Ring({ value, total }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r={r} stroke="var(--line)" strokeWidth="6" fill="none" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - (total ? value / total : 0))} transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{value}/{total}</text>
    </svg>
  );
}

const Face = ({ game, id, size }) => <Avatar name={nameOf(game, id)} size={size} />;

function VoteRecorder({ game, dispatch }) {
  const vote = game.vote;
  const voters = game.players.filter((p) => p.alive);
  const firstOpen = (except) => voters.find((v) => v.id !== except && !(v.id in vote.votes))?.id ?? null;
  const [voterId, setVoterId] = useState(() => firstOpen());
  const [correcting, setCorrecting] = useState(false);
  const [peek, setPeek] = useState(false);
  const counts = tally(vote);
  const voted = Object.keys(vote.votes).length;
  const current = voterId ? vote.votes[voterId] : undefined;

  const choose = (targetId) => {
    dispatch({ type: 'CAST_VOTE', voterId, targetId, correct: correcting });
    setCorrecting(false);
    setVoterId(firstOpen(voterId));
  };
  const undo = () => {
    setVoterId(vote.log.at(-1).voterId);
    setCorrecting(false);
    dispatch({ type: 'UNDO_VOTE' });
  };

  return (
    <div className="stack">
      <div className="row between">
        <div className="row tight">
          <Ring value={voted} total={voters.length} />
          <span className="muted small">ballots cast</span>
        </div>
        <button className="btn small ghost" onClick={() => setPeek(!peek)}>{peek ? '🙈 Hide counts' : '👁 Peek counts'}</button>
      </div>
      {vote.log.length > 0 && <div key={vote.log.length} className="cast-toast">🗳️ Ballot recorded</div>}

      <h4>Who is voting?</h4>
      <div className="tokens">
        {voters.map((p) => (
          <button
            key={p.id}
            className={`token${p.id === voterId ? ' on' : ''}${p.id in vote.votes ? ' voted' : ''}`}
            aria-pressed={p.id === voterId}
            onClick={() => { setVoterId(p.id); setCorrecting(false); }}
          >
            <Avatar name={p.name} size={54} />
            <span className="token-name">{p.name}</span>
            {p.id in vote.votes && <span className="token-check">✓</span>}
          </button>
        ))}
      </div>

      {voterId ? (
        <div key={voterId} className="ballot">
          <div className="ballot-head">
            <Avatar name={nameOf(game, voterId)} size={52} />
            <div>
              <p className="eyebrow">Ballot of</p>
              <h3>{nameOf(game, voterId)}</h3>
            </div>
          </div>
          {current !== undefined && !correcting ? (
            <>
              <div className="row tight">
                <span className="muted">Voted for</span>
                <Face game={game} id={current} size={28} />
                <b>{nameOf(game, current)}</b>
              </div>
              <div className="row">
                <button className="btn ghost" onClick={() => setCorrecting(true)}>✏️ Change vote</button>
                <button className="btn ghost" onClick={() => dispatch({ type: 'REMOVE_VOTE', voterId })}>Remove vote</button>
              </div>
            </>
          ) : (
            <>
              <p className="muted small">Tap who {nameOf(game, voterId)} votes for:</p>
              <div className="grid">
                {vote.candidates.filter((id) => id !== voterId).map((id) => (
                  <button key={id} className="pcard target" onClick={() => choose(id)}>
                    <Face game={game} id={id} size={40} />
                    <span className="pname grow">{nameOf(game, id)}</span>
                    {peek && (
                      <span className="pips" aria-label={`${counts[id]} votes`}>
                        {counts[id] > 6 ? <b>{counts[id]}</b> : Array.from({ length: counts[id] }, (_, i) => <i key={i} />)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="ballot done-ballot">🎉 Everyone has voted. Close voting when ready.</div>
      )}

      <div className="row">
        <button className="btn ghost" disabled={!vote.log.length} onClick={undo}>↩ Undo last</button>
        <ConfirmButton
          className="btn primary"
          title="Close voting?"
          message={`${voted} of ${voters.length} living players voted. Anyone who hasn't voted counts as abstaining.`}
          confirmLabel="Close voting"
          onConfirm={() => dispatch({ type: 'CLOSE_VOTING' })}
        >
          🔒 Close voting
        </ConfirmButton>
      </div>
    </div>
  );
}

// Key resets the recorder whenever a fresh vote (re-vote / runoff) starts.
const voteKey = (v) => `${v.kind}-${v.candidates.join()}-${v.runoff}-${v.revote}`;

function Tally({ game, counts, top, mark = '👑' }) {
  const max = Math.max(1, ...Object.values(counts));
  const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  return (
    <ul className="list">
      {ids.map((id, i) => (
        <li key={id} className={`tallyrow${top.includes(id) ? ' lead' : ''}`} style={{ animationDelay: `${i * 0.12}s` }}>
          <Face game={game} id={id} size={36} />
          <span className="pname grow">{nameOf(game, id)} {top.includes(id) && top.length === 1 && <span className="mark">{mark}</span>}</span>
          <span className="bar"><span style={{ width: `${(counts[id] / max) * 100}%`, animationDelay: `${0.3 + i * 0.12}s` }} /></span>
          <b className="count">{counts[id]}</b>
        </li>
      ))}
    </ul>
  );
}

export function Primary({ game, dispatch }) {
  const v = game.vote;
  const [picks, setPicks] = useState([]);
  const title = v.revote ? 'Nomination tie-breaker' : 'Primary Vote — Nomination';

  if (!v.closed) {
    return (
      <section className="stack">
        <div className="card">
          <div className="row tight"><BallotBox /><div><p className="eyebrow">Day {game.round}</p><h2>{title}</h2></div></div>
          <p className="muted">Each living player names who should face the final vote. Nobody is eliminated now.</p>
        </div>
        <GodOnly title="God records votes">
          <VoteRecorder key={voteKey(v)} game={game} dispatch={dispatch} />
        </GodOnly>
      </section>
    );
  }

  const counts = tally(v);
  const top = topIds(counts);
  const names = top.map((id) => nameOf(game, id)).join(', ');
  const toggle = (id) => setPicks((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));

  return (
    <section className="stack">
      <div className="card">
        <h2>Nomination results</h2>
        <Tally game={game} counts={counts} top={top} />
      </div>
      {top.length === 0 && (
        <>
          <p className="muted">No votes were cast, so nobody is nominated.</p>
          <button className="btn primary big" onClick={() => dispatch({ type: 'NO_NOMINATION' })}>End the day</button>
        </>
      )}
      {top.length === 1 && (
        <>
          <p className="big"><b>{names}</b> is nominated.</p>
          <button className="btn primary big" onClick={() => dispatch({ type: 'NOMINATE', ids: top })}>Go to defense</button>
        </>
      )}
      {top.length > 1 && (
        <div className="card stack">
          <h3>Tie: {names}</h3>
          <button className="btn primary" onClick={() => dispatch({ type: 'NOMINATE', ids: top })}>Nominate all tied players</button>
          <button className="btn ghost" onClick={() => dispatch({ type: 'PRIMARY_REVOTE' })}>Re-vote among the tied players</button>
          <p className="muted small">Or God picks the nominees:</p>
          <PlayerGrid players={game.players.filter((p) => top.includes(p.id))} selected={picks} onPick={toggle} />
          <button className="btn ghost" disabled={!picks.length} onClick={() => dispatch({ type: 'NOMINATE', ids: picks })}>
            Nominate selected ({picks.length})
          </button>
        </div>
      )}
    </section>
  );
}

export function Final({ game, dispatch }) {
  const v = game.vote;
  const [pick, setPick] = useState(null);
  const title = v.runoff ? 'Runoff Vote' : 'Final Vote — Elimination';
  const suspects = v.runoff ? v.candidates : game.nominees;

  if (!v.closed) {
    return (
      <section className="stack">
        <div className="card">
          <div className="row tight"><Gavel /><div><p className="eyebrow">Day {game.round}</p><h2>{title}</h2></div></div>
          {suspects.length > 0 && (
            <div className="row tight wrap">
              <span className="muted small">{v.runoff ? 'Tied:' : 'Suspects:'}</span>
              {suspects.map((id) => <span key={id} className="chip danger">{nameOf(game, id)}</span>)}
            </div>
          )}
          <p className="muted small">
            {v.runoff
              ? 'Only the tied players can be voted for.'
              : 'Every living player can vote for any other living player.'}{' '}
            Whoever gets the most votes is eliminated. The counts stay hidden until God reveals them.
          </p>
        </div>
        <GodOnly title="God records votes">
          <VoteRecorder key={voteKey(v)} game={game} dispatch={dispatch} />
        </GodOnly>
      </section>
    );
  }

  if (!v.revealed) {
    return (
      <section className="card center stack reveal-wait">
        <div className="shake"><BallotBox size={110} /></div>
        <h2>The votes are in…</h2>
        <p className="muted">Gather everyone. The verdict stays sealed until God reveals it.</p>
        <ConfirmButton
          className="btn primary big"
          title="Reveal the results?"
          message="The vote counts will be shown to everyone."
          confirmLabel="Reveal"
          onConfirm={() => dispatch({ type: 'REVEAL_FINAL' })}
        >
          Reveal results
        </ConfirmButton>
      </section>
    );
  }

  const counts = tally(v);
  const top = topIds(counts);
  const o = finalOutcome(v);
  const decide = (targetId) => dispatch({ type: 'FINAL_DECIDE', targetId });

  return (
    <section className="stack">
      <div className="card">
        <h2>{title} — results</h2>
        <Tally game={game} counts={counts} top={top} mark="💀" />
      </div>
      {o.type === 'eliminate' && (
        <ConfirmButton
          className="btn danger big"
          title={`Eliminate ${nameOf(game, o.id)}?`}
          message="This can't be undone."
          danger
          confirmLabel="Eliminate"
          onConfirm={() => decide(o.id)}
        >
          Eliminate {nameOf(game, o.id)}
        </ConfirmButton>
      )}
      {o.type === 'runoff' && (
        <>
          <p className="big">Tie between {o.ids.map((id) => nameOf(game, id)).join(' and ')}.</p>
          <button className="btn primary big" onClick={() => dispatch({ type: 'START_RUNOFF' })}>Start runoff vote</button>
        </>
      )}
      {(o.type === 'none' || o.type === 'tie') && (
        <>
          <p className="big">{o.reason}</p>
          {o.type === 'tie' && game.settings.finalTieRule === 'god' && (
            <GodOnly title="House rule — God may break the tie">
              <PlayerGrid players={game.players.filter((p) => o.ids.includes(p.id))} selected={pick} onPick={setPick} />
              <ConfirmButton
                className="btn danger"
                disabled={!pick}
                title={`Eliminate ${nameOf(game, pick)}?`}
                message="God is breaking the tie. This can't be undone."
                danger
                confirmLabel="Eliminate"
                onConfirm={() => decide(pick)}
              >
                Eliminate selected
              </ConfirmButton>
            </GodOnly>
          )}
          <button className="btn primary big" onClick={() => decide(null)}>Nobody is eliminated — continue</button>
        </>
      )}
    </section>
  );
}

export function Bomber({ game, dispatch }) {
  const [pick, setPick] = useState(null);
  const bomber = game.eliminations.at(-1).playerId;
  return (
    <section className="stack">
      <div className="card announce bomb">
        <Explosion />
        <p className="eyebrow">Suicide Bomber</p>
        <h2>{nameOf(game, bomber)} was the Suicide Bomber!</h2>
        <p>They choose one living player to take down with them.</p>
      </div>
      <h3>Choose a target</h3>
      <PlayerGrid players={game.players.filter((p) => p.alive)} selected={pick} onPick={setPick} />
      <ConfirmButton
        className="btn danger big"
        disabled={!pick}
        title={`Eliminate ${nameOf(game, pick)}?`}
        message="This can't be undone."
        danger
        confirmLabel="Detonate"
        onConfirm={() => dispatch({ type: 'BOMBER_TARGET', targetId: pick })}
      >
        Detonate{pick ? ` — ${nameOf(game, pick)}` : ''}
      </ConfirmButton>
    </section>
  );
}
