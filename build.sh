#!/usr/bin/env bash
# Build the frontend on the main dev machine.
#
# This machine empties node_modules/next/dist/compiled during every build, so
# `pnpm build` only ever works once per install. `pnpm install --force` does not
# repair it (the pnpm store has lost the files too, so --force copies the same
# gap back: "reused 533, downloaded 0") and neither does pruning the store
# first, reliably. A clean reinstall always does.
#
# Unconditional rather than guarded: node_modules/next is a symlink into
# .pnpm/, so a guard that stats through the link can pass while the real
# directory is already gutted. About 40 seconds, and it always works.
#
# A fault of this machine, not of the project - the VPS builds fine with a
# plain `pnpm build` - so the workaround lives here, not in package.json.
set -euo pipefail
rm -rf node_modules
pnpm install > /dev/null
exec pnpm build "$@"
