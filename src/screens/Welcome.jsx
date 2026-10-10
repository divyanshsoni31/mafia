import { ROLES, ROLE_NAMES } from '../game/roles.js';
import { FullscreenButton, RoleTag } from '../components.jsx';
import { RoleArt, ROLE_COLORS, rgbOf } from '../RoleArt.jsx';
import { Skyline } from '../Scenes.jsx';

export function Welcome({ onNew, onHowTo }) {
  // Two copies of the deck so the marquee loops seamlessly.
  const reel = [...ROLE_NAMES, ...ROLE_NAMES];
  return (
    <div className="welcome">
      <Skyline time="night" size="hero" fx>
        <div className="wl-logo" aria-hidden="true"><RoleArt role="Mafia" size={84} /></div>
        <h1 className="wl-title">
          <span className="wl-shadow">Shadow</span>
          <span className="wl-mafia">Mafia</span>
        </h1>
        <p className="wl-tag">One phone · One God · Trust no one</p>
      </Skyline>

      <div className="wl-reel" aria-hidden="true">
        <div className="wl-track">
          {reel.map((r, i) => (
            <span key={i} className="wl-chip" style={{ '--rc': ROLE_COLORS[r], '--rc-rgb': rgbOf(ROLE_COLORS[r]) }}>
              <RoleArt role={r} size={30} />
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="wl-actions">
        <button className="btn-neon" onClick={onNew}><span>🎭 New Game</span></button>
        <button className="btn-glass" onClick={onHowTo}>📜 How to Play</button>
        <FullscreenButton className="btn-glass small" label />
      </div>
      <p className="fine">
        Runs on this device only. Refreshing or closing the page ends the game.
      </p>
    </div>
  );
}

export function HowTo({ onBack }) {
  return (
    <div className="stack">
      <button className="btn small ghost self-start" onClick={onBack}>← Back</button>
      <h1>How to Play</h1>
      <div className="card">
        <h3>The setup</h3>
        <p>One person is <b>God</b>, the game master who holds the phone. God enters the players' names and picks the roles. The app shuffles the roles, then each player looks at their own role in private while everyone else looks away.</p>
      </div>
      <div className="card">
        <h3>Roles</h3>
        <ul className="list">
          {ROLE_NAMES.map((r) => (
            <li key={r} className="howrole">
              <span className="row tight"><RoleArt role={r} size={40} /><RoleTag role={r} /></span>
              <span className="muted">{ROLES[r].desc}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h3>Night</h3>
        <p>Everyone closes their eyes. God wakes the Mafia, who silently point at their victim. Then the Healer picks someone to protect and the Policeman picks someone to investigate. God records each choice on the phone and resolves the night. Everything happens at the same moment. If the Healer protects the Mafia's target, that player survives.</p>
      </div>
      <div className="card">
        <h3>Day</h3>
        <p><b>Discussion:</b> God announces who died, and the group argues.</p>
        <p><b>Primary vote:</b> Each living player names a suspect. God records the votes. The player with the most votes is nominated. If there's a tie, God can nominate all the tied players, hold a re-vote, or pick. Nobody is eliminated by this vote.</p>
        <p><b>Defense:</b> Each nominee speaks in their own defense.</p>
        <p><b>Final vote:</b> Every living player votes for any other living player, just like the primary. Whoever gets the most votes is eliminated. The vote counts stay hidden until God reveals them. If players tie, they go to a runoff. If the runoff also ties, nobody is eliminated (God can change this in the house rules).</p>
      </div>
      <div className="card">
        <h3>Winning</h3>
        <p><b>Town</b> wins when every Mafia member is gone. <b>Mafia</b> wins once they equal or outnumber everyone else. The <b>Joker</b> wins by being eliminated in the final vote. The <b>Suicide Bomber</b> takes another player down when eliminated in the final vote.</p>
      </div>
      <button className="btn primary big" onClick={onBack}>Got it</button>
    </div>
  );
}
