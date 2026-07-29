import { NextResponse } from 'next/server';
import { createRecap, pinOk, saveImage } from '@/lib/recaps';

export const dynamic = 'force-dynamic';

/** Create a recap post. The PIN is checked here, never in the browser bundle. */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    if (!pinOk(form.get('pin')?.toString())) {
      return NextResponse.json({ ok: false, error: 'Incorrect PIN.' }, { status: 401 });
    }

    const season = form.get('season')?.toString().trim() ?? '';
    const title = form.get('title')?.toString().trim() ?? '';
    const preheader = form.get('preheader')?.toString() ?? '';
    const body = form.get('body')?.toString() ?? '';
    if (!season) return NextResponse.json({ ok: false, error: 'Missing season.' }, { status: 400 });
    if (!title) return NextResponse.json({ ok: false, error: 'A heading is required.' }, { status: 400 });
    if (!body.trim()) return NextResponse.json({ ok: false, error: 'The post is empty.' }, { status: 400 });

    const images: string[] = [];
    let rejected = 0;
    for (const entry of form.getAll('images')) {
      if (!(entry instanceof File)) continue;
      const name = await saveImage(entry);
      if (name) images.push(name);
      else rejected++;
    }

    const id = createRecap({ season, title, preheader, body, images });
    return NextResponse.json({ ok: true, id, images: images.length, rejected });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
