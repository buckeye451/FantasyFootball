'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TeamNav({ teams }: { teams: Array<{ slug: string; name: string }> }) {
  const pathname = usePathname();
  return (
    <nav className="team-nav" aria-label="League navigation">
      <Link href="/" className={pathname === '/' ? 'active' : ''}>
        Dashboard
      </Link>
      {teams.map((t) => {
        const href = `/team/${t.slug}`;
        return (
          <Link key={t.slug} href={href} className={pathname.startsWith(href) ? 'active' : ''}>
            {t.name}
          </Link>
        );
      })}
    </nav>
  );
}
