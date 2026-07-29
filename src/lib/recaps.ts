import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb, DB_PATH } from './db';

/** Uploads live beside the database so they land on the same Fly volume. */
export const UPLOAD_DIR = path.join(path.dirname(DB_PATH), 'uploads');

/** PIN that gates posting. Override with RECAP_PIN in the environment. */
const PIN = process.env.RECAP_PIN ?? '1252';

export function pinOk(pin: string | null | undefined): boolean {
  if (!pin) return false;
  const a = Buffer.from(String(pin));
  const b = Buffer.from(PIN);
  // Constant-time compare, guarding the length mismatch timingSafeEqual throws on.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface Recap {
  id: number;
  season: string;
  title: string;
  preheader: string | null;
  body: string;
  images: string[];
  createdAt: string;
}

function toRecap(r: Record<string, unknown>): Recap {
  let images: string[] = [];
  try {
    images = r.images ? (JSON.parse(r.images as string) as string[]) : [];
  } catch {
    images = [];
  }
  return {
    id: r.id as number,
    season: r.season as string,
    title: r.title as string,
    preheader: (r.preheader as string) ?? null,
    body: r.body as string,
    images,
    createdAt: r.created_at as string,
  };
}

/** Every post for a season, newest first. */
export function listRecaps(season: string): Recap[] {
  const rows = getDb()
    .prepare('SELECT * FROM recaps WHERE season = ? ORDER BY created_at DESC, id DESC')
    .all(season) as Array<Record<string, unknown>>;
  return rows.map(toRecap);
}

/** The most recent post for a season, for the dashboard preview. */
export function latestRecap(season: string): Recap | null {
  const row = getDb()
    .prepare('SELECT * FROM recaps WHERE season = ? ORDER BY created_at DESC, id DESC LIMIT 1')
    .get(season) as Record<string, unknown> | undefined;
  return row ? toRecap(row) : null;
}

export function createRecap(input: {
  season: string;
  title: string;
  preheader?: string | null;
  body: string;
  images?: string[];
}): number {
  const result = getDb()
    .prepare(
      `INSERT INTO recaps (season, title, preheader, body, images, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.season,
      input.title,
      input.preheader?.trim() || null,
      input.body,
      JSON.stringify(input.images ?? []),
      new Date().toISOString()
    );
  return Number(result.lastInsertRowid);
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Store an uploaded image and return its generated file name. The name is
 * random and the extension comes from the content type, so a hostile filename
 * can't escape the upload directory.
 */
export async function saveImage(file: File): Promise<string | null> {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return null;
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) return null;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return name;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

/** Read a stored upload by name. Rejects anything that isn't a plain file name. */
export function readImage(name: string): { body: Buffer; contentType: string } | null {
  if (!/^[A-Za-z0-9-]+\.(jpg|png|gif|webp|avif)$/.test(name)) return null;
  const full = path.join(UPLOAD_DIR, name);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return null;
  try {
    return {
      body: fs.readFileSync(full),
      contentType: CONTENT_TYPE_BY_EXT[path.extname(name)] ?? 'application/octet-stream',
    };
  } catch {
    return null;
  }
}
