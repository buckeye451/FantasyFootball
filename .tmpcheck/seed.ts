import { seedBoard, weekScoreBoard, resolveActiveLeague } from '../src/lib/stats';
const lg = resolveActiveLeague('2025')!;
const b = seedBoard(lg.leagueId);
console.log(`games remaining: ${b.gamesRemaining}, spots: ${b.playoffSpots}`);
for (const r of b.rows) {
  const s = r.standing;
  console.log(`#${String(r.rank).padStart(2)} ${s.team.displayName.padEnd(8)} ${s.wins}-${s.losses}  ${r.state.padEnd(13)} chip="${r.chip}"  note="${r.note}"`);
}
console.log('\n--- week 14 score board ---');
const w = weekScoreBoard(lg.leagueId, 14);
for (const c of w.cards) {
  const tag = c.isHigh ? 'HIGH' : c.isClosest ? 'CLOSEST' : 'final';
  console.log(`${tag.padEnd(8)} ${c.winner.team.displayName} ${c.winner.score} def. ${c.loser.team.displayName} ${c.loser.score} by ${c.margin}`);
}
console.log('sorted:');
for (const r of w.sorted) console.log(`  ${r.team.displayName.padEnd(8)} ${r.score.toFixed(1)} ${r.won ? 'W' : 'L'} share=${r.share.toFixed(3)}${r.isTop ? ' TOP' : ''}`);
