// Vote recording, correction, tallying and outcome rules (primary + final).
import { must } from './elimination.js';

export const newVote = (kind, candidates, extra = {}) => ({
  kind,
  candidates,
  votes: {}, // voterId -> targetId
  log: [], // { voterId, targetId, prev } for undo / history
  closed: false,
  ...extra,
});

function record(vote, voterId, targetId) {
  const votes = { ...vote.votes };
  const prev = votes[voterId] ?? null;
  if (targetId === null) delete votes[voterId];
  else votes[voterId] = targetId;
  return { ...vote, votes, log: [...vote.log, { voterId, targetId, prev }] };
}

export function castVote(vote, players, voterId, targetId, correct = false) {
  must(vote && !vote.closed, 'Voting is closed.');
  must(players.find((p) => p.id === voterId)?.alive, 'Only living players can vote.');
  must(vote.candidates.includes(targetId), 'That is not a valid vote target.');
  must(players.find((p) => p.id === targetId)?.alive, 'Only living players can receive votes.');
  must(voterId !== targetId, 'Players cannot vote for themselves.');
  must(!(voterId in vote.votes) || correct, 'This player has already voted. Use "Change vote" to correct it.');
  return record(vote, voterId, targetId);
}

export function removeVote(vote, voterId) {
  must(vote && !vote.closed, 'Voting is closed.');
  must(voterId in vote.votes, 'This player has not voted.');
  return record(vote, voterId, null);
}

export function undoVote(vote) {
  must(vote && !vote.closed, 'Voting is closed.');
  must(vote.log.length > 0, 'There is no vote to undo.');
  const last = vote.log.at(-1);
  const votes = { ...vote.votes };
  if (last.prev === null) delete votes[last.voterId];
  else votes[last.voterId] = last.prev;
  return { ...vote, votes, log: vote.log.slice(0, -1) };
}

export function tally(vote) {
  const counts = Object.fromEntries(vote.candidates.map((id) => [id, 0]));
  for (const t of Object.values(vote.votes)) counts[t]++;
  return counts;
}

export function topIds(counts) {
  const max = Math.max(0, ...Object.values(counts));
  return max === 0 ? [] : Object.keys(counts).filter((id) => counts[id] === max);
}

export function finalOutcome(vote) {
  const top = topIds(tally(vote));
  if (!top.length) return { type: 'none', reason: 'No votes were cast, so nobody is eliminated.' };
  if (top.length === 1) return { type: 'eliminate', id: top[0] };
  if (!vote.runoff) return { type: 'runoff', ids: top };
  return { type: 'tie', ids: top, reason: 'The runoff is still tied, so nobody is eliminated.' };
}
