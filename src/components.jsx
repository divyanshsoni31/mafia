import { useEffect, useState } from 'react';
import { CAUSE_LABELS } from './game/elimination.js';
import { teamOf } from './game/roles.js';
import { nameOf } from './game/engine.js';

export const PHASES = {
  reveal: 'Role Reveal',
  night: 'Night',
  morning: 'Morning',
  day: 'Discussion',
  primary: 'Primary Vote',
  defense: 'Defense',
  final: 'Final Vote',
  bomber: 'Suicide Bomber',
  dayEnd: 'Day Result',
  over: 'Game Over',
};

const canFullscreen = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

export function FullscreenButton({ className = 'btn small ghost', label = false }) {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (!canFullscreen()) return null; // e.g. iPhone Safari: use Add to Home Screen instead
  const toggle = () => (on ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  return (
    <button className={className} onClick={toggle} aria-label={on ? 'Exit full screen' : 'Full screen'}>
      {on ? '⤡' : '⛶'}
      {label && (on ? ' Exit full screen' : ' Play full screen')}
    </button>
  );
}

export function ConfirmButton({ title, message, confirmLabel = 'Confirm', danger, onConfirm, className = 'btn', disabled, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div className="backdrop" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
            <h3>{title}</h3>
            {message && <p className="muted">{message}</p>}
            <div className="row">
              <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className={`btn ${danger ? 'danger' : 'primary'}`}
                autoFocus
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Generated avatar: initials on a gradient whose colour comes from the name.
export function Avatar({ name, size = 36, dead }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)) >>> 0;
  const hue = Math.round(h * 137.508) % 360; // golden angle: similar names still get distinct colours
  const initials = name.trim().split(/\s+/).map((w) => [...w][0]).slice(0, 2).join('').toUpperCase();
  return (
    <span
      className={`avatar${dead ? ' dead' : ''}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 50) % 360} 65% 32%))`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function PlayerGrid({ players, selected, onPick, badge }) {
  if (!players.length) return <p className="empty">No eligible players.</p>;
  return (
    <div className="grid">
      {players.map((p) => {
        const on = Array.isArray(selected) ? selected.includes(p.id) : selected === p.id;
        return (
          <button key={p.id} className={`pcard${on ? ' on' : ''}`} aria-pressed={on} onClick={() => onPick(p.id)}>
            <Avatar name={p.name} size={34} />
            <span className="pname grow">{p.name}</span>
            {badge?.(p)}
          </button>
        );
      })}
    </div>
  );
}

export function GodOnly({ title = 'God only', children }) {
  return (
    <div className="godonly">
      <div className="godtag">🔒 {title}</div>
      {children}
    </div>
  );
}

export function RoleTag({ role }) {
  return <span className={`roletag ${teamOf(role).toLowerCase()}`}>{role}</span>;
}

export function EliminationHistory({ game, dispatch, showRoles }) {
  if (!game.eliminations.length) return <p className="empty">Nobody has been eliminated yet.</p>;
  return (
    <ul className="list">
      {game.eliminations.map((e) => {
        const p = game.players.find((x) => x.id === e.playerId);
        return (
          <li key={e.playerId} className="listrow">
            <div className="grow">
              <div className="pname">{p.name}</div>
              <div className="muted small">
                {CAUSE_LABELS[e.cause]} · {e.cause === 'night' ? 'Night' : 'Day'} {e.round}
              </div>
            </div>
            {showRoles || e.roleRevealed ? (
              <RoleTag role={p.role} />
            ) : (
              dispatch && (
                <ConfirmButton
                  className="btn small ghost"
                  title={`Reveal ${p.name}'s role?`}
                  message="Their role will be shown in the graveyard for everyone."
                  confirmLabel="Reveal"
                  onConfirm={() => dispatch({ type: 'REVEAL_ROLE', playerId: p.id })}
                >
                  Reveal role
                </ConfirmButton>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}

function GodPanel({ game, dispatch, onClose }) {
  const [showRoles, setShowRoles] = useState(false);
  const alive = game.players.filter((p) => p.alive);
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="God panel" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>God Panel</h2>
          <button className="btn small ghost" onClick={onClose}>Close</button>
        </div>
        <p className="warn">🔒 God only — don't show this screen to the players.</p>

        <div className="stats4">
          <div><b>{game.round}</b><span>Round</span></div>
          <div><b>{PHASES[game.phase]}</b><span>Phase</span></div>
          <div><b>{alive.length}</b><span>Alive</span></div>
          <div><b>{game.players.length - alive.length}</b><span>Out</span></div>
        </div>

        <div className="row between">
          <h3>Living players</h3>
          {showRoles ? (
            <button className="btn small ghost" onClick={() => setShowRoles(false)}>Hide roles</button>
          ) : (
            <ConfirmButton
              className="btn small ghost"
              title="Show all roles?"
              message="Make sure no player can see the screen."
              confirmLabel="Show roles"
              onConfirm={() => setShowRoles(true)}
            >
              Show roles
            </ConfirmButton>
          )}
        </div>
        <ul className="list">
          {alive.map((p) => (
            <li key={p.id} className="listrow">
              <span className="pname grow">{p.name}</span>
              {showRoles && <RoleTag role={p.role} />}
            </li>
          ))}
        </ul>

        <h3>Eliminated</h3>
        <EliminationHistory game={game} dispatch={dispatch} showRoles={showRoles} />

        {game.policeResults.length > 0 && (
          <>
            <h3>Investigations</h3>
            <ul className="list">
              {game.policeResults.map((r) => (
                <li key={r.round} className="listrow">
                  <span className="grow">Night {r.round}: {nameOf(game, r.targetId)}</span>
                  <span className={r.isMafia ? 'txt-danger' : 'txt-success'}>{r.isMafia ? 'Mafia' : 'Not Mafia'}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3>Event history</h3>
        {game.log.length ? (
          <ol className="log">
            {[...game.log].reverse().map((l, i) => (
              <li key={i}>{l.text}</li>
            ))}
          </ol>
        ) : (
          <p className="empty">No events yet.</p>
        )}
      </div>
    </div>
  );
}

export function Header({ game, dispatch, onQuit }) {
  const [panel, setPanel] = useState(false);
  const alive = game.players.filter((p) => p.alive).length;
  return (
    <header className="app-header">
      <div className="toprow">
        <span className="brand">Shadow Mafia</span>
        <div className="row tight">
          <FullscreenButton />
          <button className="btn small ghost" onClick={() => setPanel(true)}>🔒 God</button>
          <ConfirmButton
            className="btn small ghost"
            title="Quit this game?"
            message="All progress in this game will be lost."
            danger
            confirmLabel="Quit game"
            onConfirm={onQuit}
          >
            Quit
          </ConfirmButton>
        </div>
      </div>
      <div className="toprow muted small">
        <span>
          <span className="badge">{game.phase === 'reveal' ? 'Setup' : `Round ${game.round}`}</span>
          <span className="badge accent">{PHASES[game.phase]}</span>
        </span>
        <span>{alive} alive · {game.players.length - alive} out</span>
      </div>
      {panel && <GodPanel game={game} dispatch={dispatch} onClose={() => setPanel(false)} />}
    </header>
  );
}
