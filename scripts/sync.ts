// CLI sync: `npm run sync` (uses SLEEPER_LEAGUE_ID) or `npm run sync -- <league_id>`.
import { requireLeagueId, syncLeague } from '../src/lib/sync';

async function main() {
  const leagueId = process.argv[2] ?? requireLeagueId();
  console.log(`Syncing league ${leagueId} from Sleeper…`);
  const detail = await syncLeague(leagueId);
  console.log(`Done: ${detail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
