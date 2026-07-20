# RecallQ 2.0 Roadmap

Last updated: 20 July 2026

RecallQ is a Discord-first teammate formation platform for Mobile Legends. It
builds compatible five-player squads that queue together against external MLBB
opponents. Internal community 5v5 matches remain a possible future mode, but
they are not the primary matchmaking flow.

## Status legend

- ✅ Complete and covered by automated tests
- 🚧 In active development
- ⏳ Planned
- 🔭 Later exploration

## ✅ Foundation

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
- Managed RecallQ roles, categories and emoji channel structure
- Channel permission policies and permission-drift repair
- Owner-only setup controls
- Isolated owner-only squad simulator with four automated teammates
- Production-database protection for all simulation data

## ✅ Voice queue

- Require players to join the managed `queue-lobby` voice channel
- Automatically remove players who leave that channel while queued
- Reconcile stale persisted queue entries after every bot restart
- Keep simulated squad testing compatible with the same voice requirement

## ⏳ Private squad voice lifecycle

- Create a temporary private voice channel after all five players accept
- Grant access only to the squad and RecallQ staff
- Move connected squad members automatically where permitted
- Restore ownership after a bot restart
- Delete abandoned channels safely after squad closure or timeout

## ⏳ Recall Skill Rating v1

- Define the first production RSR update formula
- Expected-result calculation based on squad strength
- Rating confidence and placement matches
- Rating change audit records and idempotent processing
- Simulation tests for convergence, volatility and edge cases
- Visible divisions kept separate from internal skill rating

## ⏳ Competitive integrity

- Queue dodge, decline and AFK penalties
- Behavior-score update rules and recovery
- Disputed-result moderation queue
- Screenshot evidence workflow without depending on a Moonton API
- Staff audit log and reversible administrative actions

## ⏳ Seasons and progression

- Seasons, placement state and soft resets
- Division thresholds and seasonal leaderboards
- Personal season history
- Achievements and optional Discord reward roles

## ⏳ Community launch preparation

- Publish onboarding, rules, FAQ and matchmaking documentation
- Persistent public queue-status and leaderboard messages
- Ticket/support workflow
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
