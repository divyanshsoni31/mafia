import { ConfirmButton } from '../components.jsx';
import { RoleCard, CardBack } from '../RoleArt.jsx';
import { Skyline } from '../Scenes.jsx';

export default function Reveal({ game, dispatch }) {
  const { index, step } = game.reveal;
  const player = game.players[index];
  const next = game.players[index + 1];

  if (!player) {
    return (
      <section className="stack center screen-fill">
        <Skyline time="night" size="hero">
          <p className="eyebrow">All {game.players.length} cards dealt</p>
          <h2 className="title-glow">The night is coming…</h2>
          <p>Hand the phone back to God.</p>
        </Skyline>
        <ConfirmButton
          className="btn primary big"
          title="Start Night 1?"
          message="Everyone should close their eyes now."
          confirmLabel="Start Night"
          onConfirm={() => dispatch({ type: 'START_NIGHT' })}
        >
          🌙 Start Night
        </ConfirmButton>
      </section>
    );
  }

  const progress = (
    <div className="deck-progress" aria-label={`Player ${index + 1} of ${game.players.length}`}>
      {game.players.map((p, i) => <span key={p.id} className={i < index ? 'done' : i === index ? 'on' : ''} />)}
    </div>
  );

  if (step === 'pass') {
    return (
      <section className="stack center screen-fill reveal-screen">
        {progress}
        <button key={index} className="card-btn deal-in" onClick={() => dispatch({ type: 'REVEAL_SHOW' })} aria-label={`Reveal ${player.name}'s role`}>
          <CardBack>
            <p className="eyebrow">This card belongs to</p>
            <h2 className="hero-name">{player.name}</h2>
            <p className="tap-hint">Tap to reveal</p>
          </CardBack>
        </button>
        <p className="warn">Only {player.name} should look. Everyone else, look away.</p>
      </section>
    );
  }

  return (
    <section className="stack center screen-fill reveal-screen">
      {progress}
      <RoleCard role={player.role} playerName={player.name} />
      <button className="btn primary big" onClick={() => dispatch({ type: 'REVEAL_HIDE' })}>
        {next ? `Hide & pass to ${next.name}` : 'Hide card'}
      </button>
    </section>
  );
}
