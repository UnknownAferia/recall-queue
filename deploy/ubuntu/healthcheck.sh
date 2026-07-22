#!/usr/bin/env bash
set -Eeuo pipefail

VORA_REPOSITORY=/opt/vora/repository
VORA_ENVIRONMENT=/etc/vora/vora.env
VORA_BACKUPS=/var/lib/vora/backups
VORA_HEALTH_STATE=/var/lib/vora/health
VORA_COMPOSE_FILE=${VORA_REPOSITORY}/compose.production.example.yml
release=$(cat /opt/vora/current-release)

compose() {
  env \
    VORA_ENV_FILE="${VORA_ENVIRONMENT}" \
    VORA_BACKUP_DIRECTORY="${VORA_BACKUPS}" \
    VORA_IMAGE_TAG="${release}" \
    docker compose --project-name vora --file "${VORA_COMPOSE_FILE}" "$@"
}

failed=0
now=$(date +%s)

for service in core community; do
  state_file=${VORA_HEALTH_STATE}/${service}-last-restart

  if compose exec -T "vora-${service}" node scripts/healthcheck.mjs "${service}"; then
    continue
  fi

  last_restart=$(cat "${state_file}" 2>/dev/null || echo 0)

  if (( now - last_restart >= 900 )); then
    echo "Restarting unhealthy Vora ${service} service once."
    compose restart "vora-${service}"
    printf '%s\n' "${now}" >"${state_file}"
    sleep 30

    if compose exec -T "vora-${service}" node scripts/healthcheck.mjs "${service}"; then
      continue
    fi
  fi

  echo "Vora ${service} remains unhealthy; automatic restart cooldown is active." >&2
  failed=1
done

exit "${failed}"
