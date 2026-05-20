#!/usr/bin/env bash
# Port 3000'i kullanan islemi sonlandirir, ardindan npm run dev calistirir.

cd "$(dirname "$0")/.."
PORT=3000

if command -v lsof >/dev/null 2>&1; then
  PID=$(lsof -ti ":$PORT" 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "Port $PORT kullanimda (PID: $PID). Sonlandiriliyor..."
    kill -9 $PID 2>/dev/null || true
    sleep 1
    echo "Port $PORT serbest."
  fi
else
  echo "Warning: lsof bulunamadi, port kontrolu atlaniyor."
fi

exec npm run dev
