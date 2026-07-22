// CLI sync: `npm run sync` (uses SLEEPER_LEAGUE_ID) or
// `npm run sync -- <league_id> [<league_id> ...]` to sync specific seasons.
import { requireLeagueIds, syncAll } from '../src/lib/sync';

async function main() {
  const args = process.argv.slice(2);
  const leagueIds = args.length ? args : requireLeagueIds();
  console.log(`Syncing ${leagueIds.length} league id(s) from Sleeper (plus prior seasons)…`);
  const detail = await syncAll(leagueIds);
  console.log(`Done: ${detail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
