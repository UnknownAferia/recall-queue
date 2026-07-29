# Vora Website

The public launch website for Vora, a Discord-first teammate formation
platform for Mobile Legends.

The site explains the complete player journey, Vora's role-aware formation
model and its competitive-integrity principles. Its primary action leads
players to the Vora Discord server.

## Public routes

- `/` — Vora launch landing page
- `/how-it-works` — complete player and squad lifecycle
- `/rating` — RSR, placements, confidence and divisions
- `/seasons` — seasonal competition and achievements
- `/faq` — player questions
- `/support` — support and reporting routes
- `/privacy` — plain-language privacy notice
- `/terms` — platform terms of use

Additional production routes:

- `/updates` — public release milestones
- `/api/health` — machine-readable Website, Community and Core health

Private production route:

- `/control` — read-only aggregate Operations dashboard, protected by Caddy
  Basic Auth and excluded from robots and the sitemap

The Control snapshot contains operational counters only. Player names, Discord
IDs, MLBB IDs, evidence and private support content never enter the website
container.

## External monitoring

`GET /api/health` returns HTTP `200` only while the website is reachable and
recent Community data confirms that Vora Core is online. It returns HTTP `503`
when the Community publisher becomes stale or Core reports unavailable.
Planned matchmaking pauses remain healthy and are exposed separately as
`matchmaking: "paused"`.

The response intentionally excludes Discord identities, guild identifiers,
database details and internal errors. External uptime monitors should check:

- `https://voramlbb.com/` for website availability
- `https://voramlbb.com/api/health` for combined Vora service health

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run build
npm test
```

## Product boundaries

- Vora forms one compatible five-player squad.
- The squad queues together against opponents found by Mobile Legends.
- Vora does not claim access to a public Moonton match-data API.
- Registration, verification and matchmaking remain Discord-first.

## Brand assets

The public brand assets in `public/brand` originate from Vora's established
design system and should not be recolored, distorted or overlaid with effects.
