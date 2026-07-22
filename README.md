# Vora

<p align="center">
  <img src="./assets/Vora_Banner.png" alt="Vora — Built for Better Teams" width="100%" />
</p>

[![Status](https://img.shields.io/badge/status-private%20alpha-5865F2)](#project-status)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)

**Discord-first teammate formation for competitive Mobile Legends players.**

Vora forms compatible five-player squads that enter the real Mobile Legends
queue together. It combines role preferences, Ranked Skill Rating (RSR),
behavior history, ready-check reliability and private voice channels to help
players find better teammates without requiring a separate website or app.

> Vora was previously developed under the RecallQ codename. The GitHub
> repository name remains `recall-queue`, while the product and application are
> now named Vora.

## What Vora does

Vora is not an internal community 5v5 matchmaker. Its primary flow is:

```mermaid
flowchart LR
    A[Register profile] --> B[Choose role preferences]
    B --> C[Join queue lobby]
    C --> D[Form a compatible squad]
    D --> E[Complete ready check]
    E --> F[Enter private squad voice]
    F --> G[Queue together in MLBB]
    G --> H[Submit result evidence]
    H --> I[Verify result and update RSR]
```

Because Mobile Legends does not provide the project with a public match-data
API, Vora uses archived result screenshots, squad confirmation and staff
moderation instead of pretending that KDA or match results can be retrieved
automatically.

## Current features

### Player experience

- Discord-based registration with MLBB player ID, server ID and in-game name
- Primary, secondary and avoided role preferences
- Player profiles, verified match history and provisional leaderboards
- Behavior score, queue reliability and integrity standing
- Interactive Discord component views instead of a command-heavy interface

### Matchmaking and squad lifecycle

- Persistent five-player teammate queues per Discord server
- Deterministic role allocation for EXP, Gold, Mid, Jungle and Roam
- Compatibility scoring using RSR, role fit and behavior
- Ready checks with automatic expiration and escalating cooldowns
- Captain selection and complete squad lifecycle management
- Temporary private voice channels for accepted squads
- Automatic cleanup after completion, cancellation or timeout

### Results, rating and integrity

- Screenshot evidence archived in a staff-only Discord channel
- Multi-player result confirmation and dispute creation
- Transactional statistics and RSR processing
- Rating confidence and ten placement matches
- Staff dispute inbox with confirm, correct and void decisions
- Escalating sanctions for misleading evidence and deliberate result fraud
- Immutable MongoDB moderation audit trail with player filtering

### Server operations

- Idempotent `/server-setup` blueprint for roles, categories and channels
- Managed permission policies and permission-drift repair
- Multi-guild command deployment
- Owner-only isolated squad simulator with four automated teammates
- Production-database safeguards for all simulated data

### Community automation

- Separate Vora Community bot process with an independent Discord identity
- Persistent global leaderboard and live matchmaking-status panels
- Core-service heartbeat instead of inferred availability
- Automated help panel and private support-ticket creation
- One open ticket per member and server
- Requester/staff closure permissions and read-only closed-ticket retention

See the [project roadmap](docs/ROADMAP.md) for completed work, active
development and planned releases.

## Project status

Vora is in **private alpha**. The player, queue, squad, voice, result, rating,
moderation, season and operational workflows are implemented and covered by
automated tests. The remaining release gate is a successful multi-week beta
without critical data-integrity incidents.

The data model and commands may change before the first stable release.

Production procedures are documented in
[Operations](docs/OPERATIONS.md),
[Backup and Recovery](docs/BACKUP_RECOVERY.md) and the
[Launch Checklist](docs/LAUNCH_CHECKLIST.md).

## Technology

- Node.js and TypeScript with strict type checking
- discord.js v14
- MongoDB and Mongoose
- Winston structured logging
- Node.js test runner with TSX

## Architecture

Discord is Vora's interface, while matchmaking and business rules remain
separate from interaction handlers. Vora Core and Vora Community run as
independent Discord clients but share MongoDB as their source of truth.

```text
Vora Core                    Vora Community
Matchmaking interactions    Public panels and tickets
             \              /
              Shared MongoDB
                    │
                    ▼
             Application services
                    │
                    ▼
      Matchmaking, rating and integrity domain logic
```

```text
src/
├── commands/       Slash-command entry points
├── buttons/        Button interaction modules
├── modals/         Modal submission modules
├── selectMenus/    Select-menu interaction modules
├── ui/             Discord component views
├── services/       Application workflows
├── domain/         Matchmaking, rating and policy logic
├── repositories/   Persistence boundaries
├── models/         Mongoose schemas
├── dto/            Data transfer objects
├── mappers/        Database-to-DTO mapping
├── handlers/       Module loaders and interaction routing
├── database/       Connection, transactions and indexes
└── config/         Validated environment and bot configuration
```

Commands and Discord components contain no matchmaking or rating logic. This
keeps the important rules independently testable and prevents Discord concerns
from spreading into the core.

## Getting started

### Prerequisites

- A current Node.js LTS release
- Two Discord applications: Vora Core and Vora Community
- A MongoDB deployment with transaction support, such as MongoDB Atlas
- A Discord test server where the bot has Administrator permission

Enable the **Server Members Intent** for Vora Core and the **Message Content
Intent** for Vora Community in the Discord Developer Portal. Message Content is
required solely to export complete support-ticket transcripts. Add both bots to
every server configured in `DISCORD_GUILD_IDS`.

### Installation

```bash
git clone https://github.com/UnknownAferia/recall-queue.git
cd recall-queue
npm install
```

Create a `.env` file in the repository root:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_GUILD_IDS=first_guild_id,second_guild_id

VORA_COMMUNITY_DISCORD_TOKEN=your_community_bot_token
VORA_COMMUNITY_DISCORD_CLIENT_ID=your_community_application_id

MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/
MONGODB_DATABASE=vora

VORA_TEST_MODE=false
```

`DISCORD_GUILD_IDS` accepts a comma-separated list. If it is omitted, the
deployment script registers commands globally instead. Existing installations
migrated from RecallQ may safely retain their original MongoDB database name.

Never commit `.env`, bot tokens or database credentials. If a secret is exposed
in a screenshot, terminal log or commit, rotate it immediately.

### Validate and start

```bash
npm run typecheck
npm test
npm run build
npm run deploy
npm run dev
```

Start Vora Community in a second terminal:

```bash
npm run dev:community
```

The Community bot does not register slash commands. Its persistent buttons and
modals are published automatically in the managed `help` and `open-a-ticket`
channels.

For a production-style start after building:

```bash
npm start
```

### Configure a Discord server

1. Run `/server-setup` as the Discord server owner.
2. Review the proposed Vora server blueprint.
3. Apply the setup to create or repair managed roles, categories, channels and
   permission overwrites.
4. Run `/register`, configure role preferences and open `/vora`.
5. Join the managed `queue-lobby` voice channel before entering matchmaking.

The setup is idempotent: running it again repairs managed resources without
deleting unrelated community content.

## Isolated squad testing

Vora can simulate four teammates so one developer can test the complete squad
flow without involving other users.

Use a dedicated database whose name ends in `_development`, `_test` or
`_sandbox`, then enable test mode:

```env
MONGODB_DATABASE=vora_development
VORA_TEST_MODE=true
```

Redeploy commands and restart the bot:

```bash
npm run deploy
npm run dev
```

The Discord server owner can then join the queue lobby and use:

```text
/test-squad start
/test-squad reset
```

The simulator refuses to run against a database that does not use one of the
approved development suffixes. Keep `VORA_TEST_MODE=false` in production.

## Staff commands

| Command            | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `/disputes`        | Review unresolved result disputes                         |
| `/resolve-dispute` | Confirm, correct or void a disputed result                |
| `/audit-log`       | Review immutable moderation history, optionally by player |
| `/server-setup`    | Preview and apply the managed Discord blueprint           |

Staff commands require the appropriate Discord permissions. Server setup and
development simulation additionally require the Discord server owner.

## Development workflow

Before committing a change, run:

```bash
npm run typecheck
npm test
npm run build
```

Useful scripts:

| Script                    | Description                                  |
| ------------------------- | -------------------------------------------- |
| `npm run dev`             | Start Vora with automatic TypeScript reloads |
| `npm run dev:community`   | Start the public-panel and support bot       |
| `npm run deploy`          | Register enabled slash commands              |
| `npm run typecheck`       | Validate TypeScript without emitting files   |
| `npm test`                | Run the complete automated test suite        |
| `npm run build`           | Compile production JavaScript into `dist/`   |
| `npm start`               | Run the compiled application                 |
| `npm run start:community` | Run the compiled Community bot               |
| `npm run format`          | Format TypeScript source files               |

## Data and security principles

- Player and moderation changes that belong together use MongoDB transactions.
- Result processing is idempotent to prevent duplicate rating updates.
- Staff decisions preserve moderator, player, evidence, sanction and timestamp
  snapshots.
- Simulation identities and data are isolated from production operation.
- Discord UI layers receive DTOs instead of mutable Mongoose documents.
- Secrets belong only in local environment files or deployment secret stores.

## Naming and migration

The product was renamed from RecallQ to Vora. Stable database identifiers and
Discord component IDs may intentionally retain legacy-compatible values where
changing them would break existing data or active interactions. The managed
server blueprint migrates legacy RecallQ resources instead of creating
duplicates.

## License

The package is licensed under the MIT License.

## Disclaimer

Vora is an independent community project. It is not affiliated with, endorsed
by or sponsored by Moonton. Mobile Legends: Bang Bang and related marks belong
to their respective owners.
