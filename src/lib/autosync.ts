import { requireLeagueIds, syncAll } from './sync';

// With AUTO_SYNC=true, the first page request after boot starts a background
// interval that re-pulls the league from Sleeper, so weekly data collects
// itself while the app is running. (npm run sync / a real cron hitting
// /api/sync work too — this is the zero-setup option.)
const globalForSync = globalThis as unknown as { __autoSyncStarted?: boolean };

export function ensureAutoSync(): void {
  if (process.env.AUTO_SYNC !== 'true') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (globalForSync.__autoSyncStarted) return;
  globalForSync.__autoSyncStarted = true;

  const minutes = Number(process.env.AUTO_SYNC_MINUTES ?? 60) || 60;
  const run = async () => {
    try {
      const detail = await syncAll(requireLeagueIds());
      console.log(`[auto-sync] ${new Date().toISOString()} ${detail}`);
    } catch (err) {
      console.error('[auto-sync] failed:', err);
    }
  };
  void run();
  setInterval(run, minutes * 60 * 1000).unref();
}
