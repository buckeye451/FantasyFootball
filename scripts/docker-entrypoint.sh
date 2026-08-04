#!/bin/sh
# Container entrypoint for the Fly deployment.
#
# The server is the only thing started here, and it is exec'd so it inherits
# this process and receives Fly's SIGINT/SIGTERM directly on shutdown.
#
# Syncing is deliberately NOT kicked off here. It used to run as a backgrounded
# `npm run sync`, which caused two problems:
#
#   * `exec` below replaces this shell, orphaning that child. Fly signals only
#     its main child on shutdown, so the orphan kept the SQLite file on /data
#     open and the volume unmount failed with EBUSY.
#   * It duplicated the sync AUTO_SYNC already runs inside the server moments
#     later, putting two writers on one database with no locking between them.
#
# AUTO_SYNC (src/lib/autosync.ts) does the same work in the server process, on
# the first request after boot and then on an interval, so nothing is lost.
exec npm run start
