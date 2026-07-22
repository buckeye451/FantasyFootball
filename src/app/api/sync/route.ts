import { NextResponse } from 'next/server';
import { requireLeagueIds, syncAll } from '@/lib/sync';

export const dynamic = 'force-dynamic';

// POST /api/sync         → routine sync (skips completed seasons already stored)
// POST /api/sync?full=1  → force a complete re-import of every season
export async function POST(request: Request) {
  try {
    const full = new URL(request.url).searchParams.get('full') === '1';
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
