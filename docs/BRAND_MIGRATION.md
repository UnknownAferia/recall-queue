# Vora Brand Migration

Vora is the public and code-level name of the platform formerly developed as
RecallQ. The migration is designed to preserve every existing player, queue,
squad, rating and moderation record.

## Changed by the application

- Package and TypeScript client names
- User-facing messages, views, logs and documentation
- Main command from `/recall` to `/vora`
- Development flag from `RECALLQ_TEST_MODE` to `VORA_TEST_MODE`
- Server blueprint names, topics and internal blueprint keys
- Existing branded Discord roles, categories and channels through blueprint v2

Running `/server-setup` previews the migration before applying it. Blueprint v2
renames the existing resources instead of creating duplicates:

- `RecallQ Admin` to `Vora Admin`
- `🎮｜RECALLQ` to `🎮｜VORA`
- `📘｜how-recallq-works` to `📘｜how-vora-works`
- `🤖｜recallq` to `🤖｜vora`
- `🤖｜recallq-log` to `🤖｜vora-log`

No server resource is deleted by the migration.

## Intentionally stable storage identifiers

Do not change `MONGODB_DATABASE` merely for branding. Its current value points
to the database containing the production data. MongoDB collections and stored
field names also remain stable, including the `rsr` rating field.

RSR now means **Ranked Skill Rating**. Keeping the established acronym avoids a
risky data migration without exposing the former project name to players.

Discord component custom IDs remain stable so that recently opened interaction
messages do not break during deployment.

## Operator checklist

1. Change the Discord application name, bot username, avatar and description to
   Vora in the Discord Developer Portal.
2. Replace `RECALLQ_TEST_MODE` with `VORA_TEST_MODE` in development `.env`
   files. Production environments normally omit this flag.
3. Deploy commands. This removes `/recall` and installs `/vora`.
4. Start the bot and run `/server-setup` in every configured Discord server.
5. Review the Brand Migration section and apply blueprint v2.
6. Optionally rename the local project folder and GitHub repository after the
   application is running successfully.
