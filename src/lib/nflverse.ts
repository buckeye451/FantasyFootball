/**
 * Historical NFL team affiliations from nflverse.
 *
 * Sleeper's player dump only carries a player's *current* team, so a 2024 page
 * would show Travis Etienne on his 2026 team. nflverse publishes weekly player
 * stats per season, including the team a player actually played for that week —
 * we use it to pin each player to the right team for completed seasons.
 *
 * Source: https://github.com/nflverse/nflverse-data (stats_player release)
 */

const BASE =
  process.env.NFLVERSE_BASE ??
  'https://github.com/nflverse/nflverse-data/releases/download/stats_player';

export interface NflSeasonTeam {
  /** NFL GSIS id, e.g. "00-0036973" — joins to Sleeper's gsis_id. */
  gsisId: string;
  name: string;
  position: string;
  /** Team the player appeared for most that season. */
  team: string;
}

/**
 * Split one CSV line, honouring quoted fields (nflverse headshot URLs contain
 * commas) and doubled quotes inside them.
 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(field);
      field = '';
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

/**
 * Reduce a season's weekly rows to one team per player: the team they appeared
 * for in the most weeks, breaking ties toward the later week (so a mid-season
 * trade resolves to where they finished).
 */
export function primaryTeams(csv: string): NflSeasonTeam[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const idx = {
    gsis: header.indexOf('player_id'),
    name: header.indexOf('player_display_name'),
    position: header.indexOf('position'),
    week: header.indexOf('week'),
    team: header.indexOf('team'),
  };
  if (idx.gsis < 0 || idx.team < 0) return [];

  interface Agg {
    name: string;
    position: string;
    counts: Map<string, { weeks: number; lastWeek: number }>;
  }
  const byPlayer = new Map<string, Agg>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    const cols = parseCsvLine(line);
    const gsis = cols[idx.gsis];
    const team = cols[idx.team];
    if (!gsis || !team) continue;
    const week = Number(cols[idx.week]) || 0;
    let agg = byPlayer.get(gsis);
    if (!agg) {
      agg = {
        name: idx.name >= 0 ? cols[idx.name] ?? '' : '',
        position: idx.position >= 0 ? cols[idx.position] ?? '' : '',
        counts: new Map(),
      };
      byPlayer.set(gsis, agg);
    }
    const cur = agg.counts.get(team) ?? { weeks: 0, lastWeek: 0 };
    cur.weeks++;
    cur.lastWeek = Math.max(cur.lastWeek, week);
    agg.counts.set(team, cur);
  }

  const out: NflSeasonTeam[] = [];
  for (const [gsisId, agg] of byPlayer) {
    let best: { team: string; weeks: number; lastWeek: number } | null = null;
    for (const [team, c] of agg.counts) {
      if (
        !best ||
        c.weeks > best.weeks ||
        (c.weeks === best.weeks && c.lastWeek > best.lastWeek)
      ) {
        best = { team, weeks: c.weeks, lastWeek: c.lastWeek };
      }
    }
    if (best) out.push({ gsisId, name: agg.name, position: agg.position, team: best.team });
  }
  return out;
}

/** Download one season's weekly player stats and reduce to a team per player. */
export async function seasonTeams(season: string): Promise<NflSeasonTeam[]> {
  const res = await fetch(`${BASE}/stats_player_week_${season}.csv`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`nflverse ${res.status} for season ${season}`);
  return primaryTeams(await res.text());
}
