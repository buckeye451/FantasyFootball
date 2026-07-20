import type { LineupSlot, PlayerMeta } from './types';

// Which real positions may fill each lineup slot. Eligibilities are nested
// (RB ⊂ FLEX ⊂ SUPER_FLEX), so filling the most restrictive slots first with
// the highest scorer is an optimal assignment.
const SLOT_ELIGIBILITY: Record<string, string[]> = {
  QB: ['QB'],
  RB: ['RB'],
  WR: ['WR'],
  TE: ['TE'],
  K: ['K'],
  DEF: ['DEF'],
  DL: ['DL'],
  LB: ['LB'],
  DB: ['DB'],
  FLEX: ['RB', 'WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  REC_FLEX: ['WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  IDP_FLEX: ['DL', 'LB', 'DB'],
};

const BENCH_SLOTS = new Set(['BN', 'IR', 'TAXI']);

export function startingSlots(rosterPositions: string[]): string[] {
  return rosterPositions.filter((s) => !BENCH_SLOTS.has(s));
}

export interface OptimalResult {
  slots: LineupSlot[];
  optimalTotal: number;
  actualTotal: number;
  /** Points the manager left on the bench (optimal − actual, floored at 0). */
  pointsLost: number;
}

/**
 * Compute the best possible lineup for one team-week from the players they
 * rostered, then mark every optimal starter the manager actually left on the
 * bench (`wasBenched`) so the UI can highlight them.
 */
export function optimalLineup(
  rosterPositions: string[],
  starters: string[],
  playersPoints: Record<string, number>,
  playerMeta: Map<string, PlayerMeta>
): OptimalResult {
  const slots = startingSlots(rosterPositions);
  const started = new Set(starters.filter((id) => id && id !== '0'));

  const pool = Object.entries(playersPoints).map(([playerId, points]) => ({
    playerId,
    points,
    position: playerMeta.get(playerId)?.position ?? 'UNKNOWN',
  }));

  // Most restrictive slots first; highest scorer per slot from what remains.
  const order = slots
    .map((slot, i) => ({ slot, i, breadth: (SLOT_ELIGIBILITY[slot] ?? []).length || 99 }))
    .sort((a, b) => a.breadth - b.breadth);

  const used = new Set<string>();
  const filled: LineupSlot[] = slots.map((slot) => ({ slot, playerId: null, points: 0 }));
  for (const { slot, i } of order) {
    const eligible = SLOT_ELIGIBILITY[slot] ?? [];
    let best: { playerId: string; points: number } | null = null;
    for (const p of pool) {
      if (used.has(p.playerId)) continue;
      if (!eligible.includes(p.position)) continue;
      if (!best || p.points > best.points) best = p;
    }
    if (best) {
      used.add(best.playerId);
      filled[i] = {
        slot,
        playerId: best.playerId,
        points: best.points,
        wasBenched: !started.has(best.playerId),
      };
    }
  }

  const optimalTotal = round2(filled.reduce((sum, s) => sum + s.points, 0));
  const actualTotal = round2(
    starters.filter((id) => id && id !== '0').reduce((sum, id) => sum + (playersPoints[id] ?? 0), 0)
  );
  return {
    slots: filled,
    optimalTotal,
    actualTotal,
    pointsLost: Math.max(0, round2(optimalTotal - actualTotal)),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
