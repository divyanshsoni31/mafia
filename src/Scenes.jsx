import { artFor } from './art.js';
import { CAUSE_LABELS } from './game/elimination.js';
import { Avatar, RoleTag } from './components.jsx';

// Deterministic pseudo-random so the skyline looks the same on every render.
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}
const rand = rng(42);
const BUILDINGS = [];
for (let x = 0; x < 400; ) {
  const w = 22 + Math.floor(rand() * 30);
  const h = 40 + Math.floor(rand() * 80);
  const windows = [];
  for (let wy = 160 - h + 8; wy < 150; wy += 12)
    for (let wx = x + 5; wx < x + w - 6; wx += 9) if (rand() < 0.28) windows.push([wx, wy]);
  BUILDINGS.push({ x, w, h, windows, spire: rand() < 0.15 });
  x += w + 2;
}
// Stars as CSS radial-gradient dots: crisp at any size (an SVG scaled to fill a tall screen made them blobs).
const STARS = Array.from({ length: 48 }, () => [rand() * 100, rand() * 58, 1 + rand() * 1.6]);
const starLayer = (layer) =>
  STARS.filter((_, i) => i % 2 === layer)
    .map(([x, y, r]) => `radial-gradient(${r}px ${r}px at ${x.toFixed(1)}% ${y.toFixed(1)}%, #fff 50%, rgba(255,255,255,0) 100%)`)
    .join(', ');
const STAR_BG = [starLayer(0), starLayer(1)];

// City at its natural proportions, pinned to the bottom of the scene.
function City({ time }) {
  return (
    <svg className="scene-city" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {BUILDINGS.map((bd, i) => (
        <g key={i}>
          <rect x={bd.x} y={160 - bd.h} width={bd.w} height={bd.h} fill="#07080d" />
          {bd.spire && <path d={`M${bd.x + bd.w / 2 - 3} ${160 - bd.h} L${bd.x + bd.w / 2} ${148 - bd.h} L${bd.x + bd.w / 2 + 3} ${160 - bd.h} Z`} fill="#07080d" />}
          {bd.windows.map(([wx, wy], j) => (
            <rect key={j} x={wx} y={wy} width="4" height="5" fill={time === 'night' ? '#fbbf24' : '#fde68a'} opacity={time === 'night' ? 0.8 : 0.35} />
          ))}
        </g>
      ))}
    </svg>
  );
}

// fx: extra welcome-screen effects (sweeping searchlights + drifting fog).
export function Skyline({ time = 'night', size = 'banner', fx = false, children }) {
  const img = artFor(time === 'night' ? 'night' : 'morning');
  return (
    <div className={`scene ${time} ${size}`}>
      {img ? (
        <img className="scene-img" src={img} alt="" />
      ) : (
        <>
          {time === 'night' && STAR_BG.map((bg, i) => <div key={i} className={`scene-stars s${i}`} style={{ backgroundImage: bg }} />)}
          {time === 'night' ? <div className="scene-moon" /> : <div className="scene-sun" />}
          {fx && (
            <>
              <div className="fx-beam l" />
              <div className="fx-beam r" />
            </>
          )}
          <City time={time} />
          {fx && <div className="fx-fog" />}
        </>
      )}
      <div className="scene-content">{children}</div>
    </div>
  );
}

function Tombstone({ name, children }) {
  return (
    <div className="tomb">
      <svg viewBox="0 0 100 120" aria-hidden="true">
        <defs>
          <linearGradient id="stone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4b5064" />
            <stop offset="1" stopColor="#262836" />
          </linearGradient>
        </defs>
        <path d="M12 120 V48 A38 38 0 0 1 88 48 V120 Z" fill="url(#stone)" stroke="#5c6178" strokeWidth="2" />
        <path d="M50 18 V40 M41 27 H59" stroke="#8a90a8" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 100 l6 -6 M78 108 l-5 -7 M70 60 l4 4" stroke="#1c1e29" strokeWidth="2" />
      </svg>
      <div className="tomb-text">
        <b>{name}</b>
        {children}
      </div>
    </div>
  );
}

export function Graveyard({ game, showRoles }) {
  if (!game.eliminations.length) return null;
  const img = artFor('graveyard');
  return (
    <div className="graveyard" style={img ? { backgroundImage: `url(${img})` } : undefined}>
      <h3>🪦 Graveyard</h3>
      <div className="tombs">
        {game.eliminations.map((e) => {
          const p = game.players.find((x) => x.id === e.playerId);
          return (
            <Tombstone key={e.playerId} name={p.name}>
              <small>{CAUSE_LABELS[e.cause]}</small>
              <small>{e.cause === 'night' ? 'Night' : 'Day'} {e.round}</small>
              {(showRoles || e.roleRevealed) && <RoleTag role={p.role} />}
            </Tombstone>
          );
        })}
      </div>
      <div className="fog" aria-hidden="true" />
    </div>
  );
}

export function Explosion() {
  const img = artFor('explosion');
  if (img) return <img className="explosion-img" src={img} alt="" />;
  return (
    <svg className="explosion" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="boom">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.4" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#dc2626" />
        </radialGradient>
      </defs>
      <polygon
        fill="url(#boom)"
        points={Array.from({ length: 24 }, (_, i) => {
          const r = i % 2 ? 26 : 56 - (i % 4) * 6;
          const a = (Math.PI / 12) * i;
          return `${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`;
        }).join(' ')}
      />
      <circle cx="60" cy="60" r="16" fill="#fff7ed" />
    </svg>
  );
}

export function Gavel({ size = 44 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="icon-art">
      <rect x="14" y="10" width="26" height="14" rx="3" transform="rotate(-35 27 17)" fill="#8b5cf6" />
      <rect x="29" y="22" width="6" height="30" rx="3" transform="rotate(-35 32 37)" fill="#c4b5fd" />
      <rect x="8" y="52" width="34" height="6" rx="3" fill="#6d28d9" />
    </svg>
  );
}

export function BallotBox({ size = 44 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="icon-art">
      <rect x="22" y="6" width="20" height="24" rx="2" fill="#f9fafb" transform="rotate(8 32 18)" />
      <path d="M27 16 l4 4 l7 -9" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" transform="rotate(8 32 18)" />
      <rect x="8" y="26" width="48" height="32" rx="4" fill="#8b5cf6" />
      <rect x="18" y="26" width="28" height="4" rx="2" fill="#4c1d95" />
    </svg>
  );
}

// Big avatar with an animated rubber stamp, used for public elimination announcements.
export function Stamp({ name, label, tone = 'danger' }) {
  return (
    <div className="stamp-wrap">
      <Avatar name={name} size={96} dead />
      <b className="stamp-name">{name}</b>
      <span className={`stamp ${tone}`}>{label}</span>
    </div>
  );
}
