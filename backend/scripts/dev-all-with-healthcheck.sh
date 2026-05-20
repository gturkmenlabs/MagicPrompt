#!/usr/bin/env bash
set -euo pipefail

API_PORT="${SR_API_PORT:-4000}"
API_URL="http://127.0.0.1:${API_PORT}/v1/health"
MAX_WAIT_SECONDS="${SR_HEALTHCHECK_TIMEOUT_SECONDS:-60}"

echo "[dev:all:safe] starting API on port ${API_PORT}..."
npm run api >/tmp/neomagic-api.log 2>&1 &
API_PID=$!

cleanup() {
  if kill -0 "${API_PID}" >/dev/null 2>&1; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "[dev:all:safe] waiting for ${API_URL} (${MAX_WAIT_SECONDS}s timeout)..."
START_TS="$(date +%s)"
until curl --silent --fail --max-time 2 "${API_URL}" >/dev/null 2>&1; do
  if ! kill -0 "${API_PID}" >/dev/null 2>&1; then
    echo "[dev:all:safe] API process exited unexpectedly. Last logs:"
    tail -n 50 /tmp/neomagic-api.log || true
    exit 1
  fi

  NOW_TS="$(date +%s)"
  ELAPSED=$((NOW_TS - START_TS))
  if [ "${ELAPSED}" -ge "${MAX_WAIT_SECONDS}" ]; then
    echo "[dev:all:safe] API health check timed out after ${MAX_WAIT_SECONDS}s."
    tail -n 50 /tmp/neomagic-api.log || true
    exit 1
  fi
  sleep 1
done

echo "[dev:all:safe] API healthy. starting Vite dev server..."
npm run dev
