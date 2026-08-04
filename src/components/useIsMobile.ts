'use client';

import { useEffect, useState } from 'react';

/**
 * True at phone widths — for the cases a media query can't reach, like a
 * component deciding how many rows to render or what margin to hand a chart.
 *
 * Starts false so the server and the first client render agree; the real value
 * lands in the effect immediately after mount.
 */
export function useIsMobile(query = '(max-width: 640px)'): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return mobile;
}
