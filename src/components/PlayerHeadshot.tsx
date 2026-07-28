'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { espnTeamAbbr } from '@/lib/nflTeams';
import type { PlayerMeta } from '@/lib/types';

const ESPN_CDN = 'https://a.espncdn.com';
const SLEEPER_CDN = 'https://sleepercdn.com';

/**
 * Image sources to try, best first. ESPN cutouts are transparent PNGs, which
 * sit better on a coloured tile than Sleeper's opaque JPGs, so ESPN leads and
 * Sleeper backs it up. Team defenses get a team logo — they have no headshot.
 */
function candidates(player: PlayerMeta): string[] {
  const out: string[] = [];
  if (player.position === 'DEF') {
    // A DEF's Sleeper id is the team code itself; fall back to that if the
    // season's team lookup came up empty.
    const abbr = espnTeamAbbr(player.team) ?? espnTeamAbbr(player.playerId);
    if (abbr) {
      out.push(`${ESPN_CDN}/i/teamlogos/nfl/500-dark/${abbr}.png`);
      out.push(`${SLEEPER_CDN}/images/team_logos/nfl/${abbr}.png`);
    }
    return out;
  }
  if (player.espnId) out.push(`${ESPN_CDN}/i/headshots/nfl/players/full/${player.espnId}.png`);
  if (player.playerId) out.push(`${SLEEPER_CDN}/content/nfl/players/thumb/${player.playerId}.jpg`);
  return out;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

/**
 * A player's headshot with a fallback chain. When every remote source fails
 * (rookies before camp, players ESPN has no photo for) it settles on an
 * initials avatar rather than another image, so a failing placeholder can't
 * loop. Mount with key={playerId} so the fallback index resets per player.
 */
export function PlayerHeadshot({ player, size = 44 }: { player: PlayerMeta; size?: number }) {
  const srcs = candidates(player);
  const [idx, setIdx] = useState(0);
  const src = srcs[idx];

  return (
    <span className="headshot" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setIdx((i) => i + 1)}
        />
      ) : (
        <span className="headshot-initials" aria-hidden="true">
          {initials(player.name)}
        </span>
      )}
    </span>
  );
}
