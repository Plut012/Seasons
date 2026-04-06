export const NATURE_NAMES: string[] = [
  'eagle',
  'turtle',
  'lion',
  'spider',
  'hawk',
  'wolf',
  'bear',
  'fox',
  'owl',
  'raven',
  'elk',
  'heron',
  'viper',
  'moth',
  'crow',
  'lynx',
  'otter',
  'stag',
  'wren',
  'pike',
];

/**
 * Pick a random unused nature name from the curated list.
 * If all names are taken (more than 20 players — shouldn't happen),
 * falls back to a generic numbered name.
 */
export function assignName(existingNames: string[]): string {
  const existing = new Set(existingNames.map((n) => n.toLowerCase()));
  const available = NATURE_NAMES.filter((n) => !existing.has(n));

  if (available.length === 0) {
    // Fallback: shouldn't happen in normal gameplay (max 5 players)
    return `player${existingNames.length + 1}`;
  }

  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}
