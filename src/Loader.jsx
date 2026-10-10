import { useEffect, useState } from 'react';
import { rgbOf } from './RoleArt.jsx';

// Cinematic transition shown on every screen change. Purely visual; tap to skip.
const SCENES = {
  boot: { title: 'SHADOW MAFIA', sub: 'Entering the underworld', icon: '🎭', color: '#8b5cf6' },
  welcome: { title: 'SHADOW MAFIA', sub: 'Trust no one', icon: '🎭', color: '#8b5cf6' },
  howto: { title: 'THE RULES', sub: 'Learn the code of silence', icon: '📜', color: '#a78bfa' },
  setup: { title: 'ASSEMBLE', sub: 'Gather your suspects', icon: '🕵️', color: '#8b5cf6' },
  reveal: { title: 'DEALING CARDS', sub: 'Your fate is sealed', icon: '🃏', color: '#c084fc' },
  night: { title: 'NIGHT FALLS', sub: 'Everyone close your eyes', icon: '🌙', color: '#6366f1' },
  morning: { title: 'DAWN BREAKS', sub: 'Who survived the night?', icon: '🌅', color: '#f59e0b' },
  day: { title: 'THE TOWN GATHERS', sub: 'Someone here is lying', icon: '🏚️', color: '#22c55e' },
  primary: { title: 'ACCUSATIONS', sub: 'Point the finger', icon: '👉', color: '#a855f7' },
  defense: { title: 'LAST WORDS', sub: 'Plead for your life', icon: '🎙️', color: '#38bdf8' },
  final: { title: 'JUDGEMENT', sub: 'The town decides', icon: '⚖️', color: '#ef4444' },
  bomber: { title: 'DETONATION', sub: 'Take cover', icon: '💣', color: '#f97316' },
  dayEnd: { title: 'THE VERDICT', sub: 'Justice has spoken', icon: '🔨', color: '#e11d48' },
  over: { title: 'GAME OVER', sub: 'The truth comes out', icon: '💀', color: '#facc15' },
};

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function Loader({ kind, onDone }) {
  const scene = SCENES[kind] ?? SCENES.welcome;
  const dur = kind === 'boot' ? 2400 : 1500;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = setTimeout(onDone, reducedMotion() ? 250 : dur);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (kind !== 'boot') return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(100, Math.round(((now - start) / (dur - 500)) * 100));
      setPct(p);
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, dur]);

  return (
    <div className="loader" style={{ '--lc': scene.color, '--lc-rgb': rgbOf(scene.color), '--dur': `${dur}ms`, '--chars': Math.max(...scene.title.split(' ').map((w) => w.length)) }} onClick={onDone} role="status" aria-label={scene.title}>
      <div className="ld-rays" />
      <div className="ld-vignette" />
      <div className="ld-blind top" />
      <div className="ld-blind bottom" />
      <div className="ld-flash" />
      <div className="ld-core">
        <svg className="ld-ring outer" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92" /></svg>
        <svg className="ld-ring inner" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="76" /></svg>
        <span className="ld-icon" aria-hidden="true">{scene.icon}</span>
      </div>
      {/* one word per line; data-text keeps the line breaks for the glitch layers */}
      <h1 className="ld-title" data-text={scene.title.split(' ').join('\n')}>
        {scene.title.split(' ').map((word, w, words) => {
          const offset = words.slice(0, w).join('').length;
          return (
            <span key={w} className="ld-line">
              {[...word].map((c, i) => (
                <span key={i} style={{ animationDelay: `${0.3 + (offset + i) * 0.04}s` }}>{c}</span>
              ))}
            </span>
          );
        })}
      </h1>
      <p className="ld-sub">{scene.sub}</p>
      <div className="ld-bar"><span /></div>
      {kind === 'boot' && <div className="ld-pct">{pct}%</div>}
      <p className="ld-skip">tap to skip</p>
    </div>
  );
}
