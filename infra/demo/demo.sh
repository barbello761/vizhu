#!/usr/bin/env bash
# Демо-стенд demo.vizhu.su. Запускать на сервере, из любой папки:
#
#   ./demo.sh up        собрать и поднять (первый запуск сам создаст .env)
#   ./demo.sh stop      остановить, данные сохраняются
#   ./demo.sh ps        статус контейнеров
#   ./demo.sh logs      логи (можно имя сервиса: ./demo.sh logs demo-api)
#   ./demo.sh destroy   снести ВСЁ: контейнеры, БД, redis, образы, .env
#
# Прод (infra/docker-compose.yml) скрипт не трогает, кроме `nginx -s reload`.

set -euo pipefail

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
PROD_ENV="$DEMO_DIR/../.env"
DEMO_ENV="$DEMO_DIR/.env"
PROD_NGINX=vizhu_nginx
SHARED_NETWORK=shared-web

# Какие переменные берём у прода как есть: ключи внешних сервисов.
SHARED_KEYS=(
  SMSC_API_KEY GIGACHAT_CREDENTIALS YANDEX_FOLDER_ID YANDEX_API_KEY
  LIVEKIT_API_KEY LIVEKIT_API_SECRET POSTBOX_API_KEY POSTBOX_API_SECRET POSTBOX_FROM
)

compose() {
  docker compose --project-directory "$DEMO_DIR" --env-file "$DEMO_ENV" \
    -f "$DEMO_DIR/docker-compose.yml" "$@"
}

log() { printf '\n▶ %s\n' "$*"; }
die() { printf '\n✖ %s\n' "$*" >&2; exit 1; }

init_env() {
  [ -f "$DEMO_ENV" ] && return
  [ -f "$PROD_ENV" ] || die "Нет $PROD_ENV — неоткуда взять ключи. Заполни $DEMO_ENV по .env.example."

  log "Создаю $DEMO_ENV: ключи сервисов — из прода, пароль БД и JWT — новые"
  (
    umask 077
    {
      echo "# Сгенерировано ./demo.sh $(date '+%F %T'). Удаляется вместе со стендом."
      echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
      echo "JWT_SECRET=$(openssl rand -hex 32)"
      echo "DEMO_OTP_CODE=8153"
      for key in "${SHARED_KEYS[@]}"; do
        grep -E "^${key}=" "$PROD_ENV" | tail -n1 || echo "${key}="
      done
    } >"$DEMO_ENV"
  )
}

reload_nginx() {
  if ! docker ps --format '{{.Names}}' | grep -qx "$PROD_NGINX"; then
    echo "  $PROD_NGINX не запущен — пропускаю reload"
    return
  fi
  log "Проверяю и перечитываю конфиг прод-nginx"
  # -t сначала: битый конфиг не должен уронить прод при reload.
  docker exec "$PROD_NGINX" nginx -t && docker exec "$PROD_NGINX" nginx -s reload
}

cmd_up() {
  docker network inspect "$SHARED_NETWORK" >/dev/null 2>&1 \
    || die "Нет сети $SHARED_NETWORK — сначала должен быть поднят прод (infra/docker-compose.yml)."
  init_env

  log "Собираю и поднимаю стенд (первый раз — несколько минут)"
  compose up -d --build --remove-orphans --wait
  reload_nginx
  compose ps
  printf '\n✅ https://demo.vizhu.su\n'
}

cmd_destroy() {
  cat <<'WARN'

Будут удалены БЕЗВОЗВРАТНО:
  - контейнеры vizhu_demo_*
  - сеть vizhu_demo_net
  - тома vizhu_demo_postgres_data и vizhu_demo_redis_data (все данные демо)
  - собранные образы демо
  - infra/demo/.env
Прод не затрагивается.
WARN
  read -r -p "Для подтверждения введи demo: " answer
  [ "$answer" = "demo" ] || die "Отменено."

  log "Сношу стенд"
  if [ -f "$DEMO_ENV" ]; then
    compose down --volumes --rmi local --remove-orphans
  else
    # .env уже нет — подставляем заглушки, чтобы compose прочитал файл.
    POSTGRES_PASSWORD=x JWT_SECRET=x DEMO_OTP_CODE=0000 \
      docker compose --project-directory "$DEMO_DIR" -f "$DEMO_DIR/docker-compose.yml" \
      down --volumes --rmi local --remove-orphans
  fi
  rm -f "$DEMO_ENV"

  cat <<'NEXT'

✅ Стенд снесён. demo.vizhu.su теперь отвечает заглушкой «демонстрация недоступна».

Чтобы убрать и следы в репозитории — один коммит в main:
  git rm -r infra/demo infra/nginx/conf.d/demo.vizhu.su.conf
После деплоя: docker exec vizhu_nginx nginx -s reload
Демо-код во фронте и api спит под флагами и прод не трогает — список в infra/demo/README.md.
NEXT
}

case "${1:-}" in
  up)      cmd_up ;;
  stop)    compose stop ;;
  ps)      compose ps ;;
  logs)    shift; compose logs -f --tail=200 "$@" ;;
  destroy) cmd_destroy ;;
  *)       sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
