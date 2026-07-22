/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Left-to-right order + relative heights, tuned to overlap like the mockup.
const PLAYERS = [
  { src: '/hero/player-1.png', h: 64, z: 1 },
  { src: '/hero/player-4.png', h: 60, z: 2 },
  { src: '/hero/player-2.png', h: 86, z: 4 },
  { src: '/hero/player-3.png', h: 74, z: 3 },
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
            style={{ ['--h' as string]: `${p.h}vh`, zIndex: p.z, animationDelay: `${0.15 + i * 0.15}s` }}
          />
        ))}
      </div>

      <div className="splash-right">
        <img src="/hero/logo.svg" alt="BMCFF Fantasy Football" className="splash-logo" />
        <Link href="/" className="splash-cta">
          CLICK TO ENTER
        </Link>
      </div>
    </div>
  );
}
