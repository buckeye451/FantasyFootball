// CLI sync:
//   npm run sync                       sync configured seasons (skips cached completed ones)
//   npm run sync -- --full             force a complete re-import of every season
//   npm run sync -- <league_id> ...    sync specific league id(s)
import { requireLeagueIds, syncAll } from '../src/lib/sync';

async function main() {
  const args = process.argv.slice(2);
  const full = args.includes('--full');
  const ids = args.filter((a) => a !== '--full');
  const leagueIds = ids.length ? ids : requireLeagueIds();
  console.log(
    `Syncing ${leagueIds.length} league id(s) from Sleeper${full ? ' (full re-import)' : ''}…`
  );
  const detail = await syncAll(leagueIds, { full });
  console.log(`Done: ${detail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
