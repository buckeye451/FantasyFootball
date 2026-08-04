import { getDb } from './db';
import { requireLeagueIds, syncAll } from './sync';

/**
 * Minutes since the most recent league sync, or null if nothing has ever
 * synced (a brand-new volume) or the table isn't readable yet.
 */
function minutesSinceLastSync(): number | null {
  try {
    const row = getDb()
      .prepare('SELECT MAX(last_synced_at) AS t FROM league')
      .get() as { t?: string | null } | undefined;
    if (!row?.t) return null;
    const ms = Date.now() - new Date(row.t).getTime();
    return Number.isFinite(ms) ? ms / 60000 : null;
  } catch {
    return null;
  }
}

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
  const period = minutes * 60 * 1000;
  const startInterval = () => setInterval(run, period).unref();

  // A deploy can restart the machine several times in under a minute, and each
  // boot lands here. Only sync on boot if the data on the volume is actually
  // due — a fresh volume (null age) always is.
  const age = minutesSinceLastSync();
  if (age == null || age >= minutes) {
    void run();
    startInterval();
  } else {
    // Wait out the remainder of the existing cycle rather than restarting the
    // clock, so a restart can't push the next sync a full period further out.
    const remaining = Math.max(0, period - age * 60 * 1000);
    console.log(
      `[auto-sync] last sync ${age.toFixed(0)}m ago; next in ${Math.round(remaining / 60000)}m`
    );
    setTimeout(() => {
      void run();
      startInterval();
    }, remaining).unref();
  }
}
