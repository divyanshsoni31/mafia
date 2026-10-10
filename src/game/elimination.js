// Shared elimination + the single authoritative team win check.
import { isMafia } from './roles.js';

export function must(cond, message) {
  if (!cond) throw new Error(message);
}

export const WIN_MESSAGES = {
  Town: 'The Town has won!',
  Mafia: 'The Mafia has won!',
  Joker: 'The Joker wins!',
};

export const CAUSE_LABELS = {
  night: 'Killed at night',
  vote: 'Voted out',
  bomber: 'Taken down by the Suicide Bomber',
};

export function eliminate(state, playerId, cause) {
  const p = state.players.find((x) => x.id === playerId);
  must(p, 'Unknown player.');
  must(p.alive, `${p.name} is already eliminated.`);
  return {
    ...state,
    players: state.players.map((x) => (x.id === playerId ? { ...x, alive: false } : x)),
    eliminations: [...state.eliminations, { playerId, round: state.round, cause, roleRevealed: false }],
  };
}

export function checkWinner(players) {
  const alive = players.filter((p) => p.alive);
  const mafia = alive.filter(isMafia).length;
  if (mafia === 0) return 'Town';
  if (mafia >= alive.length - mafia) return 'Mafia';
  return null;
}
