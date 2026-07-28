/** Official-ish team colours, keyed by the abbreviation Sleeper uses. */
export const NFL_COLORS: Record<string, { primary: string; secondary: string }> = {
  // AFC East
  BUF: { primary: '#00338D', secondary: '#C60C30' },
  MIA: { primary: '#008E97', secondary: '#FC4C02' },
  NE: { primary: '#002244', secondary: '#C60C30' },
  NYJ: { primary: '#125740', secondary: '#000000' },

  // AFC North
  BAL: { primary: '#241773', secondary: '#9E7C0C' },
  CIN: { primary: '#FB4F14', secondary: '#000000' },
  CLE: { primary: '#311D00', secondary: '#FF3C00' },
  PIT: { primary: '#101820', secondary: '#FFB612' },

  // AFC South
  HOU: { primary: '#03202F', secondary: '#A71930' },
  IND: { primary: '#002C5F', secondary: '#A2AAAD' },
  JAX: { primary: '#006778', secondary: '#D7A22A' },
  TEN: { primary: '#0C2340', secondary: '#4B92DB' },

  // AFC West
  DEN: { primary: '#FB4F14', secondary: '#002244' },
  KC: { primary: '#E31837', secondary: '#FFB81C' },
  LV: { primary: '#000000', secondary: '#A5ACAF' },
  LAC: { primary: '#0080C6', secondary: '#FFC20E' },

  // NFC East
  DAL: { primary: '#003594', secondary: '#869397' },
  NYG: { primary: '#0B2265', secondary: '#A71930' },
  PHI: { primary: '#004C54', secondary: '#A5ACAF' },
  WAS: { primary: '#5A1414', secondary: '#FFB612' },

  // NFC North
  CHI: { primary: '#0B162A', secondary: '#C83803' },
  DET: { primary: '#0076B6', secondary: '#B0B7BC' },
  GB: { primary: '#203731', secondary: '#FFB612' },
  MIN: { primary: '#4F2683', secondary: '#FFC62F' },

  // NFC South
  ATL: { primary: '#A71930', secondary: '#000000' },
  CAR: { primary: '#0085CA', secondary: '#101820' },
  NO: { primary: '#D3BC8D', secondary: '#101820' },
  TB: { primary: '#D50A0A', secondary: '#34302B' },

  // NFC West
  ARI: { primary: '#97233F', secondary: '#000000' },
  LAR: { primary: '#003594', secondary: '#FFA300' },
  SF: { primary: '#AA0000', secondary: '#B3995D' },
  SEA: { primary: '#002244', secondary: '#69BE28' },
};

/**
 * Other codes that mean the same franchise. nflverse writes LA for the Rams
 * where Sleeper writes LAR; the rest cover relocations and older feeds.
 */
const TEAM_ALIASES: Record<string, string> = {
  LA: 'LAR',
  STL: 'LAR',
  SD: 'LAC',
  OAK: 'LV',
  WSH: 'WAS',
  WFT: 'WAS',
  JAC: 'JAX',
  ARZ: 'ARI',
  BLT: 'BAL',
  CLV: 'CLE',
  HST: 'HOU',
};

/** Normalize a team code to the abbreviation used throughout the app. */
export function canonicalTeam(code: string | null | undefined): string | null {
  if (!code) return null;
  const up = code.trim().toUpperCase();
  if (!up || up === 'FA') return up || null;
  return TEAM_ALIASES[up] ?? up;
}

/**
 * ESPN's abbreviation for a Sleeper team code, lowercased for CDN paths.
 * They agree on 31 of 32 teams; Washington is the exception.
 */
const ESPN_TEAM_OVERRIDES: Record<string, string> = { WAS: 'WSH' };

export function espnTeamAbbr(team: string | null | undefined): string | null {
  const key = canonicalTeam(team);
  if (!key || key === 'FA' || !NFL_COLORS[key]) return null;
  return (ESPN_TEAM_OVERRIDES[key] ?? key).toLowerCase();
}

function srgb(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface TeamStyle {
  bg: string;
  fg: string;
  border: string;
}

/**
 * Badge colours for a team: the team's primary as the background, with the
 * most legible foreground among its secondary, white and near-black. Teams
 * whose primary is nearly black (LV, PIT, CLE…) get a light outline so the
 * badge still reads against the app's dark page.
 */
export function teamStyle(code: string | null | undefined): TeamStyle | null {
  const key = canonicalTeam(code);
  if (!key) return null;
  const c = NFL_COLORS[key];
  if (!c) return null;
  const fg = [c.secondary, '#FFFFFF', '#0B0B0B'].reduce((best, candidate) =>
    contrast(c.primary, candidate) > contrast(c.primary, best) ? candidate : best
  );
  const border = luminance(c.secondary) < 0.06 ? 'rgba(255,255,255,0.22)' : c.secondary;
  return { bg: c.primary, fg, border };
}
