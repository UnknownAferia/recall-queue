# Vora VPS Deployment

This is the supported deployment for one Ubuntu 24.04 LTS VPS. It runs Vora
Core and Vora Community as separate, non-root containers while MongoDB Atlas
remains the source of truth.

## Architecture

- Only SSH is reachable from the internet. Neither Discord bot publishes a port.
- Core and Community use the same immutable release image but separate processes,
  tokens, healthchecks and persistent log volumes.
- Docker restarts crashed processes. A systemd timer verifies MongoDB-backed
  heartbeats every two minutes and performs one rate-limited recovery restart.
- A second timer creates, verifies and rotates a MongoDB archive every day.
- Every deployment runs typechecking, the complete test suite and the build in
  an isolated image before the running release changes.
- A failed post-deployment healthcheck restores the previous image automatically.

## 1. Prepare access

Create an SSH key on the administrator computer and add its public key while
ordering the VPS. Do not send the private key, bot tokens or MongoDB URI to
another person or paste them into Discord.

Connect to the new Ubuntu server as `root`, then install Git and retrieve Vora:

```bash
apt-get update
apt-get install --yes git
git clone https://github.com/UnknownAferia/recall-queue.git /tmp/vora-bootstrap
bash /tmp/vora-bootstrap/deploy/ubuntu/install.sh
```

The installer enables Docker, unattended security updates, Fail2ban and a UFW
firewall that permits OpenSSH while denying other incoming connections.

## 2. Configure production secrets

Open the root-owned production environment:

```bash
nano /etc/vora/vora.env
```

Replace every example value. Production must use:

```env
DISCORD_TOKEN=core_token
DISCORD_CLIENT_ID=core_application_id
DISCORD_GUILD_IDS=production_guild_id

VORA_COMMUNITY_DISCORD_TOKEN=community_token
VORA_COMMUNITY_DISCORD_CLIENT_ID=community_application_id

MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=vora
VORA_TEST_MODE=false

VORA_HEALTHCHECK_MAX_AGE_MS=90000
VORA_BACKUP_DIRECTORY=/app/backups
VORA_BACKUP_MAX_AGE_MS=86400000
VORA_BACKUP_RETENTION_DAYS=14
VORA_RESTORE_DRILL_DATABASE=vora_restore_drill
```

Keep the file restricted:

```bash
chmod 600 /etc/vora/vora.env
```

In MongoDB Atlas, allow the VPS public IP rather than `0.0.0.0/0`. Confirm the
database user has only the permissions Vora and the restore drill require.

## 3. Deploy

Run the release deployment:

```bash
bash /opt/vora/repository/deploy/ubuntu/deploy.sh
```

It validates the release, creates a pre-deployment backup, deploys both sets of
Discord commands, starts both bots and waits for fresh heartbeats. On success it
enables the health and backup timers.

## 4. Verify

```bash
docker compose \
  --project-name vora \
  --file /opt/vora/repository/compose.production.example.yml \
  ps

systemctl status vora-healthcheck.timer vora-backup.timer
systemctl list-timers 'vora-*'
```

Both long-running containers should be `Up` and eventually `healthy`. Verify in
Discord that the matchmaking status is online, `/vora` opens and Community
panels still respond.

## Updating Vora

Push and verify the desired `main` commit first, then run:

```bash
bash /opt/vora/repository/deploy/ubuntu/deploy.sh
```

Never edit application files inside `/opt/vora/repository`. The deployment
refuses a dirty checkout so that the running release always matches GitHub.

## Operational commands

View service output:

```bash
docker compose --project-name vora \
  --file /opt/vora/repository/compose.production.example.yml \
  logs --tail 100 vora-core vora-community
```

Create and verify an additional backup:

```bash
systemctl start vora-backup.service
journalctl --unit vora-backup.service --lines 100 --no-pager
```

Run health recovery manually:

```bash
systemctl start vora-healthcheck.service
journalctl --unit vora-healthcheck.service --lines 100 --no-pager
```

Stop both applications during an incident:

```bash
docker compose --project-name vora \
  --file /opt/vora/repository/compose.production.example.yml \
  stop vora-core vora-community
```

## Backup boundaries

Archives are retained in `/var/lib/vora/backups` for 14 days by default. The
newest archive is never removed by the retention script. The VPS provider's
daily machine backup adds another recovery layer, but MongoDB Atlas continuous
backups should remain enabled. Run and document a restore drill at least once
per quarter using `docs/BACKUP_RECOVERY.md`.

## SSH hardening after the first successful deployment

Keep the initial root session open while testing a second SSH session. Only
after key-based login is confirmed should password authentication and direct
root login be disabled. This prevents accidentally locking the server.
