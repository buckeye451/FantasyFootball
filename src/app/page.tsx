/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Where "CLICK TO ENTER" leads — the 2026 season dashboard.
const ENTER_HREF = '/dashboard?season=2026';

// Left-to-right order, relative heights (vh), z-depth, and per-player overlap
// with the previous one (vw) — tuned to cluster/layer like the mockup.
// player-4 is the Seahawks waist-up bust, kept as a large foreground element.
const PLAYERS = [
  { src: '/hero/player-1.png', h: 72, z: 2, overlap: 0 }, // Cardinals (left)
  { src: '/hero/player-4.png', h: 66, z: 4, overlap: 9 }, // Seahawks (front bust)
  { src: '/hero/player-2.png', h: 90, z: 1, overlap: 11 }, // Ravens (tall, behind)
  { src: '/hero/player-3.png', h: 80, z: 3, overlap: 12 }, // Colts (front, tucks behind logo)
];

export default function WelcomePage() {
  return (
    <div className="splash">
      <div className="splash-players">
        {PLAYERS.map((p, i) => (
          <img
            key={p.src}
            src={p.src}
            alt=""
            className="splash-player"
            style={{
              ['--h' as string]: `${p.h}vh`,
              marginLeft: `-${p.overlap}vw`,
              zIndex: p.z,
              animationDelay: `${0.15 + i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <div className="splash-right">
        <img src="/hero/logo.svg" alt="BMCFF Fantasy Football" className="splash-logo" />
        <Link href={ENTER_HREF} className="splash-cta">
          CLICK TO ENTER
        </Link>
      </div>
    </div>
  );
}
