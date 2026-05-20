#!/usr/bin/env bash
# Sunucu kapanirsa veya cokerse otomatik yeniden baslatir.
# Durdurmak for: Ctrl+C

cd "$(dirname "$0")/.."
RESTART_DELAY=${RESTART_DELAY:-3}
RUN_COUNT=0

cleanup() {
  echo ""
  echo "[$(date '+%H:%M:%S')] Script durduruldu (Ctrl+C)."
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "[$(date '+%H:%M:%S')] Dev sunucu surekli modda baslatiliyor (durdurmak: Ctrl+C)"
echo "[$(date '+%H:%M:%S')] Yeniden baslama gecikmesi: ${RESTART_DELAY}s"
echo ""

while true; do
  RUN_COUNT=$((RUN_COUNT + 1))
  echo "[$(date '+%H:%M:%S')] Calistirma #${RUN_COUNT}: npm run dev"
  echo "----------------------------------------"
  if npm run dev; then
    echo "[$(date '+%H:%M:%S')] Sunucu normal output yapti."
  else
    echo "[$(date '+%H:%M:%S')] Sunucu coktu veya kapandi (output kodu: $?)."
  fi
  echo "[$(date '+%H:%M:%S')] ${RESTART_DELAY} saniye sonra yeniden baslatiliyor..."
  sleep "$RESTART_DELAY"
  echo ""
done
