#!/usr/bin/env bash
# Local stack in one command: a fresh anvil chain seeded with demo stores, the API and the web app.
# Ctrl+C stops everything.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANVIL_PORT="${ANVIL_PORT:-8545}"
RPC_URL="http://127.0.0.1:${ANVIL_PORT}"

if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  echo "Something already serves $RPC_URL. Stop it first: the seed needs a fresh chain so that" >&2
  echo "addresses match packages/shared/src/deployments/31337.json." >&2
  exit 1
fi

anvil --port "$ANVIL_PORT" --silent &
ANVIL_PID=$!
trap 'kill "$ANVIL_PID" 2>/dev/null || true' EXIT

until cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; do sleep 0.2; done

echo "Seeding demo stores on $RPC_URL ..."
(cd "$ROOT/contracts" && forge script script/DevSeed.s.sol --rpc-url "$RPC_URL" --broadcast --silent)

pnpm --dir "$ROOT" --parallel --filter @neverrunaway/api --filter @neverrunaway/web dev
