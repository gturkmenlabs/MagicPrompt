#!/usr/bin/env bash
# Backend /v1/health yanit verene kadar bekler (max 30s).
# Exit 0: health OK, 1: timeout veya error.

set -e
BASE_URL="${1:-http://localhost:4000}"
HEALTH_URL="${BASE_URL}/v1/health"
MAX_WAIT="${2:-30}"
INTERVAL=2
elapsed=0

echo "[wait-for-api] Checking $HEALTH_URL (max ${MAX_WAIT}s)..."

while [ "$elapsed" -lt "$MAX_WAIT" ]; do
  if code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$HEALTH_URL" 2>/dev/null); then
    if [ "$code" = "200" ]; then
      echo "[wait-for-api] Health OK (HTTP 200)."
      exit 0
    fi
  fi
  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
  echo "[wait-for-api] Waiting... ${elapsed}s"
done

echo "[wait-for-api] Timeout: backend did not respond with 200 within ${MAX_WAIT}s."
exit 1
