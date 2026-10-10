import { useState } from 'react';
import {
  ROLES, ROLE_NAMES, DEFAULT_COUNTS, DEFAULT_SETTINGS, MIN_PLAYERS, MAX_PLAYERS, validateSetup, duplicateNames, teamOf,
} from '../game/roles.js';
import { RoleTag } from '../components.jsx';
import { RoleArt } from '../RoleArt.jsx';

export default function Setup({ onStart, onBack }) {
  const [names, setNames] = useState(Array(7).fill(''));
  const [counts, setCounts] = useState(DEFAULT_COUNTS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const errors = validateSetup(names, counts);
  const dupes = duplicateNames(names);
  const total = ROLE_NAMES.reduce((t, r) => t + counts[r], 0);
  const left = names.length - total;

  const resize = (n) => {
    n = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n));
    setNames((ns) => (n > ns.length ? [...ns, ...Array(n - ns.length).fill('')] : ns.slice(0, n)));
  };
  const setName = (i, v) => setNames((ns) => ns.map((x, j) => (j === i ? v : x)));
  const removeName = (i) => setNames((ns) => ns.filter((_, j) => j !== i));
  const setCount = (r, c) => setCounts((cs) => ({ ...cs, [r]: c }));
  const setRule = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const start = () => !errors.length && onStart({ names: names.map((n) => n.trim()), counts, settings });

  return (
    <div className="stack">
      <button className="btn small ghost self-start" onClick={onBack}>← Back</button>
      <h1>New Game</h1>

      <section className="card">
        <div className="row between">
          <h3>Players</h3>
          <div className="stepper" aria-label="Player count">
            <button className="btn small ghost" disabled={names.length <= MIN_PLAYERS} onClick={() => resize(names.length - 1)} aria-label="Fewer players">−</button>
            <b>{names.length}</b>
            <button className="btn small ghost" disabled={names.length >= MAX_PLAYERS} onClick={() => resize(names.length + 1)} aria-label="More players">+</button>
          </div>
        </div>
        <div className="names">
          {names.map((n, i) => {
            const bad = dupes.has(n.trim().toLowerCase());
            return (
              <div key={i} className="namerow">
                <span className="num">{i + 1}</span>
                <input
                  className={bad ? 'invalid' : ''}
                  value={n}
                  maxLength={24}
                  placeholder={`Player ${i + 1} name`}
                  aria-label={`Player ${i + 1} name`}
                  onChange={(e) => setName(i, e.target.value)}
                />
                <button
                  className="btn small ghost icon"
                  disabled={names.length <= MIN_PLAYERS}
                  onClick={() => removeName(i)}
                  aria-label={`Remove player ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <button className="btn ghost" disabled={names.length >= MAX_PLAYERS} onClick={() => resize(names.length + 1)}>+ Add player</button>
      </section>

      <section className="card">
        <div className="row between">
          <h3>Roles</h3>
          <span className={`pill ${left === 0 ? 'ok' : 'bad'}`}>
            {total}/{names.length} · {left >= 0 ? `${left} slot${left === 1 ? '' : 's'} left` : `${-left} too many`}
          </span>
        </div>
        {ROLE_NAMES.map((r) => (
          <div key={r} className={`rolerow${counts[r] ? '' : ' off'}`}>
            <RoleArt role={r} size={40} />
            <div className="grow">
              <RoleTag role={r} />
              <div className="muted small">{teamOf(r)}{ROLES[r].max === 1 ? ' · max 1' : ''}</div>
            </div>
            <div className="stepper">
              <button className="btn small ghost" disabled={counts[r] <= 0} onClick={() => setCount(r, counts[r] - 1)} aria-label={`Fewer ${r}`}>−</button>
              <b>{counts[r]}</b>
              <button className="btn small ghost" disabled={counts[r] >= ROLES[r].max || left <= 0} onClick={() => setCount(r, counts[r] + 1)} aria-label={`More ${r}`}>+</button>
            </div>
          </div>
        ))}
        {left > 0 && (
          <button className="btn ghost" onClick={() => setCount('Villager', counts.Villager + left)}>Fill {left} remaining with Villagers</button>
        )}
      </section>

      <section className="card">
        <h3>House rules</h3>
        <label className="check">
          <input type="checkbox" checked={settings.healerSelfHeal} onChange={(e) => setRule('healerSelfHeal', e.target.checked)} />
          Healer may protect themselves
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.healerConsecutive} onChange={(e) => setRule('healerConsecutive', e.target.checked)} />
          Healer may protect the same player two nights in a row
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.jokerEndsGame} onChange={(e) => setRule('jokerEndsGame', e.target.checked)} />
          Joker's win ends the whole game (otherwise it is recorded as an individual win and play continues)
        </label>
        <label className="field">
          If the runoff vote is tied
          <select value={settings.finalTieRule} onChange={(e) => setRule('finalTieRule', e.target.value)}>
            <option value="none">Nobody is eliminated</option>
            <option value="god">God may choose among the tied players</option>
          </select>
        </label>
      </section>

      <section className="card">
        <h3>Summary</h3>
        <div className="chips">
          {ROLE_NAMES.filter((r) => counts[r]).map((r) => (
            <span key={r} className="chip">{counts[r]} × {r}</span>
          ))}
        </div>
        <p className="muted small">
          Town {ROLE_NAMES.filter((r) => teamOf(r) === 'Town').reduce((t, r) => t + counts[r], 0)} · Mafia {counts.Mafia} · Independent{' '}
          {counts.Joker + counts['Suicide Bomber']}
        </p>
        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
      </section>

      <button className="btn primary big sticky" disabled={errors.length > 0} onClick={start}>
        Shuffle roles & start
      </button>
    </div>
  );
}
