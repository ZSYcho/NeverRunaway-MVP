#!/usr/bin/env bash
# Serves a production build over a temporary public HTTPS URL for testing in phone wallets.
# Phones can't reach the local anvil chain, so the build targets X Layer testnet. Scan the QR code
# with a wallet app's scanner to open the app in that wallet's browser. Ctrl+C stops everything.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PREVIEW_PORT:-4173}"
CHAIN_ID="${VITE_CHAIN_ID:-1952}"

if ! command -v cloudflared >/dev/null; then
  echo "cloudflared is required: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" >&2
  exit 1
fi

LOG_DIR="$(mktemp -d)"
cleanup() {
  kill "${PREVIEW_PID:-}" "${TUNNEL_PID:-}" 2>/dev/null || true
  rm -rf "$LOG_DIR"
}
trap cleanup EXIT

echo "Building the web app for chain $CHAIN_ID ..."
if ! VITE_CHAIN_ID="$CHAIN_ID" pnpm --dir "$ROOT" --filter @neverrunaway/web build >"$LOG_DIR/build.log" 2>&1; then
  cat "$LOG_DIR/build.log" >&2
  exit 1
fi

# Run the binaries directly (not through pnpm) so the cleanup trap stops the right processes.
(cd "$ROOT/apps/web" && exec ./node_modules/.bin/vite preview --port "$PORT" --strictPort) \
  >"$LOG_DIR/preview.log" 2>&1 &
PREVIEW_PID=$!
cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" >"$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!

URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/tunnel.log" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 0.5
done
if [ -z "$URL" ]; then
  echo "The tunnel did not start:" >&2
  cat "$LOG_DIR/tunnel.log" >&2
  exit 1
fi

for _ in $(seq 1 60); do
  grep -q "Registered tunnel connection" "$LOG_DIR/tunnel.log" && break
  sleep 0.5
done

# Don't hand out a dead link. Probe through a DNS-over-HTTPS resolver: asking the system resolver
# before the new hostname exists gets "no such host" cached, on this machine and possibly on the
# router the phone shares, for longer than the record takes to appear.
echo "Waiting for $URL to respond ..."
READY=""
for _ in $(seq 1 30); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 --doh-url https://1.1.1.1/dns-query "$URL" || true)"
  [ "$CODE" = "200" ] && READY=1 && break
  sleep 1
done
[ -n "$READY" ] || echo "Not reachable yet; if the phone can't open it, wait a minute and retry." >&2

pnpm --dir "$ROOT" exec qrcode --small "$URL"
echo "Scan with a wallet app's scanner, or open $URL in its browser. Ctrl+C stops."
wait "$TUNNEL_PID"
