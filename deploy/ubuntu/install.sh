#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this installer as root." >&2
  exit 1
fi

VORA_REPOSITORY_URL=${VORA_REPOSITORY_URL:-https://github.com/UnknownAferia/recall-queue.git}
VORA_ROOT=/opt/vora
VORA_REPOSITORY=${VORA_ROOT}/repository
VORA_ENVIRONMENT=/etc/vora/vora.env

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install --yes ca-certificates docker.io docker-compose-v2 fail2ban git ufw unattended-upgrades

systemctl enable --now docker
systemctl enable --now fail2ban

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable

install -d -m 0755 "${VORA_ROOT}"
install -d -m 0700 /etc/vora
install -d -o 1000 -g 1000 -m 0750 /var/lib/vora/backups
install -d -m 0750 /var/lib/vora/health

if [[ -d "${VORA_REPOSITORY}/.git" ]]; then
  git -C "${VORA_REPOSITORY}" fetch --prune origin main
else
  git clone --branch main --single-branch "${VORA_REPOSITORY_URL}" "${VORA_REPOSITORY}"
fi

if [[ ! -f "${VORA_ENVIRONMENT}" ]]; then
  install -m 0600 "${VORA_REPOSITORY}/.env.example" "${VORA_ENVIRONMENT}"
fi

install -m 0644 "${VORA_REPOSITORY}/deploy/ubuntu/systemd/vora-healthcheck.service" /etc/systemd/system/vora-healthcheck.service
install -m 0644 "${VORA_REPOSITORY}/deploy/ubuntu/systemd/vora-healthcheck.timer" /etc/systemd/system/vora-healthcheck.timer
install -m 0644 "${VORA_REPOSITORY}/deploy/ubuntu/systemd/vora-backup.service" /etc/systemd/system/vora-backup.service
install -m 0644 "${VORA_REPOSITORY}/deploy/ubuntu/systemd/vora-backup.timer" /etc/systemd/system/vora-backup.timer
systemctl daemon-reload

echo
echo "Vora host preparation completed."
echo "1. Configure ${VORA_ENVIRONMENT}."
echo "2. Restrict MongoDB Atlas network access to this VPS IP."
echo "3. Run ${VORA_REPOSITORY}/deploy/ubuntu/deploy.sh as root."
