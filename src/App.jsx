import { useEffect, useReducer, useState } from 'react';
import { reducer, createGame } from './game/engine.js';
import { Header } from './components.jsx';
import { Welcome, HowTo } from './screens/Welcome.jsx';
import Setup from './screens/Setup.jsx';
import Reveal from './screens/Reveal.jsx';
import Night from './screens/Night.jsx';
import { Morning, Discussion, Defense, DayEnd } from './screens/Day.jsx';
import { Primary, Final, Bomber } from './screens/Voting.jsx';
import GameOver from './screens/GameOver.jsx';

const PHASE_SCREENS = {
  reveal: Reveal,
  night: Night,
  morning: Morning,
  day: Discussion,
  primary: Primary,
  defense: Defense,
  final: Final,
  bomber: Bomber,
  dayEnd: DayEnd,
};

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [game, dispatch] = useReducer(reducer, null);

  const inProgress = !!game && game.phase !== 'over';
  useEffect(() => {
    if (!inProgress) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [inProgress]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, game?.phase, game?.reveal.step]);

  const start = (config) => {
    dispatch({ type: 'LOAD', game: createGame(config) });
    setScreen('game');
  };
  const quit = () => {
    dispatch({ type: 'RESET' });
    setScreen('welcome');
  };

  let body;
  if (screen === 'howto') body = <HowTo onBack={() => setScreen('welcome')} />;
  else if (screen === 'setup') body = <Setup onStart={start} onBack={quit} />;
  else if (screen === 'game' && game) {
    const Phase = PHASE_SCREENS[game.phase];
    body = (
      <>
        {game.phase !== 'over' && <Header game={game} dispatch={dispatch} onQuit={quit} />}
        {game.error && <div className="error-banner" role="alert">{game.error}</div>}
        <div key={`${game.phase}-${game.round}`} className="fade">
          {Phase ? (
            <Phase game={game} dispatch={dispatch} />
          ) : (
            <GameOver
              game={game}
              onPlayAgain={() => start(game.setup)}
              onNewGame={() => {
                dispatch({ type: 'RESET' });
                setScreen('setup');
              }}
            />
          )}
        </div>
      </>
    );
  } else body = <Welcome onNew={() => setScreen('setup')} onHowTo={() => setScreen('howto')} />;

  return <main className="app">{body}</main>;
}
