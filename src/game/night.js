// Night actions: which roles act, who they may target, and simultaneous resolution.
import { isMafia } from './roles.js';
import { eliminate, checkWinner, must } from './elimination.js';

export const SLOT_LABEL = { mafia: 'Mafia', healer: 'Healer', police: 'Policeman' };

const hasLiving = (s, role) => s.players.some((p) => p.alive && p.role === role);

// Mafia always acts (if none were alive the game would be over).
export function nightSlots(s) {
  return ['mafia', hasLiving(s, 'Healer') && 'healer', hasLiving(s, 'Policeman') && 'police'].filter(Boolean);
}

export function validTargets(s, slot) {
  const alive = s.players.filter((p) => p.alive);
  if (slot === 'mafia') return alive.filter((p) => !isMafia(p));
  if (slot === 'police') return alive.filter((p) => p.role !== 'Policeman');
  if (slot === 'healer') {
    return alive.filter(
      (p) =>
        (s.settings.healerSelfHeal || p.role !== 'Healer') &&
        (s.settings.healerConsecutive || p.lastProtectedRound !== s.round - 1),
    );
  }
  return [];
}

export function resolveNight(s) {
  must(!s.night.resolved, 'This night has already been resolved.');
  const slots = nightSlots(s);
  for (const slot of slots) {
    const id = s.night[slot];
    must(id, `Choose the ${SLOT_LABEL[slot]} target first.`);
    must(validTargets(s, slot).some((p) => p.id === id), `The ${SLOT_LABEL[slot]} target is no longer valid. Choose again.`);
  }

  const pick = (slot) => (slots.includes(slot) ? s.night[slot] : null);
  const kill = pick('mafia');
  const heal = pick('healer');
  const probe = pick('police');
  const name = (id) => s.players.find((p) => p.id === id).name;
  const saved = kill === heal;

  let next = {
    ...s,
    undo: s, // snapshot for a God-confirmed undo
    players: s.players.map((p) => (p.id === heal ? { ...p, lastProtectedRound: s.round } : p)),
  };
  const notes = [`Mafia targeted ${name(kill)}.`];
  if (heal) notes.push(`Healer protected ${name(heal)}${saved ? ' and blocked the attack' : ''}.`);
  if (probe) {
    const result = isMafia(s.players.find((p) => p.id === probe));
    next = { ...next, policeResults: [...s.policeResults, { round: s.round, targetId: probe, isMafia: result }] };
    notes.push(`Policeman investigated ${name(probe)}: ${result ? 'Mafia' : 'Not Mafia'}.`);
  }
  if (!saved) next = eliminate(next, kill, 'night');

  const text = saved ? 'Nobody died last night.' : `${name(kill)} was killed during the night.`;
  return {
    ...next,
    phase: 'morning',
    night: { ...s.night, resolved: true },
    winner: checkWinner(next.players),
    announcements: [...s.announcements, { round: s.round, time: 'night', text }],
    log: [...s.log, { round: s.round, text: `Night ${s.round}: ${notes.join(' ')}` }],
  };
}
