// Role definitions, setup validation and random role assignment.

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 30;

export const ROLES = {
  Mafia: {
    team: 'Mafia',
    max: Infinity,
    desc: 'Each night, silently agree with the other Mafia on one player to eliminate. Win when the Mafia equals or outnumbers everyone else.',
  },
  Villager: {
    team: 'Town',
    max: Infinity,
    desc: 'You have no night power. Find the Mafia through discussion and vote them out.',
  },
  Policeman: {
    team: 'Town',
    max: 1,
    desc: 'Each night, investigate one player. God will secretly tell you whether they are Mafia.',
  },
  Healer: {
    team: 'Town',
    max: 1,
    desc: 'Each night, protect one player. If the Mafia attacks them, they survive.',
  },
  Joker: {
    team: 'Independent',
    max: 1,
    desc: 'You win if the town eliminates you in the final daytime vote. Being killed at night does not count.',
  },
  'Suicide Bomber': {
    team: 'Independent',
    max: 1,
    desc: 'If the town eliminates you in the final daytime vote, you take one more living player down with you.',
  },
};

export const ROLE_NAMES = Object.keys(ROLES);

export const DEFAULT_COUNTS = { Mafia: 2, Villager: 3, Policeman: 1, Healer: 1, Joker: 0, 'Suicide Bomber': 0 };

export const DEFAULT_SETTINGS = {
  healerSelfHeal: true,
  healerConsecutive: true,
  jokerEndsGame: true,
  finalTieRule: 'none', // 'none' = runoff tie spares everyone, 'god' = God may pick among the tied
};

export const teamOf = (role) => ROLES[role].team;
export const isMafia = (p) => p.role === 'Mafia';

export function duplicateNames(names) {
  const seen = new Set();
  const dupes = new Set();
  for (const raw of names) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return dupes;
}

export function validateSetup(names, counts) {
  const errors = [];
  const n = names.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) errors.push(`Choose between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`);
  if (names.some((s) => !s.trim())) errors.push('Every player needs a name.');
  const dupes = duplicateNames(names);
  if (dupes.size) errors.push(`Names must be unique (duplicate: ${[...dupes].join(', ')}).`);

  let total = 0;
  for (const role of ROLE_NAMES) {
    const c = counts[role] ?? 0;
    if (!Number.isInteger(c) || c < 0) errors.push(`${role} count is invalid.`);
    else if (c > ROLES[role].max) errors.push(`Only ${ROLES[role].max} ${role} is allowed.`);
    total += c;
  }
  if (total > n) errors.push(`Too many roles: ${total} roles for ${n} players.`);
  if (total < n) errors.push(`${n - total} role slot${n - total === 1 ? '' : 's'} still empty.`);

  const mafia = counts.Mafia ?? 0;
  if (mafia < 1) errors.push('At least one Mafia member is required.');
  else if (mafia >= n - mafia) errors.push('The Mafia must be outnumbered by the other players, or they win immediately.');
  return errors;
}

// Fisher–Yates shuffle of the role deck; rng is injectable for tests.
export function assignRoles(names, counts, rng = Math.random) {
  const deck = ROLE_NAMES.flatMap((r) => Array(counts[r] ?? 0).fill(r));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return names.map((name, i) => ({
    id: `p${i + 1}`,
    name: name.trim(),
    role: deck[i],
    alive: true,
    lastProtectedRound: null,
  }));
}
