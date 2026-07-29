/* eslint-disable @next/next/no-img-element */
import { resolveActiveLeague } from '@/lib/stats';
import { listRecaps } from '@/lib/recaps';
import { RecapEditor } from '@/components/RecapEditor';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function RecapsPage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  const season = league?.season ?? searchParams.season ?? '';
  const posts = season ? listRecaps(season) : [];

  return (
    <>
      <div className="dash-controls">
        <div>
          <h1 className="page-title">Recaps</h1>
          <p className="page-subtitle">
            {season ? `${season} weekly write-ups, newest first.` : 'Weekly write-ups.'}
          </p>
        </div>
        {season && <RecapEditor season={season} />}
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <h1>No recaps yet</h1>
          <p>
            Nothing has been posted for {season || 'this season'}. Use <strong>Make a post</strong>{' '}
            to write the first one.
          </p>
        </div>
      ) : (
        posts.map((p) => (
          <article className="card recap" id={`recap-${p.id}`} key={p.id}>
            <h2 className="recap-title">{p.title}</h2>
            {p.preheader && <p className="recap-preheader">{p.preheader}</p>}
            <p className="recap-date">{formatDate(p.createdAt)}</p>
            <div className="recap-body">
              {p.body.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {p.images.length > 0 && (
              <div className="recap-images">
                {p.images.map((name) => (
                  <img key={name} src={`/api/uploads/${name}`} alt="" loading="lazy" />
                ))}
              </div>
            )}
          </article>
        ))
      )}
    </>
  );
}
