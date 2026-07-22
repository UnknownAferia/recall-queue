# Backup and Recovery

MongoDB is Vora's source of truth. Discord channels and panels can be recreated,
but player ratings, squad results, seasons and audit records cannot.

## Backup policy

- Enable MongoDB Atlas continuous cloud backups for the production cluster.
- Keep daily snapshots for at least 30 days and monthly snapshots for one year.
- Create an additional encrypted off-provider archive before every deployment
  that changes schemas, indexes, rating rules or season state.
- Test a restore into an isolated database at least once per quarter.
- Never store an unencrypted archive in the Git repository or a public bucket.

The local helper requires MongoDB Database Tools:

```bash
npm run backup
```

It writes a compressed archive to `backups/` or `VORA_BACKUP_DIRECTORY`. That
directory is ignored by Git. Move the archive to encrypted storage after the
command completes.

## Restore rehearsal

Always restore into a new database first:

1. Stop Vora Core and Vora Community.
2. Point `MONGODB_DATABASE` at a new isolated database name.
3. Set the one-time confirmation to that exact name.
4. Restore the selected archive.
5. Start Core, allow index synchronization, and run automated smoke checks.
6. Inspect player totals, recent squads, active season and audit-event counts.

PowerShell example:

```powershell
$env:MONGODB_DATABASE="vora_restore_test"
$env:VORA_RESTORE_CONFIRM="vora_restore_test"
npm run restore -- "C:\secure-backups\vora-production.archive.gz"
```

The restore helper uses `mongorestore --drop`. The confirmation variable prevents
an accidental invocation but does not make the operation reversible.

## Production recovery

Promote a restored database to production only after validation:

- both services are stopped;
- the chosen recovery point and expected data loss are documented;
- the restored database passes index synchronization;
- duplicate active seasons, open queues and active squads have been reviewed;
- the server owner approves reopening matchmaking.

After recovery, rotate database credentials if compromise was involved, start
Core first, then Community, run `npm run healthcheck`, and publish an incident
notice appropriate to the impact.
