#!/bin/sh
# Container entrypoint for the Fly deployment.
#
# Kick off a data sync in the background (best-effort) so the web server can
# start accepting connections immediately — Fly health checks pass right away,
# and cold-start requests are served instantly. On a brand-new volume the
# dashboard fills in within a few seconds of the first boot; on later starts the
# last-synced data is already on the volume, and AUTO_SYNC keeps it fresh.
if [ -n "$SLEEPER_LEAGUE_ID" ]; then
  ( npm run sync || echo "[entrypoint] initial sync failed; AUTO_SYNC will retry" ) &
fi

exec npm run start
