# Vora 2.0 Roadmap

Last updated: 20 July 2026

Vora is a Discord-first teammate formation platform for Mobile Legends. It
builds compatible five-player squads that queue together against external MLBB
opponents. Internal community 5v5 matches remain a possible future mode, but
they are not the primary matchmaking flow.

## Status legend

- ✅ Complete and covered by automated tests
- 🚧 In active development
- ⏳ Planned
- 🔭 Later exploration

## ✅ Foundation

- Vora brand migration with data-safe Discord resource renaming
- TypeScript, discord.js and MongoDB application foundation
- Structured command, button, modal and select-menu loaders
- Central service container and repository boundaries
- Environment validation, logging and graceful shutdown
- Multi-guild command deployment
- Automated database index synchronization and configuration migration

## ✅ Player experience

- Discord-based player registration with MLBB ID, server ID and IGN
- Persistent player profiles and DTO mapping
- Primary, secondary and avoided role preferences
- Profile, preferences and main-menu component views
- Verified Player role synchronization
- Registration and role-preference validation

## ✅ Matchmaking and squad lifecycle

- Persistent queue per Discord server
- Five-player squad formation for external MLBB matchmaking
- Deterministic role allocation across EXP, Gold, Mid, Jungle and Roam
- RSR, behavior and role-fit compatibility scoring
- Ready checks with expiration handling
- Captain selection and active squad lifecycle
- Win/loss reporting with multi-player verification
- Transactional match-statistics processing
- Verified match history and provisional leaderboard

## ✅ Community server operations

- Idempotent `/server-setup` blueprint
- Managed Vora roles, categories and emoji channel structure
- Channel permission policies and permission-drift repair
- Owner-only setup controls
- Isolated owner-only squad simulator with four automated teammates
- Production-database protection for all simulation data

## ✅ Voice queue

- Require players to join the managed `queue-lobby` voice channel
- Automatically remove players who leave that channel while queued
- Reconcile stale persisted queue entries after every bot restart
- Keep simulated squad testing compatible with the same voice requirement

## ✅ Private squad voice lifecycle

- Create a temporary private voice channel after all five players accept
- Grant access only to the squad and Vora staff
- Move connected squad members automatically where permitted
- Restore ownership after a bot restart
- Delete abandoned channels safely after squad closure or timeout

## ✅ Ranked Skill Rating v1

- Production RSR update formula anchored to the external matchmaking pool
- Expected-result calculation based on squad strength
- Rating confidence and ten placement matches
- Transactional rating change audit records and idempotent processing
- Automated coverage for volatility, rating floors and concurrency safety
- Visible divisions remain separate from internal skill rating

## ✅ Community automation bot

- Independent Vora Community Discord application and runtime
- Shared MongoDB source of truth instead of bot-to-bot data requests
- Core and Community service heartbeats
- Persistent global leaderboard with automatic refresh
- Live per-guild matchmaking status with queue and squad activity
- Automated help and private ticket-launcher panels
- One open private support ticket per member and server
- Requester/staff ticket closure with retained read-only channels

## 🚧 Competitive integrity

- Ready-check decline and timeout penalties with queue cooldowns
- Atomic behavior-score deductions with a zero-point floor
- Ready-check acceptance and reliability statistics
- Escalating repeat-offense cooldowns with daily discipline decay
- Behavior-score recovery through verified completed matches
- Staff-only disputed-result moderation inbox
- Audited moderation decisions for disputed results (confirm, correct or void)
- Required screenshot evidence archived in a staff-only channel without a Moonton API
- Staff-selected evidence sanctions targeting only the result reporter
- Escalating integrity levels, behavior deductions and matchmaking suspensions
- Transactional sanction audit records with incident-free monthly decay
- Persistent cross-feature staff audit trail with a staff history view
- Audited rating reversals and administrative corrections

## ⏳ Seasons and progression

- Seasons, placement state and soft resets
- Division thresholds and seasonal leaderboards
- Personal season history
- Achievements and optional Discord reward roles

## ⏳ Community launch preparation

- Publish onboarding, rules, FAQ and matchmaking documentation
- Ticket transcript/export and retention policy
- Rate limiting, abuse protection and structured audit logging
- CI checks, deployment environment and production monitoring
- Backup and recovery procedure

## 🔭 Later exploration

- Premade duo/trio support with party balancing
- Internal community 5v5 mode
- Tournament and scrim tooling
- Language and playstyle preferences after sufficient player volume
- Web-based read-only profiles if Discord presentation becomes limiting

## Release gates

### Private alpha

Voice lifecycle, stable squad formation, verified results and safe staff tools.

### Community beta

RSR v1, placements, penalties, moderation workflows and production monitoring.

### Version 2.0 launch

Season progression, polished onboarding, operational documentation and a
successful multi-week beta without critical data-integrity incidents.
