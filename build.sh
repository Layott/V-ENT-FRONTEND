#!/usr/bin/env bash
# Build the frontend on the main dev machine.
#
# This machine loses node_modules/next/dist between an install and a build, and
# it does so silently. The failure is always the same line:
#
#   Cannot find module '.../next/dist/compiled/jest-worker/processChild.js'
#
# Why a plain reinstall is not enough. pnpm hardlinks files out of its
# content-addressable store into node_modules rather than copying them, so the
# file in node_modules and the file in the store are the same file on disk.
# Whatever removes next/dist removes it from the store at the same time, and
# the next `pnpm install` cheerfully "reuses" store entries with no content
# behind them - it reports "reused 533, downloaded 0" and leaves the directory
# empty. --force makes pnpm re-fetch instead of trusting the store.
#
# Why --force alone is not enough either. On 2026-08-26 an install --force
# immediately followed by a build failed, while the same install followed by a
# build a few seconds later in a separate shell succeeded, twice. Something is
# still deleting files shortly after they are written - a scanner, most likely.
# So the install is verified rather than assumed, and retried if the directory
# it just wrote has gone again.
#
# A fault of this machine, not of the project: the VPS builds fine with a plain
# `pnpm build`. So the workaround lives here rather than in package.json.
set -euo pipefail

SENTINEL_GLOB='node_modules/.pnpm/next@*/node_modules/next/dist/compiled/jest-worker/processChild.js'

installed() {
  # shellcheck disable=SC2086
  compgen -G "$SENTINEL_GLOB" > /dev/null 2>&1
}

for attempt in 1 2 3 4; do
  rm -rf node_modules
  pnpm install --force > /dev/null
  sleep 3                      # let whatever is deleting files finish deleting

  if ! installed; then
    echo "attempt $attempt: next/dist was empty straight after install; reinstalling"
    continue
  fi

  echo "attempt $attempt: install verified, building"
  if pnpm build "$@"; then
    exit 0
  fi

  # A build that fails because next/dist vanished under it is this machine's
  # fault and is worth retrying. A build that fails because the code is wrong
  # is not, and retrying it three times only wastes two minutes and buries the
  # error, so the two are told apart before deciding.
  if installed; then
    echo "build failed with node_modules intact: this is a real build error" >&2
    exit 1
  fi
  echo "attempt $attempt: next/dist disappeared during the build; retrying"
done

echo "giving up after 4 attempts: node_modules/next/dist keeps disappearing" >&2
exit 1
