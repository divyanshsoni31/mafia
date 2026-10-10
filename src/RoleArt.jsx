import { ROLES } from './game/roles.js';
import { artFor } from './art.js';

export const ROLE_COLORS = {
  Mafia: '#ef4444',
  Villager: '#22c55e',
  Policeman: '#3b82f6',
  Healer: '#2dd4bf',
  Joker: '#f59e0b',
  'Suicide Bomber': '#f97316',
};

const star = (cx, cy, outer, inner, n = 6) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

const ART = {
  Mafia: (
    <>
      {/* fedora */}
      <path d="M14 80 C36 94 84 94 106 80 C96 74 86 74 80 77 L77 48 C75 32 66 30 60 38 C54 30 45 32 43 48 L40 77 C34 74 24 74 14 80 Z" fill="currentColor" fillOpacity="0.25" />
      <path d="M41 66 C52 70 68 70 79 66 L80 77 C68 81 52 81 40 77 Z" fill="currentColor" />
      {/* domino mask */}
      <path d="M34 100 C40 94 52 94 60 99 C68 94 80 94 86 100 C82 108 70 110 60 104 C50 110 38 108 34 100 Z" fill="currentColor" fillOpacity="0.5" />
    </>
  ),
  Villager: (
    <>
      <path d="M18 60 L60 26 L102 60" />
      <rect x="30" y="56" width="60" height="44" fill="currentColor" fillOpacity="0.2" />
      <rect x="53" y="74" width="14" height="26" fill="currentColor" />
      <rect x="37" y="64" width="11" height="11" />
      <rect x="72" y="64" width="11" height="11" />
      <path d="M78 40 V28 H88 V48" />
    </>
  ),
  Policeman: (
    <>
      <polygon points={star(60, 62, 44, 26)} fill="currentColor" fillOpacity="0.2" />
      <circle cx="60" cy="62" r="17" />
      <polygon points={star(60, 62, 10, 4.5, 5)} fill="currentColor" stroke="none" />
    </>
  ),
  Healer: (
    <>
      <path d="M60 100 C18 72 14 38 38 32 C49 29 57 36 60 45 C63 36 71 29 82 32 C106 38 102 72 60 100 Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M60 52 V80 M46 66 H74" strokeWidth="8" />
    </>
  ),
  Joker: (
    <>
      <path d="M22 88 L26 38 L46 66 L60 26 L74 66 L94 38 L98 88 Z" fill="currentColor" fillOpacity="0.25" />
      <rect x="20" y="86" width="80" height="12" rx="4" fill="currentColor" />
      <circle cx="26" cy="34" r="6" fill="currentColor" />
      <circle cx="60" cy="22" r="6" fill="currentColor" />
      <circle cx="94" cy="34" r="6" fill="currentColor" />
    </>
  ),
  'Suicide Bomber': (
    <>
      <circle cx="54" cy="74" r="28" fill="currentColor" fillOpacity="0.25" />
      <rect x="62" y="40" width="16" height="12" rx="2" transform="rotate(40 70 46)" fill="currentColor" />
      <path d="M74 42 Q80 26 94 28" />
      <path d="M98 16 V24 M98 32 V40 M86 28 H92 M104 28 H110 M90 20 L94 24 M106 20 L102 24" strokeWidth="3" />
      <path d="M38 66 A18 18 0 0 1 50 54" strokeOpacity="0.7" />
    </>
  ),
};

export function RoleArt({ role, size = 120 }) {
  const img = artFor(role);
  if (img) return <img src={img} alt="" width={size} height={size} className="role-img" />;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: ROLE_COLORS[role], flex: 'none' }}
      aria-hidden="true"
    >
      {ART[role]}
    </svg>
  );
}

export function RoleCard({ role, playerName }) {
  return (
    <div className="role-card flip-in" style={{ '--rc': ROLE_COLORS[role] }}>
      <span className="rc-corner tl">{role[0]}</span>
      <span className="rc-corner br">{role[0]}</span>
      {playerName && <p className="rc-player">{playerName}, you are</p>}
      <div className="rc-art">
        <RoleArt role={role} size={150} />
      </div>
      <h2 className="rc-name">{role}</h2>
      <span className="rc-team">{ROLES[role].team}</span>
      <p className="rc-desc">{ROLES[role].desc}</p>
    </div>
  );
}

export function CardBack({ children }) {
  return (
    <div className="role-card back">
      <div className="cb-pattern" aria-hidden="true">
        <div className="moon" />
        <span className="cb-q">?</span>
      </div>
      {children}
    </div>
  );
}
