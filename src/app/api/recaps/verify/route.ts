import { NextResponse } from 'next/server';
import { pinOk } from '@/lib/recaps';

export const dynamic = 'force-dynamic';

/** Unlocks the editor. Posting re-checks the PIN, so this is only a gate. */
export async function POST(request: Request) {
  const { pin } = (await request.json().catch(() => ({}))) as { pin?: string };
  if (!pinOk(pin)) {
    return NextResponse.json({ ok: false, error: 'Incorrect PIN.' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
