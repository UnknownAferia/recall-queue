#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this deployment as root." >&2
  exit 1
fi

VORA_REPOSITORY=/opt/vora/repository
VORA_ENVIRONMENT=/etc/vora/vora.env
VORA_BACKUPS=/var/lib/vora/backups
VORA_RELEASE_FILE=/opt/vora/current-release
VORA_COMPOSE_FILE=${VORA_REPOSITORY}/compose.production.example.yml

if [[ ! -f "${VORA_ENVIRONMENT}" ]]; then
  echo "Missing production environment: ${VORA_ENVIRONMENT}" >&2
  exit 1
fi

if grep -Eq '(^|=)(your_|username:password|cluster\.example)' "${VORA_ENVIRONMENT}"; then
  echo "The production environment still contains example values." >&2
  exit 1
fi

if [[ -n $(git -C "${VORA_REPOSITORY}" status --porcelain) ]]; then
  echo "The production checkout contains local changes. Deployment stopped." >&2
  exit 1
fi

git -C "${VORA_REPOSITORY}" fetch --prune origin main
git -C "${VORA_REPOSITORY}" checkout --detach origin/main

install -m 0644 "${VORA_REPOSITORY}/deploy/ubuntu/systemd/vora-healthcheck.service" /etc/systemd/system/vora-healthcheck.service
install -m 0644 "${VORA_REPOSITORY}/deploy/ubuntu/systemd/vora-healthcheck.timer" /etc/systemd/system/vora-healthcheck.timer
install -m 0644 "${VORA_REPOSITORY}/deploy/ubuntu/systemd/vora-backup.service" /etc/systemd/system/vora-backup.service
install -m 0644 "${VORA_REPOSITORY}/deploy/ubuntu/systemd/vora-backup.timer" /etc/systemd/system/vora-backup.timer
systemctl daemon-reload

release=$(git -C "${VORA_REPOSITORY}" rev-parse --short=12 HEAD)
previous_release=$(cat "${VORA_RELEASE_FILE}" 2>/dev/null || true)

compose() {
  env \
    VORA_ENV_FILE="${VORA_ENVIRONMENT}" \
    VORA_BACKUP_DIRECTORY="${VORA_BACKUPS}" \
    VORA_IMAGE_TAG="$1" \
    docker compose --project-name vora --file "${VORA_COMPOSE_FILE}" "${@:2}"
}

echo "Validating release ${release}..."
docker build --pull --target quality --tag "vora-quality:${release}" "${VORA_REPOSITORY}"
compose "${release}" build --pull

echo "Creating a verified pre-deployment backup..."
compose "${release}" --profile maintenance run --rm --no-deps vora-backup
compose "${release}" --profile maintenance run --rm --no-deps vora-backup-verify

echo "Publishing current Discord application commands..."
compose "${release}" run --rm --no-deps vora-core node dist/scripts/deployCommands.js
compose "${release}" run --rm --no-deps vora-community node dist/community/scripts/deployCommunityCommands.js

echo "Starting release ${release}..."
compose "${release}" up --detach --remove-orphans vora-core vora-community

healthy=true
for service in core community; do
  passed=false

  for _ in {1..18}; do
    if compose "${release}" exec -T "vora-${service}" node scripts/healthcheck.mjs "${service}"; then
      passed=true
      break
    fi

    sleep 5
  done

  if [[ ${passed} != true ]]; then
    healthy=false
    echo "${service} did not become healthy." >&2
  fi
done

if [[ ${healthy} != true ]]; then
  compose "${release}" logs --tail 100 vora-core vora-community >&2 || true

  if [[ -n ${previous_release} ]] && docker image inspect "vora:${previous_release}" >/dev/null 2>&1; then
    echo "Rolling back to ${previous_release}..." >&2
    compose "${previous_release}" up --detach --remove-orphans vora-core vora-community
  fi

  exit 1
fi

printf '%s\n' "${release}" >"${VORA_RELEASE_FILE}"
compose "${release}" --profile maintenance run --rm --no-deps vora-backup-prune

systemctl enable --now vora-healthcheck.timer vora-backup.timer

echo "Vora release ${release} is healthy and active."
