#!/usr/bin/env bash
set -euo pipefail

DEFAULT_TARGET="${COMPOSE_TARGET:-dev}"
ACTION="${1:-help}"
TARGET="${2:-$DEFAULT_TARGET}"

dev_file="docker-compose.dev.yml"
vps_file="docker-compose.vps.yml"

ensure_compose() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker bulunamadi. Once Docker kurun."
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "docker compose plugin bulunamadi."
    exit 1
  fi
}

compose_file_for_target() {
  case "$1" in
    dev) echo "$dev_file" ;;
    vps) echo "$vps_file" ;;
    *)
      echo "Gecersiz target: $1 (dev | vps)"
      exit 1
      ;;
  esac
}

print_help() {
  cat <<'EOF'
Kullanim:
  bash scripts/compose-up.sh <action> [target]

Action:
  up      -> docker compose up -d
  build   -> docker compose up -d --build
  down    -> docker compose down
  reset   -> docker compose down -v && up -d
  logs    -> docker compose logs -f --tail=200
  ps      -> docker compose ps
  help    -> bu ekran

Target:
  dev     -> docker-compose.dev.yml
  vps     -> docker-compose.vps.yml

Ornekler:
  bash scripts/compose-up.sh up dev
  bash scripts/compose-up.sh build vps
  COMPOSE_TARGET=vps bash scripts/compose-up.sh logs
EOF
}

case "$ACTION" in
  help|-h|--help)
    print_help
    exit 0
    ;;
esac

ensure_compose
file="$(compose_file_for_target "$TARGET")"

case "$ACTION" in
  up)
    docker compose -f "$file" up -d
    ;;
  build)
    docker compose -f "$file" up -d --build
    ;;
  down)
    docker compose -f "$file" down
    ;;
  reset)
    docker compose -f "$file" down -v
    docker compose -f "$file" up -d
    ;;
  logs)
    docker compose -f "$file" logs -f --tail=200
    ;;
  ps)
    docker compose -f "$file" ps
    ;;
  *)
    echo "Gecersiz action: $ACTION"
    print_help
    exit 1
    ;;
esac
