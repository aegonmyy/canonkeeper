#!/usr/bin/env bash
# Retry testnet faucet funding for the CanonKeeper DKG node's wallets.
# The euphoria faucet's ETH pool was dry on 2026-09-17 — retry until it refills.
# Then attempt vm/publish (scripts/publish.sh or POST /api/publish) to mint the UAL.
set -euo pipefail

TOKEN=$(dkg auth show 2>/dev/null | tail -1)
BASE=http://127.0.0.1:9200

WALLETS=$(curl -s "$BASE/api/operational-wallets" -H "Authorization: Bearer $TOKEN" |
  python3 -c "import sys,json; print(json.dumps([w['address'] for w in json.load(sys.stdin)['wallets']]))")

echo "Requesting faucet funding for: $WALLETS"
curl -s -m 45 -X POST https://euphoria.origin-trail.network/faucet/fund \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: canonkeeper-$(date +%s)" \
  -d "{\"mode\":\"v10_base_sepolia\",\"wallets\":$WALLETS}" | python3 -m json.tool 2>/dev/null || true

PRIMARY=$(echo "$WALLETS" | python3 -c "import sys,json; print(json.load(sys.stdin)[0])")
echo
echo "Primary wallet balance:"
curl -s -m 15 -X POST https://sepolia.base.org -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getBalance\",\"params\":[\"$PRIMARY\",\"latest\"]}"
echo
