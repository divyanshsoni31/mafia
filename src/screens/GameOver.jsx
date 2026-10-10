import { WIN_MESSAGES } from '../game/elimination.js';
import { teamOf } from '../game/roles.js';
import { nameOf } from '../game/engine.js';
import { ConfirmButton, RoleTag } from '../components.jsx';
import { RoleArt } from '../RoleArt.jsx';
import { Graveyard } from '../Scenes.jsx';

const EMBLEM = { Town: 'Villager', Mafia: 'Mafia', Joker: 'Joker' };

const isWinner = (winner, p) => (winner === 'Joker' ? p.role === 'Joker' : teamOf(p.role) === winner);

export default function GameOver({ game, onPlayAgain, onNewGame }) {
  return (
    <section className="stack">
      <div className={`card announce win ${game.winner.toLowerCase()}`}>
        <div className="emblem"><RoleArt role={EMBLEM[game.winner]} size={140} /></div>
        <p className="eyebrow">Game over</p>
        <h1>{WIN_MESSAGES[game.winner]}</h1>
        {game.individualWins.map((w) => (
          <p key={w.playerId}>{nameOf(game, w.playerId)} also won as the Joker (Day {w.round}).</p>
        ))}
      </div>

      <div className="card">
        <h3>Players</h3>
        <ul className="list">
          {game.players.map((p) => (
            <li key={p.id} className="listrow">
              <span className={`pname grow${p.alive ? '' : ' dead'}`}>
                {isWinner(game.winner, p) && '★ '}
                {p.name}
              </span>
              <RoleArt role={p.role} size={28} />
              <RoleTag role={p.role} />
            </li>
          ))}
        </ul>
      </div>

      <Graveyard game={game} showRoles />

      <ConfirmButton
        className="btn primary big"
        title="Play again?"
        message="Same players and role counts — the roles will be reshuffled."
        confirmLabel="Reshuffle & play"
        onConfirm={onPlayAgain}
      >
        Play again (same players)
      </ConfirmButton>
      <ConfirmButton className="btn ghost big" title="Start a new game?" message="Back to setup." confirmLabel="New game" onConfirm={onNewGame}>
        New game
      </ConfirmButton>
    </section>
  );
}
