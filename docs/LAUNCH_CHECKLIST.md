# Community Launch Checklist

Complete every item on the live Discord server before opening Vora to a wider
community.

## Secrets and access

- [ ] Core and Community tokens were freshly generated and exist only in `.env`
      or the deployment secret store.
- [ ] MongoDB uses a dedicated least-privilege application user.
- [ ] Atlas network access is restricted to the production host where practical.
- [ ] Server Members Intent is enabled for Core.
- [ ] Server Members and Message Content intents are enabled for Community.
- [ ] Staff role hierarchy allows managed verification, division and season roles.

## Discord

- [ ] `/server-setup` reports no missing or modified resources.
- [ ] `/publish-community` has populated every managed information channel.
- [ ] Core and Community bots are present in every configured guild.
- [ ] A real support ticket can be opened, answered, closed and archived.
- [ ] `vora-log`, `moderation-log` and staff channels are invisible to members.
- [ ] The staff-only `reports` channel exists after `/server-setup`.
- [ ] A test message report reaches `reports` and can be dismissed.
- [ ] Warning, timeout, timeout reversal and kick/ban confirmation were tested
      against a non-staff test account.
- [ ] AutoMod deletes a controlled spam test without affecting staff messages.

## Application

- [ ] `npm ci` completes from the lockfile.
- [ ] `npm run check` passes.
- [ ] Both services start without warnings or failed database indexes.
- [ ] `npm run healthcheck` passes.
- [ ] The public matchmaking-status panel reports Core operational.
- [ ] A five-player smoke test completes without modifying production through the
      development simulator; the simulator remains disabled on live.

## Data protection

- [ ] Atlas continuous backups are enabled.
- [ ] A fresh manual archive has been stored encrypted outside the server.
- [ ] A restore rehearsal has succeeded against an isolated database.
- [ ] Ticket and evidence retention has been disclosed in the server rules or
      privacy notice.
- [ ] Community report and moderation-case retention has been disclosed.
- [ ] A named owner is responsible for incident response and data requests.

## Release decision

- [ ] Monitoring has remained stable through a multi-week beta.
- [ ] No unresolved critical integrity or permission issue remains.
- [ ] Rollback steps and the last known-good backup are documented.
- [ ] The server owner has approved launch.
