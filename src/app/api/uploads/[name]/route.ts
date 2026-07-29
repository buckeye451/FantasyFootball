import { readImage } from '@/lib/recaps';

export const dynamic = 'force-dynamic';

/** Serves recap images off the data volume (they aren't in the build). */
export async function GET(_request: Request, { params }: { params: { name: string } }) {
  const file = readImage(params.name);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
