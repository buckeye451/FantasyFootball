import { NextResponse } from 'next/server';
import { requireLeagueIds, syncAll, syncLeague } from '@/lib/sync';

export const dynamic = 'force-dynamic';

// POST /api/sync                  → routine sync (skips completed seasons already stored)
// POST /api/sync?full=1           → force a complete re-import of every configured season
// POST /api/sync?league=<id>      → force a complete re-fetch of just one league/season
//                                   (use this to repair a season that synced incompletely)
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const league = url.searchParams.get('league');
    if (league) {
      const detail = await syncLeague(league, true);
      return NextResponse.json({ ok: true, detail });
    }
    const full = url.searchParams.get('full') === '1';
    const detail = await syncAll(requireLeagueIds(), { full });
    return NextResponse.json({ ok: true, detail });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// Convenience so a browser visit (or a simple cron ping) can trigger a sync too.
export async function GET(request: Request) {
  return POST(request);
}
