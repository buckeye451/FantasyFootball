repo: buckeye451/FantasyFootball
branch: claude/bmcf24league-access-33xz3j

## Last sync
date: 2026-08-04T18:17:48Z

### Updated in this project
- Turn 3: Compact/Full tabs so every column the app has today stays reachable (dashboard, manager, lifetime)
- Merged direction (turn 2): Broadcast dashboard + season heat + bottom tab bar + record book, with the latest-recap tile
- Dashboard charts corrected against `FocusCharts.tsx` (context lines, #rank axis, end labels, 380px box)
- Splash cutouts now use the real `public/hero/player-*.png`
- Recreated the 2024 dashboard and three directions on the unchanged color tokens

## Screen map
| Project screen | Repo files |
| --- | --- |
| 3a Dashboard, Full tabs | src/app/dashboard/page.tsx, src/components/StandingsTable.tsx, src/components/MatchupBreakdown.tsx, src/components/PlayerCards.tsx, src/components/SeasonProgress.tsx |
| 3b Manager page, Full tabs | src/app/team/[slug]/page.tsx, src/components/WeeklyResultsTable.tsx, src/components/RankTiles.tsx, src/components/FocusCharts.tsx, src/components/PageNav.tsx |
| 3c Lifetime, Full tabs | src/app/lifetime/page.tsx, src/components/LifetimeStandingsTable.tsx, src/components/FocusCharts.tsx (SeasonPointsChart) |
| 2a/2b/2c Merged direction | src/app/dashboard/page.tsx, src/components/FocusCharts.tsx, src/components/RecordBook.tsx, src/components/SiteHeader.tsx, src/app/globals.css |
| 1a Dashboard recreation | src/app/layout.tsx, src/app/dashboard/page.tsx, src/components/SiteHeader.tsx, src/components/StandingsTable.tsx, src/components/PlayerCards.tsx, src/components/SeasonProgress.tsx, src/components/FocusCharts.tsx, src/app/globals.css |
| 1b Broadcast (dashboard, team lineup) | src/app/dashboard/page.tsx, src/components/RosterTables.tsx, src/app/team/[slug]/page.tsx, src/app/globals.css |
| 1c Gameday (week, record book, splash) | src/app/page.tsx, src/components/MatchupBreakdown.tsx, src/components/RecordBook.tsx, src/components/PlayerHeadshot.tsx, src/app/globals.css |
| 1d The Ledger (dashboard, team, lifetime) | src/app/dashboard/page.tsx, src/app/team/[slug]/page.tsx, src/components/RankTiles.tsx, src/components/LifetimeStandingsTable.tsx, src/app/globals.css |
