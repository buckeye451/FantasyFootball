import Link from 'next/link';

export interface HubRow {
  href: string;
  icon: string;
  title: string;
  sub: string;
  /** Small right-aligned tag, e.g. "wk 15" or "1 new". */
  badge?: string;
}

/**
 * The list rows the phone hubs are built from. Each row is a full-width tap
 * target so the two hub screens can be worked one-handed.
 */
export function HubList({ rows }: { rows: HubRow[] }) {
  return (
    <div className="hub-list">
      {rows.map((r) => (
        <Link key={r.href + r.title} className="hub-row" href={r.href}>
          <span className="hub-row-icon" aria-hidden="true">
            {r.icon}
          </span>
          <span className="hub-row-body">
            <span className="hub-row-title">{r.title}</span>
            <span className="hub-row-sub">{r.sub}</span>
          </span>
          {r.badge && <span className="kicker hub-row-badge">{r.badge}</span>}
          <span className="hub-row-chevron" aria-hidden="true">
            ›
          </span>
        </Link>
      ))}
    </div>
  );
}
