/**
 * Sleeper usernames → the names we actually call each other.
 *
 * Sleeper is the source of truth for who owns a roster, but its display names
 * are handles. This is the single place that maps them, applied where teams are
 * read out of the database so every page shows real names. Keys are compared
 * case-insensitively; an unmapped handle (a new manager) shows through as-is.
 */
const MANAGER_NAMES: Record<string, string> = {
  cincysam451: 'Sam',
  donniedialup: 'Parker',
  colinharrison: 'Colin',
  prestoncasper: 'Preston',
  alapel: 'Lapel',
  keithchief: 'Keith',
  cjasin: 'Chris',
  emoney1997: 'Evan',
  dirsh: 'Cam',
  jmoneyy10: 'Jack',
};

export function managerName(username: string | null | undefined): string {
  if (!username) return '';
  return MANAGER_NAMES[username.trim().toLowerCase()] ?? username;
}
