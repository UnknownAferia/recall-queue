# Vora Production Operations

This runbook describes the supported production setup for Vora Core and Vora
Community. Both processes use the same MongoDB database but separate Discord
applications and tokens.

## Required platform settings

- Use Node.js 24 LTS or the provided container image.
- Enable **Server Members Intent** for Vora Core.
- Enable **Server Members** and **Message Content** intents for Vora Community.
  They power hierarchy-safe staff actions, report evidence, conservative spam
  protection and private ticket transcripts.
- Give both bots only the permissions produced by `/server-setup`. During the
  During initial operations, Administrator permission remains acceptable for the managed
  server-setup workflow.
- Use a MongoDB deployment with replica-set transactions and automated backups.
- Never commit `.env`, logs, backup archives or Discord tokens.

## Community moderation boundaries

Vora Community owns server conduct: reports, warnings, timeouts, kicks, bans,
message cleanup and managed-channel controls. Vora Core continues to own match
result disputes, evidence decisions, rating corrections and competitive
integrity sanctions. Community cases never alter RSR or squad results.

Kick and ban requests remain pending until the requesting moderator confirms
them in `moderation-log`. Members can appeal by opening a support ticket and
including the displayed `VORA-######` reference. Moderation and report records
are retained for 365 days, then removed by MongoDB TTL cleanup.

## Deployment

The supported Ubuntu VPS installation, first deployment, automated backup
timers and update procedure are documented in `docs/VPS_DEPLOYMENT.md`.

Verify every release before it reaches the server:

```bash
npm ci
npm run check
```

The production Compose file runs both applications from the same immutable
image. For local inspection only:

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

## Vora Control

The private Operations dashboard is available at
`https://voramlbb.com/control`. It uses two independent access checks:

1. Caddy Basic Auth blocks requests before they reach the website.
2. Discord OAuth identifies the individual operator and verifies that they are
   the production guild owner, an administrator or a member of an explicitly
   allowed staff role.

Configure a dedicated Basic Auth username and a Caddy-compatible bcrypt hash in
`/etc/vora/vora.env`:

```dotenv
VORA_CONTROL_USERNAME=operations
VORA_CONTROL_PASSWORD_HASH='$2a$14$replace_with_a_real_hash'
```

Create the hash interactively so the plaintext password is not stored in shell
history:

```bash
sudo docker run --rm -it caddy:2.11.4-alpine caddy hash-password
```

Keep the single quotes around the hash in the environment file. Never reuse a
Discord, VPS or database password.

In the Discord Developer Portal, open the **Vora Community** application and
add this exact OAuth2 redirect:

```text
https://voramlbb.com/control/auth/callback
```

Copy the Community application client secret directly to the VPS environment;
never commit or paste it into chat. Generate a separate signing secret and add
the production guild and authorized staff role IDs:

```bash
openssl rand -hex 32
```

```dotenv
VORA_CONTROL_DISCORD_CLIENT_SECRET=replace_with_the_community_client_secret
VORA_CONTROL_DISCORD_GUILD_ID=replace_with_the_production_guild_id
VORA_CONTROL_ALLOWED_ROLE_IDS=replace_with_core_role_id,replace_with_operations_role_id
VORA_CONTROL_DISCORD_REDIRECT_URI=https://voramlbb.com/control/auth/callback
VORA_CONTROL_SESSION_SECRET=replace_with_the_generated_64_character_value
VORA_CONTROL_API_SECRET=replace_with_a_second_independent_64_character_value
```

`VORA_CONTROL_ALLOWED_ROLE_IDS` may be empty because the guild owner and
administrators are always accepted. Explicit Core and Operations IDs are
recommended so staff access does not require the Discord Administrator
permission. The signed session lasts eight hours. OAuth access tokens are used
only during the callback and are never persisted in Vora's cookie or database.

Generate `VORA_CONTROL_API_SECRET` separately from the session secret. It signs
every private request between the Website and Community containers and is
never sent to a browser. Requests expire after 30 seconds and are bound to the
operator, production guild and exact request body. The internal API port is
available only on the Compose network and is not published by the VPS.

Vora Community publishes aggregate registration, verification, queue,
moderation, ticket, conversion and service-health counters. After Discord
authentication, authorized Operations members can also:

- pause or reopen registration and matchmaking;
- schedule or cancel community queue sessions;
- approve or reject pending account verifications;
- dismiss reviewed Community reports.

Each mutation requires browser confirmation, rechecks the operator's live
Discord membership and permission, and writes an immutable `control_action`
audit event. Evidence and identifiers remain behind both Caddy Basic Auth and
Discord OAuth.

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
