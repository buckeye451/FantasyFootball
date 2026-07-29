'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * App Router client navigations land at the top of the page even when the href
 * carries a hash — only a full page load honours it. The dashboard's "Full box
 * score" links point at one specific matchup, so this finishes the job.
 *
 * `scrollIntoView` respects the target's scroll-margin, which is what keeps the
 * matchup clear of the sticky header. Re-running it after a direct load, where
 * the browser already scrolled, is a no-op.
 */
export function ScrollToHash() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [pathname, searchParams]);

  return null;
}
