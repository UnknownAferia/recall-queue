# Vora Private Alpha Launch Checklist

Complete this checklist for the live database and every configured Discord server.

## Automated gate

- Run `npm run check` and require a clean result.
- Deploy Core and Community slash commands.
- Start both bots and confirm current heartbeats.
- Run `/system-admin launch-audit` as the server owner.
- Do not launch while the audit reports a failure.

## Data protection

- Run `npm run backup`.
- Run `npm run backup:verify`.
- Run `npm run restore:drill -- <archive.gz>` against the configured drill database.
- Store a second encrypted backup outside the VPS.
- Confirm MongoDB Atlas access uses a dedicated application user and an IP allowlist.

## Discord and permissions

- Run `/server-setup` and apply every required repair.
- Confirm Core and Community bot roles are above every role they manage.
- Confirm `vora-log`, `moderation-log`, verification evidence and ticket channels are staff-only.
- Test registration, verification approval, role preferences, queue join and queue leave.
- Test one complete squad lifecycle including private voice and a verified result.
- Test a missed ready check and confirm the queue cooldown.
- Test a disputed result and staff resolution.
- Test ticket creation and closure.

## Operational controls

- Run `/system-admin maintenance scope:all access:maintenance` and confirm registration and queue entry are blocked.
- Restore access and verify the Community matchmaking-status panel refreshes.
- Run `/system-admin reconcile` and review any warnings in `vora-log`.
- Confirm the Community bot can publish the launch announcement and managed information panels.

## Launch decision

- No failed automated checks.
- No stale verification requests or unresolved critical alerts.
- A recent verified backup and successful restore drill exist.
- Staff coverage and an incident owner are available for the launch window.
- Keep `/system-admin maintenance` ready as the immediate rollback control.
