#!/usr/bin/env bash
# Hostinger VPS uzerinde projeyi gunceller (git pull, build, restart).
# Kullanim: VPS'e SSH ile baglanip bu scripti calistirin veya rsync + ssh ile uzaktan calistirin.
set -euo pipefail

APP_NAME="super-reasoning"
APP_DIR="/opt/$APP_NAME"

echo "Guncelleme basliyor..."
cd "$APP_DIR"
git pull origin main
npm ci || npm install
npm run build
systemctl restart "$APP_NAME"
echo "Guncelleme tamamlandi. Kontrol: systemctl status $APP_NAME"
