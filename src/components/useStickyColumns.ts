'use client';

import { useEffect, useRef } from 'react';

/**
 * Pins the first `count` columns of a wide table to the left edge while it
 * scrolls sideways.
 *
 * Each pinned column has to clear the real width of the ones before it, and
 * those widths depend on the rendered content, so they're measured from the
 * header rather than guessed and re-measured whenever the table resizes. The
 * offsets land on the table as `--sticky-0`, `--sticky-1`, … for the CSS to
 * read.
 *
 * The table also carries `is-pinned` while it's actually scrolled, so the seam
 * on the last pinned column can stay hidden on a screen wide enough not to
 * need it.
 *
 * Returns the ref to attach to the <table>; its parent is assumed to be the
 * scrolling container.
 */
export function useStickyColumns(count: number) {
  const ref = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    const wrap = table.parentElement;

    const measure = () => {
      const header = table.querySelector('thead tr');
      if (!header) return;
      const cells = Array.from(header.children) as HTMLElement[];
      let offset = 0;
      for (let i = 0; i < count; i++) {
        table.style.setProperty(`--sticky-${i}`, `${offset}px`);
        offset += cells[i]?.getBoundingClientRect().width ?? 0;
      }
    };
    const onScroll = () => {
      table.classList.toggle('is-pinned', (wrap?.scrollLeft ?? 0) > 0);
    };

    measure();
    onScroll();
    const observer = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    observer.observe(table);
    wrap?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      wrap?.removeEventListener('scroll', onScroll);
    };
  }, [count]);

  return ref;
}
