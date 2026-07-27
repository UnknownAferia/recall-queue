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
