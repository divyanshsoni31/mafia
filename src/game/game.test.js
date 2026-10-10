import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reducer, createGame } from './engine.js';
import { validateSetup, assignRoles, DEFAULT_COUNTS, DEFAULT_SETTINGS, ROLE_NAMES } from './roles.js';

// Build a game at Night 1 with roles in a fixed order: p1 gets roles[0], etc.
function game(roles, settings = {}) {
  const names = roles.map((_, i) => `P${i + 1}`);
  let s = createGame({ names, counts: { ...DEFAULT_COUNTS }, settings: { ...DEFAULT_SETTINGS, ...settings } });
  s = { ...s, players: roles.map((role, i) => ({ id: `p${i + 1}`, name: names[i], role, alive: true, lastProtectedRound: null })) };
  s = { ...s, reveal: { index: roles.length, step: 'pass' } };
  return run(s, { type: 'START_NIGHT' });
}

function run(s, ...actions) {
  for (const a of actions) {
    s = reducer(s, a);
    assert.equal(s.error, null, `${a.type} failed: ${s.error}`);
  }
  return s;
}
const fails = (s, a, re) => assert.match(reducer(s, a).error ?? '', re);
const alive = (s, id) => s.players.find((p) => p.id === id).alive;
const night = (s, mafia, healer, police) => {
  const acts = [{ type: 'NIGHT_SET', slot: 'mafia', targetId: mafia }];
  if (healer) acts.push({ type: 'NIGHT_SET', slot: 'healer', targetId: healer });
  if (police) acts.push({ type: 'NIGHT_SET', slot: 'police', targetId: police });
  return run(s, ...acts, { type: 'RESOLVE_NIGHT' });
};
const votes = (pairs) => pairs.map(([v, t]) => ({ type: 'CAST_VOTE', voterId: v, targetId: t }));
// Morning -> day -> primary votes -> nominate top (all tied) -> defense -> final votes -> reveal
function day(s, primary, final) {
  s = run(s, { type: 'START_DAY' }, { type: 'START_PRIMARY' }, ...votes(primary), { type: 'CLOSE_VOTING' });
  const counts = {};
  primary.forEach(([, t]) => (counts[t] = (counts[t] ?? 0) + 1));
  const max = Math.max(...Object.values(counts));
  const top = Object.keys(counts).filter((k) => counts[k] === max);
  return run(s, { type: 'NOMINATE', ids: top }, { type: 'START_FINAL' }, ...votes(final), { type: 'CLOSE_VOTING' }, { type: 'REVEAL_FINAL' });
}

// p1 Mafia, p2 Mafia, p3 Healer, p4 Policeman, p5-p7 Villager
const STD = ['Mafia', 'Mafia', 'Healer', 'Policeman', 'Villager', 'Villager', 'Villager'];

test('setup validation', () => {
  const ok = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  assert.deepEqual(validateSetup(ok, DEFAULT_COUNTS), []);
  assert.ok(validateSetup(['A', 'B', 'C'], { ...DEFAULT_COUNTS }).some((e) => /between 4 and 30/.test(e)));
  assert.ok(validateSetup(Array.from({ length: 31 }, (_, i) => `N${i}`), { ...DEFAULT_COUNTS, Villager: 27 }).some((e) => /between/.test(e)));
  assert.ok(validateSetup(['A', 'a ', 'C', 'D', 'E', 'F', 'G'], DEFAULT_COUNTS).some((e) => /unique/.test(e)));
  assert.ok(validateSetup(ok, { ...DEFAULT_COUNTS, Villager: 4 }).some((e) => /Too many roles/.test(e)));
  assert.ok(validateSetup(ok, { ...DEFAULT_COUNTS, Villager: 2 }).some((e) => /slot/.test(e)));
  assert.ok(validateSetup(ok, { ...DEFAULT_COUNTS, Mafia: 0, Villager: 5 }).some((e) => /At least one Mafia/.test(e)));
  assert.ok(validateSetup(['A', 'B', 'C', 'D'], { Mafia: 2, Villager: 2 }).some((e) => /outnumbered/.test(e)));
  assert.ok(validateSetup(ok, { ...DEFAULT_COUNTS, Healer: 2, Villager: 2 }).some((e) => /Only 1 Healer/.test(e)));
});

test('role assignment uses exact counts and shuffles', () => {
  const names = Array.from({ length: 30 }, (_, i) => `N${i}`);
  const counts = { Mafia: 8, Villager: 18, Policeman: 1, Healer: 1, Joker: 1, 'Suicide Bomber': 1 };
  const orders = new Set();
  for (let i = 0; i < 5; i++) {
    const ps = assignRoles(names, counts);
    for (const r of ROLE_NAMES) assert.equal(ps.filter((p) => p.role === r).length, counts[r]);
    assert.equal(new Set(ps.map((p) => p.id)).size, 30);
    orders.add(ps.map((p) => p.role).join());
  }
  assert.ok(orders.size > 1);
});

test('reveal must finish before night; reveal clears between players', () => {
  let s = createGame({ names: ['A', 'B', 'C', 'D'], counts: { Mafia: 1, Villager: 3 }, settings: DEFAULT_SETTINGS });
  fails(s, { type: 'START_NIGHT' }, /Every player/);
  fails(s, { type: 'REVEAL_HIDE' }, /No role/);
  for (let i = 0; i < 4; i++) {
    s = run(s, { type: 'REVEAL_SHOW' }, { type: 'REVEAL_HIDE' });
    assert.equal(s.reveal.index, i + 1); // next player's card is dealt face-down
  }
  assert.equal(s.reveal.step, 'pass');
  s = run(s, { type: 'START_NIGHT' });
  assert.equal(s.phase, 'night');
  assert.equal(s.round, 1);
});

test('mafia kills villager; mafia cannot target mafia; no double resolution', () => {
  let s = game(STD);
  fails(s, { type: 'NIGHT_SET', slot: 'mafia', targetId: 'p2' }, /not allowed/);
  fails(s, { type: 'RESOLVE_NIGHT' }, /Choose the Mafia/);
  s = night(s, 'p5', 'p3', 'p1');
  assert.equal(alive(s, 'p5'), false);
  assert.equal(s.eliminations[0].cause, 'night');
  assert.match(s.announcements.at(-1).text, /P5 was killed/);
  fails(s, { type: 'RESOLVE_NIGHT' }, /not available/);
});

test('healer saves target, or protects other while target dies', () => {
  let s = night(game(STD), 'p5', 'p5', 'p6');
  assert.equal(alive(s, 'p5'), true);
  assert.equal(s.announcements.at(-1).text, 'Nobody died last night.');
  assert.doesNotMatch(JSON.stringify(s.announcements), /P5|Healer/);
  s = night(game(STD), 'p5', 'p6', 'p6');
  assert.equal(alive(s, 'p5'), false);
});

test('healer self-protection and protection when healer dies', () => {
  let s = night(game(STD), 'p3', 'p3', 'p5');
  assert.equal(alive(s, 'p3'), true);
  s = night(game(STD), 'p3', 'p5', 'p5'); // healer dies, protection of p5 still recorded
  assert.equal(alive(s, 'p3'), false);
  assert.equal(s.players.find((p) => p.id === 'p5').lastProtectedRound, 1);
  fails(game(STD, { healerSelfHeal: false }), { type: 'NIGHT_SET', slot: 'healer', targetId: 'p3' }, /not allowed/);
});

test('consecutive protection rule', () => {
  let s = night(game(STD, { healerConsecutive: false }), 'p5', 'p6', 'p1');
  s = run(s, { type: 'START_DAY' }, { type: 'START_NIGHT' });
  assert.equal(s.round, 2);
  fails(s, { type: 'NIGHT_SET', slot: 'healer', targetId: 'p6' }, /not allowed/);
  s = night(game(STD), 'p5', 'p6', 'p1');
  s = run(s, { type: 'START_DAY' }, { type: 'START_NIGHT' }, { type: 'NIGHT_SET', slot: 'healer', targetId: 'p6' });
});

test('policeman results are private, survive policeman death', () => {
  let s = night(game(STD), 'p4', 'p5', 'p1');
  assert.equal(alive(s, 'p4'), false);
  assert.deepEqual(s.policeResults[0], { round: 1, targetId: 'p1', isMafia: true });
  assert.doesNotMatch(JSON.stringify(s.announcements), /Mafia|P1/);
  s = night(game(STD), 'p5', 'p6', 'p7');
  assert.equal(s.policeResults[0].isMafia, false);
  fails(game(STD), { type: 'NIGHT_SET', slot: 'police', targetId: 'p4' }, /not allowed/);
});

test('absent roles are skipped', () => {
  let s = game(['Mafia', 'Villager', 'Villager', 'Villager', 'Villager']);
  fails(s, { type: 'NIGHT_SET', slot: 'healer', targetId: 'p2' }, /no living/);
  s = night(s, 'p2');
  assert.equal(alive(s, 'p2'), false);
  assert.equal(s.policeResults.length, 0);
});

test('night kills of Joker and Suicide Bomber trigger nothing', () => {
  const roles = ['Mafia', 'Joker', 'Suicide Bomber', 'Villager', 'Villager', 'Villager', 'Villager'];
  let s = night(game(roles), 'p2');
  assert.equal(s.winner, null);
  s = run(s, { type: 'START_DAY' }, { type: 'START_NIGHT' });
  s = night(s, 'p3');
  s = run(s, { type: 'START_DAY' });
  assert.equal(s.phase, 'day');
  assert.equal(s.individualWins.length, 0);
});

test('undo night restores state', () => {
  let s = night(game(STD), 'p5', 'p6', 'p1');
  s = run(s, { type: 'UNDO_NIGHT' });
  assert.equal(s.phase, 'night');
  assert.equal(alive(s, 'p5'), true);
  assert.equal(s.policeResults.length, 0);
});

test('primary voting: no elimination, duplicates, corrections, undo, dead cannot vote', () => {
  let s = night(game(STD), 'p5', 'p6', 'p1');
  s = run(s, { type: 'START_DAY' }, { type: 'START_PRIMARY' });
  fails(s, { type: 'CAST_VOTE', voterId: 'p5', targetId: 'p1' }, /living players can vote/);
  fails(s, { type: 'CAST_VOTE', voterId: 'p6', targetId: 'p5' }, /not a valid/);
  fails(s, { type: 'CAST_VOTE', voterId: 'p6', targetId: 'p6' }, /themselves/);
  s = run(s, ...votes([['p6', 'p1']]));
  fails(s, { type: 'CAST_VOTE', voterId: 'p6', targetId: 'p2' }, /already voted/);
  s = run(s, { type: 'CAST_VOTE', voterId: 'p6', targetId: 'p2', correct: true });
  assert.equal(s.vote.votes.p6, 'p2');
  s = run(s, { type: 'UNDO_VOTE' });
  assert.equal(s.vote.votes.p6, 'p1');
  s = run(s, { type: 'REMOVE_VOTE', voterId: 'p6' }, { type: 'UNDO_VOTE' });
  assert.equal(s.vote.votes.p6, 'p1');
  s = run(s, ...votes([['p7', 'p2']]), { type: 'CLOSE_VOTING' });
  assert.equal(s.players.filter((p) => p.alive).length, 6);
  fails(s, { type: 'NOMINATE', ids: ['p3'] }, /top vote/);
  // tie -> revote among tied
  s = run(s, { type: 'PRIMARY_REVOTE' });
  assert.deepEqual(s.vote.candidates, ['p1', 'p2']);
  s = run(s, ...votes([['p3', 'p1']]), { type: 'CLOSE_VOTING' }, { type: 'NOMINATE', ids: ['p1'] });
  assert.equal(s.phase, 'defense');
  assert.deepEqual(s.nominees, ['p1']);
});

test('final vote is open to every living player', () => {
  let s = night(game(STD), 'p5', 'p6', 'p1');
  s = day(s, [['p6', 'p1']], []);
  assert.deepEqual(s.nominees, ['p1']);
  s = night(game(STD), 'p5', 'p6', 'p1');
  s = run(s, { type: 'START_DAY' }, { type: 'START_PRIMARY' }, ...votes([['p6', 'p1']]), { type: 'CLOSE_VOTING' }, { type: 'NOMINATE', ids: ['p1'] }, { type: 'START_FINAL' });
  assert.equal(s.vote.candidates.length, 6); // not just the nominee
  s = run(s, ...votes([['p1', 'p7'], ['p2', 'p7'], ['p3', 'p1']]), { type: 'CLOSE_VOTING' }, { type: 'REVEAL_FINAL' }, { type: 'FINAL_DECIDE', targetId: 'p7' });
  assert.equal(alive(s, 'p7'), false); // a non-nominee with the most votes is eliminated
});

test('final vote eliminates; tie goes to runoff; runoff tie spares', () => {
  let s = night(game(STD), 'p5', 'p6', 'p1');
  s = day(s, [['p6', 'p1'], ['p7', 'p1']], [['p3', 'p1'], ['p6', 'p1'], ['p2', 'p7']]);
  fails(s, { type: 'FINAL_DECIDE', targetId: 'p2' }, /did not receive/);
  s = run(s, { type: 'FINAL_DECIDE', targetId: 'p1' });
  assert.equal(alive(s, 'p1'), false);
  assert.equal(s.eliminations.at(-1).cause, 'vote');
  assert.equal(s.phase, 'dayEnd');

  s = night(game(STD), 'p5', 'p6', 'p1');
  s = day(s, [['p6', 'p1'], ['p7', 'p2']], [['p3', 'p1'], ['p6', 'p2']]);
  fails(s, { type: 'FINAL_DECIDE', targetId: null }, /runoff/);
  s = run(s, { type: 'START_RUNOFF' }, ...votes([['p3', 'p1'], ['p6', 'p2']]), { type: 'CLOSE_VOTING' }, { type: 'REVEAL_FINAL' });
  fails(s, { type: 'FINAL_DECIDE', targetId: 'p1' }, /Nobody can be eliminated/);
  s = run(s, { type: 'FINAL_DECIDE', targetId: null });
  assert.equal(s.players.filter((p) => p.alive).length, 6);
});

test('Joker wins only through final vote', () => {
  const roles = ['Mafia', 'Joker', 'Villager', 'Villager', 'Villager'];
  let s = night(game(roles), 'p3');
  s = day(s, [['p1', 'p2'], ['p4', 'p2']], [['p1', 'p2'], ['p4', 'p2']]);
  s = run(s, { type: 'FINAL_DECIDE', targetId: 'p2' });
  assert.equal(s.winner, 'Joker');
  assert.equal(s.phase, 'over');

  s = night(game(roles, { jokerEndsGame: false }), 'p3');
  s = day(s, [['p1', 'p2']], [['p1', 'p2']]);
  s = run(s, { type: 'FINAL_DECIDE', targetId: 'p2' });
  assert.equal(s.individualWins.length, 1);
  assert.equal(s.phase, 'dayEnd');
});

test('Suicide Bomber takes one more down, then win check runs', () => {
  const roles = ['Mafia', 'Suicide Bomber', 'Villager', 'Villager', 'Villager', 'Villager', 'Villager'];
  let s = night(game(roles), 'p3');
  s = day(s, [['p4', 'p2']], [['p4', 'p2']]);
  s = run(s, { type: 'FINAL_DECIDE', targetId: 'p2' });
  assert.equal(s.phase, 'bomber');
  fails(s, { type: 'BOMBER_TARGET', targetId: 'p2' }, /already eliminated/);
  s = run(s, { type: 'BOMBER_TARGET', targetId: 'p1' });
  assert.equal(s.eliminations.at(-1).cause, 'bomber');
  assert.equal(s.winner, 'Town');
});

test('Town wins when all Mafia gone; Mafia wins at parity', () => {
  let s = night(game(['Mafia', 'Villager', 'Villager', 'Villager', 'Villager']), 'p2');
  s = day(s, [['p3', 'p1']], [['p3', 'p1']]);
  s = run(s, { type: 'FINAL_DECIDE', targetId: 'p1' });
  assert.equal(s.winner, 'Town');

  s = night(game(['Mafia', 'Villager', 'Villager', 'Villager']), 'p2');
  s = day(s, [['p3', 'p4']], [['p3', 'p4']]);
  s = run(s, { type: 'FINAL_DECIDE', targetId: 'p4' });
  assert.equal(s.winner, 'Mafia');

  s = night(game(['Mafia', 'Mafia', 'Villager', 'Villager', 'Villager']), 'p3');
  assert.equal(s.winner, 'Mafia');
  s = run(s, { type: 'START_DAY' });
  assert.equal(s.phase, 'over');
});

test('New Game fully resets', () => {
  const s = night(game(STD), 'p5', 'p6', 'p1');
  assert.equal(reducer(s, { type: 'RESET' }), null);
  const fresh = createGame(s.setup);
  assert.equal(fresh.eliminations.length, 0);
  assert.equal(fresh.round, 1);
});

test('open vote: anyone can be voted, most votes is eliminated, ties go to runoff', () => {
  let s = night(game(STD), 'p5', 'p6', 'p1');
  fails(run(s, { type: 'START_DAY' }), { type: 'START_FINAL' }, /not available/);
  s = run(s, { type: 'START_DAY' }, { type: 'START_OPEN_VOTE' });
  assert.equal(s.phase, 'final');
  assert.equal(s.vote.candidates.length, 6);
  s = run(s, ...votes([['p1', 'p7'], ['p2', 'p7'], ['p3', 'p4'], ['p4', 'p3']]), { type: 'CLOSE_VOTING' }, { type: 'REVEAL_FINAL' });
  s = run(s, { type: 'FINAL_DECIDE', targetId: 'p7' });
  assert.equal(alive(s, 'p7'), false);
  assert.equal(s.eliminations.at(-1).cause, 'vote');

  s = night(game(STD), 'p5', 'p6', 'p1');
  s = run(s, { type: 'START_DAY' }, { type: 'START_OPEN_VOTE' }, ...votes([['p1', 'p7'], ['p3', 'p2']]), { type: 'CLOSE_VOTING' }, { type: 'REVEAL_FINAL' }, { type: 'START_RUNOFF' });
  assert.deepEqual(s.vote.candidates, ['p2', 'p7']);
});
