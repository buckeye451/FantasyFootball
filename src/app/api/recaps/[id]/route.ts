import { NextResponse } from 'next/server';
import { deleteImages, deleteRecap, getRecap, pinOk, saveImage, updateRecap } from '@/lib/recaps';

export const dynamic = 'force-dynamic';

/** Edit an existing post. Images kept are passed back as `keep`; new files add to them. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const existing = Number.isFinite(id) ? getRecap(id) : null;
    if (!existing) return NextResponse.json({ ok: false, error: 'No such post.' }, { status: 404 });

    const form = await request.formData();
    if (!pinOk(form.get('pin')?.toString())) {
      return NextResponse.json({ ok: false, error: 'Incorrect PIN.' }, { status: 401 });
    }

    const title = form.get('title')?.toString().trim() ?? '';
    const preheader = form.get('preheader')?.toString() ?? '';
    const body = form.get('body')?.toString() ?? '';
    if (!title) return NextResponse.json({ ok: false, error: 'A heading is required.' }, { status: 400 });
    if (!body.trim()) return NextResponse.json({ ok: false, error: 'The post is empty.' }, { status: 400 });

    // Only names that were already on this post can be kept — a caller can't
    // attach someone else's upload by naming it.
    let requested: string[] = [];
    try {
      requested = JSON.parse(form.get('keep')?.toString() ?? '[]') as string[];
    } catch {
      requested = [];
    }
    const keep = existing.images.filter((name) => requested.includes(name));

    for (const entry of form.getAll('images')) {
      if (!(entry instanceof File)) continue;
      const name = await saveImage(entry);
      if (name) keep.push(name);
    }

    updateRecap(id, { title, preheader, body, images: keep });
    // Drop the files this edit removed so they don't linger on the volume.
    deleteImages(existing.images.filter((name) => !keep.includes(name)));
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ ok: false, error: 'Bad id.' }, { status: 400 });
    }
    const { pin } = (await request.json().catch(() => ({}))) as { pin?: string };
    if (!pinOk(pin)) {
      return NextResponse.json({ ok: false, error: 'Incorrect PIN.' }, { status: 401 });
    }
    if (!deleteRecap(id)) {
      return NextResponse.json({ ok: false, error: 'No such post.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
