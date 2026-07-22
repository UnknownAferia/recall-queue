#!/usr/bin/env bash
set -Eeuo pipefail

VORA_REPOSITORY=/opt/vora/repository
VORA_ENVIRONMENT=/etc/vora/vora.env
VORA_BACKUPS=/var/lib/vora/backups
VORA_COMPOSE_FILE=${VORA_REPOSITORY}/compose.production.example.yml
release=$(cat /opt/vora/current-release)

compose() {
  env \
    VORA_ENV_FILE="${VORA_ENVIRONMENT}" \
    VORA_BACKUP_DIRECTORY="${VORA_BACKUPS}" \
    VORA_IMAGE_TAG="${release}" \
    docker compose --project-name vora --file "${VORA_COMPOSE_FILE}" "$@"
}

compose --profile maintenance run --rm --no-deps vora-backup
compose --profile maintenance run --rm --no-deps vora-backup-verify
compose --profile maintenance run --rm --no-deps vora-backup-prune
