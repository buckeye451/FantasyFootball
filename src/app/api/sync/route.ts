import { NextResponse } from 'next/server';
import { requireLeagueId, syncLeague } from '@/lib/sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const detail = await syncLeague(requireLeagueId());
    return NextResponse.json({ ok: true, detail });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// Convenience so a browser visit (or a simple cron ping) can trigger a sync too.
export async function GET() {
  return POST();
}
