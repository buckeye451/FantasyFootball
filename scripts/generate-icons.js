/**
 * Regenerates the app icons from public/hero/logo.svg.
 *
 * Run this after replacing the logo:
 *   npx playwright install chromium   # once, if you don't have it
 *   node scripts/generate-icons.js
 *
 * Chromium does the rasterising because logo.svg isn't a clean vector — it
 * carries embedded PNGs and filters that most SVG converters render wrong.
 *
 * Outputs (both picked up automatically by Next's metadata file convention):
 *   src/app/icon.png        512x512, transparent — browser tabs and bookmarks
 *   src/app/apple-icon.png  180x180, purple      — iOS "Add to Home Screen"
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const REPO = path.join(__dirname, '..');
const LOGO_SVG = fs.readFileSync(path.join(REPO, 'public/hero/logo.svg'));
// Inlined as a data URI: an <img src="file://..."> is blocked as cross-origin
// from an about:blank page, which silently yields a broken-image icon.
const LOGO = 'data:image/svg+xml;base64,' + LOGO_SVG.toString('base64');

// Matches .splash in globals.css — the app's own purple backdrop.
const PURPLE = 'radial-gradient(125% 125% at 66% 38%, #6a3a9c 0%, #401d67 46%, #1b0930 100%)';

/**
 * `fill` scales the badge to the square's height and lets the ends of the
 * swoosh crop off; `fit` keeps the whole logo inside a margin. The logo is
 * 1.5:1, so fitting it into a square leaves a third of the height empty —
 * fine at home-screen size, but at a 16px tab it shrinks the mark to an
 * unreadable sliver.
 */
function html({ size, bg, inset, mode }) {
  const img =
    mode === 'fill'
      ? `height:${size}px;width:auto;max-width:none;`
      : `width:${size - inset * 2}px;height:auto;`;
  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:${bg || 'transparent'};}
    .wrap{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;overflow:hidden;}
    img{${img}display:block;}
  </style></head><body><div class="wrap"><img src="${LOGO}"></div></body></html>`;
}

const JOBS = [
  // Browser tab: transparent, so it sits on light or dark browser chrome.
  { out: 'src/app/icon.png', size: 512, bg: null, mode: 'fill', omitBackground: true },
  // iOS home screen: transparency comes out black there, so the purple is
  // baked in. iOS also rounds the corners, hence the margin.
  {
    out: 'src/app/apple-icon.png',
    size: 180,
    bg: PURPLE,
    mode: 'fit',
    inset: 12,
    omitBackground: false,
  },
];

(async () => {
  const browser = await chromium.launch();
  for (const job of JOBS) {
    const ctx = await browser.newContext({
      viewport: { width: job.size, height: job.size },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.setContent(html(job), { waitUntil: 'networkidle' });
    const dest = path.join(REPO, job.out);
    await page.screenshot({ path: dest, omitBackground: job.omitBackground });
    console.log(`${job.out}  ${job.size}x${job.size}  ${fs.statSync(dest).size} bytes`);
    await ctx.close();
  }
  await browser.close();
})();
