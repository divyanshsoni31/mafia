// Game state + phase transitions. Every action is validated; invalid ones set `error` and change nothing else.
import { assignRoles } from './roles.js';
import { nightSlots, validTargets, resolveNight } from './night.js';
import { newVote, castVote, removeVote, undoVote, tally, topIds, finalOutcome } from './voting.js';
import { eliminate, checkWinner, must, WIN_MESSAGES } from './elimination.js';

const emptyNight = () => ({ mafia: null, healer: null, police: null, resolved: false });

export function createGame(config, rng = Math.random) {
  return {
    round: 1,
    phase: 'reveal',
    players: assignRoles(config.names, config.counts, rng),
    settings: { ...config.settings },
    setup: config,
    reveal: { index: 0, step: 'pass' },
    night: emptyNight(),
    vote: null,
    nominees: [],
    eliminations: [],
    policeResults: [],
    announcements: [], // public: { round, time: 'night' | 'day', text }
    log: [], // God-only history: { round, text }
    individualWins: [],
    winner: null,
    undo: null,
    error: null,
  };
}

export const nameOf = (s, id) => s.players.find((p) => p.id === id)?.name ?? '?';
const aliveIds = (s) => s.players.filter((p) => p.alive).map((p) => p.id);
const addLog = (s, text) => ({ ...s, log: [...s.log, { round: s.round, text }] });
const announce = (s, text) => ({ ...s, announcements: [...s.announcements, { round: s.round, time: 'day', text }] });

function endGame(s, winner) {
  return addLog({ ...s, winner, phase: 'over' }, `Game over: ${WIN_MESSAGES[winner]}`);
}

function finishDay(s) {
  const w = checkWinner(s.players);
  return w ? endGame(s, w) : { ...s, phase: 'dayEnd' };
}

function voteSummary(s) {
  const entries = Object.entries(s.vote.votes);
  return entries.length ? entries.map(([v, t]) => `${nameOf(s, v)} → ${nameOf(s, t)}`).join(', ') : 'no votes';
}

// Priority: vote elimination → Joker → Suicide Bomber → team win check.
function eliminateByVote(s, id) {
  let next = eliminate({ ...s, vote: null }, id, 'vote');
  const p = next.players.find((x) => x.id === id);
  next = announce(next, `${p.name} was eliminated by the town vote.`);
  next = addLog(next, `${p.name} (${p.role}) was eliminated by the final vote.`);
  if (p.role === 'Joker') {
    next = announce(next, `${p.name} was the Joker — the Joker wins!`);
    if (next.settings.jokerEndsGame) return endGame(next, 'Joker');
    next = { ...next, individualWins: [...next.individualWins, { playerId: id, round: next.round }] };
  }
  if (p.role === 'Suicide Bomber') {
    if (next.players.some((x) => x.alive)) return addLog({ ...next, phase: 'bomber' }, 'Suicide Bomber ability triggered.');
    next = addLog(next, 'Suicide Bomber triggered, but nobody else is alive.');
  }
  return finishDay(next);
}

function step(s, a) {
  const phaseIs = (...phases) => must(phases.includes(s.phase), 'That action is not available right now.');
  const closedTop = () => {
    must(s.vote.closed, 'Close voting first.');
    return topIds(tally(s.vote));
  };

  switch (a.type) {
    case 'REVEAL_SHOW':
      phaseIs('reveal');
      must(s.reveal.step === 'pass' && s.reveal.index < s.players.length, 'Nothing to reveal.');
      return { ...s, reveal: { ...s.reveal, step: 'shown' } };
    case 'REVEAL_HIDE': // hiding a card deals the next player's face-down card
      phaseIs('reveal');
      must(s.reveal.step === 'shown', 'No role is showing.');
      return { ...s, reveal: { index: s.reveal.index + 1, step: 'pass' } };

    case 'START_NIGHT': {
      phaseIs('reveal', 'day', 'dayEnd');
      if (s.phase === 'reveal') must(s.reveal.index >= s.players.length, 'Every player must see their role first.');
      const round = s.phase === 'reveal' ? 1 : s.round + 1;
      return addLog({ ...s, round, phase: 'night', night: emptyNight(), vote: null, nominees: [] }, `Night ${round} begins.`);
    }
    case 'NIGHT_SET':
      phaseIs('night');
      must(!s.night.resolved, 'This night has already been resolved.');
      must(nightSlots(s).includes(a.slot), 'That role has no living player tonight.');
      must(validTargets(s, a.slot).some((p) => p.id === a.targetId), 'That target is not allowed.');
      return { ...s, night: { ...s.night, [a.slot]: a.targetId } };
    case 'RESOLVE_NIGHT':
      phaseIs('night');
      return resolveNight(s);
    case 'UNDO_NIGHT':
      phaseIs('morning');
      must(s.undo, 'Nothing to undo.');
      return addLog(s.undo, `God undid the resolution of night ${s.round}.`);
    case 'START_DAY':
      phaseIs('morning');
      if (s.winner) return addLog({ ...s, phase: 'over', undo: null }, `Game over: ${WIN_MESSAGES[s.winner]}`);
      return addLog({ ...s, phase: 'day', undo: null }, `Day ${s.round} discussion begins.`);

    case 'START_PRIMARY':
      phaseIs('day');
      return { ...s, phase: 'primary', vote: newVote('primary', aliveIds(s)) };
    case 'CAST_VOTE':
      phaseIs('primary', 'final');
      return { ...s, vote: castVote(s.vote, s.players, a.voterId, a.targetId, a.correct) };
    case 'REMOVE_VOTE':
      phaseIs('primary', 'final');
      return { ...s, vote: removeVote(s.vote, a.voterId) };
    case 'UNDO_VOTE':
      phaseIs('primary', 'final');
      return { ...s, vote: undoVote(s.vote) };
    case 'CLOSE_VOTING': {
      phaseIs('primary', 'final');
      must(!s.vote.closed, 'Voting is already closed.');
      const label = s.phase === 'primary' ? 'Primary' : s.vote.runoff ? 'Runoff' : 'Final';
      return addLog({ ...s, vote: { ...s.vote, closed: true } }, `${label} vote: ${voteSummary(s)}.`);
    }

    case 'NOMINATE': {
      phaseIs('primary');
      const top = closedTop();
      const ids = [...new Set(a.ids)];
      must(top.length > 0, 'Nobody received any votes.');
      must(ids.length > 0 && ids.every((id) => top.includes(id)), 'Nominees must be among the top vote-getters.');
      return addLog({ ...s, phase: 'defense', nominees: ids, vote: null }, `Nominated: ${ids.map((id) => nameOf(s, id)).join(', ')}.`);
    }
    case 'PRIMARY_REVOTE': {
      phaseIs('primary');
      const top = closedTop();
      must(top.length > 1, 'There is no tie to break.');
      return addLog({ ...s, vote: newVote('primary', top, { revote: true }) }, 'Nomination tie-breaker vote started.');
    }
    case 'NO_NOMINATION':
      phaseIs('primary');
      must(closedTop().length === 0, 'Some players received votes.');
      return announce({ ...s, phase: 'dayEnd', vote: null }, 'Nobody was nominated, so nobody was eliminated today.');

    case 'START_FINAL':
      phaseIs('defense');
      return { ...s, phase: 'final', vote: newVote('final', aliveIds(s), { runoff: false, revealed: false }) };
    case 'START_OPEN_VOTE':
      phaseIs('day');
      return addLog(
        { ...s, phase: 'final', nominees: [], vote: newVote('final', aliveIds(s), { runoff: false, revealed: false }) },
        'Open vote started: every living player can be voted for.',
      );
    case 'REVEAL_FINAL':
      phaseIs('final');
      must(s.vote.closed && !s.vote.revealed, 'Close voting first.');
      return { ...s, vote: { ...s.vote, revealed: true } };
    case 'START_RUNOFF': {
      phaseIs('final');
      must(s.vote.revealed, 'Reveal the results first.');
      const o = finalOutcome(s.vote);
      must(o.type === 'runoff', 'No runoff is needed.');
      return addLog(
        { ...s, nominees: o.ids, vote: newVote('final', o.ids, { runoff: true, revealed: false }) },
        `Runoff between ${o.ids.map((id) => nameOf(s, id)).join(' and ')}.`,
      );
    }
    case 'FINAL_DECIDE': {
      phaseIs('final');
      must(s.vote.revealed, 'Reveal the results first.');
      const o = finalOutcome(s.vote);
      must(o.type !== 'runoff', 'Run the runoff vote first.');
      if (o.type === 'eliminate') {
        must(a.targetId === o.id, 'That player did not receive the most votes.');
        return eliminateByVote(s, o.id);
      }
      if (a.targetId) {
        must(o.type === 'tie' && s.settings.finalTieRule === 'god' && o.ids.includes(a.targetId), 'Nobody can be eliminated by this vote.');
        return eliminateByVote(addLog(s, 'God broke the runoff tie (house rule).'), a.targetId);
      }
      return announce({ ...s, vote: null, phase: 'dayEnd' }, 'Nobody was eliminated today.');
    }

    case 'BOMBER_TARGET': {
      phaseIs('bomber');
      let next = eliminate(s, a.targetId, 'bomber');
      next = announce(next, `The Suicide Bomber has taken ${nameOf(s, a.targetId)} down!`);
      next = addLog(next, `Suicide Bomber eliminated ${nameOf(s, a.targetId)}.`);
      return finishDay(next);
    }

    case 'REVEAL_ROLE': {
      const e = s.eliminations.find((x) => x.playerId === a.playerId);
      must(e, 'Only eliminated players can have their role revealed.');
      const p = s.players.find((x) => x.id === a.playerId);
      return addLog(
        { ...s, eliminations: s.eliminations.map((x) => (x === e ? { ...x, roleRevealed: true } : x)) },
        `God revealed ${p.name}'s role: ${p.role}.`,
      );
    }
    default:
      throw new Error(`Unknown action: ${a.type}`);
  }
}

export function reducer(state, action) {
  if (action.type === 'LOAD') return action.game;
  if (action.type === 'RESET') return null;
  if (!state) return state;
  try {
    return { ...step(state, action), error: null };
  } catch (e) {
    return { ...state, error: e.message };
  }
}
