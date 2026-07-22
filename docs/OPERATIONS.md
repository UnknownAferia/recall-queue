# Vora Production Operations

This runbook describes the supported production setup for Vora Core and Vora
Community. Both processes use the same MongoDB database but separate Discord
applications and tokens.

## Required platform settings

- Use Node.js 24 LTS or the provided container image.
- Enable **Server Members Intent** for Vora Core.
- Enable **Message Content Intent** for Vora Community so private ticket
  transcripts contain the actual conversation.
- Give both bots only the permissions produced by `/server-setup`. During the
  private alpha, Administrator permission remains acceptable for the managed
  server-setup workflow.
- Use a MongoDB deployment with replica-set transactions and automated backups.
- Never commit `.env`, logs, backup archives or Discord tokens.

## Deployment

Verify every release before it reaches the server:

```bash
npm ci
npm run check
```

The example Compose file runs both applications from the same immutable image:

```bash
docker compose -f compose.production.example.yml up -d --build
docker compose -f compose.production.example.yml ps
```

Each service has `restart: unless-stopped` and a MongoDB-backed heartbeat
healthcheck. A failed healthcheck means the process has stopped updating its
heartbeat or cannot reach MongoDB.

Core and Community use separate persistent Docker log volumes. Read live output
with `docker compose logs`; copy a structured log file out of the appropriate
container when it is required for an incident investigation.

## Monitoring

Run a one-off health check from the project directory:

```bash
npm run healthcheck
node scripts/healthcheck.mjs core
node scripts/healthcheck.mjs community
```

The default maximum heartbeat age is 90 seconds. Override it with
`VORA_HEALTHCHECK_MAX_AGE_MS` only when the monitoring interval requires it.

Monitor these signals:

- container or process restart count;
- Core and Community heartbeat age;
- `logs/error.jsonl` for structured errors;
- MongoDB connection failures and transaction errors;
- Discord API rate-limit or permission errors;
- growth of `operational_audit_events`, `support_tickets` and evidence storage.

Never send `.env`, connection strings, bot tokens or raw private ticket
transcripts to a public monitoring service.

## Ticket retention

Support tickets follow this fixed policy:

1. Closing immediately makes the requester view read-only.
2. The complete conversation and attachment URLs are exported to the managed
   staff-only `vora-log` channel.
3. If export fails, the channel remains intact and the Community process retries
   during the next retention sweep.
4. Successfully archived ticket channels are deleted after seven days.
5. Transcript messages and their MongoDB ticket records are deleted after 365
   days.

Operational audit events contain identifiers and action metadata, not the
private conversation body. They remain available for security investigations.

## Incident response

When either service is unhealthy:

1. Stop queue entry if Core is unavailable; the public status panel does this
   automatically once the heartbeat becomes stale.
2. Preserve logs and note the UTC incident start time.
3. Check Discord permissions and MongoDB availability before restarting.
4. Restart only the affected service.
5. Run `npm run healthcheck` and inspect the matchmaking-status panel.
6. If data integrity may be affected, stop both services and follow the recovery
   procedure before reopening matchmaking.

Rotate a Discord token immediately if it appears in a screenshot, terminal log,
commit, ticket or chat. Updating `.env` is not enough; revoke the exposed token
in the Discord Developer Portal.
