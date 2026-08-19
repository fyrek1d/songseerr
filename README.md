# SongSeerr

Unified music request management for self-hosted homeservers.

SongSeerr is a self-hosted music request manager inspired by Jellyseerr and Overseerr. Search for music, request albums and artists, manage approvals, and send approved requests to Lidarr. Works with Jellyfin and Navidrome. Runs on Next.js 14 with SQLite, providing discovery, search, request management, and library integration for music.

## Features

- **Unified search**: MusicBrainz for music
- **Request queue**: pending → approved → available or declined, with auto-approval for trusted users
- **Library integration**: Jellyfin, Navidrome - can detect and mark existing items
- **Lidarr integration**: Requests go through Lidarr into your library of choice
- **Collections**: Create curated public or private collections of music
- **Issue reporting**: Report broken/misattributed library items to admin triage
- **Admin panel**: User roles, request rules, webhook notifications, metadata provider config
- **Auth**: Built-in credentials (NextAuth JWT), roles: Admin / Trusted / Standard

## Tech Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/UI (Base UI) · SQLite + Prisma ORM · NextAuth v4

## Quick Start

```bash
cp .env.example .env
npm install
npx prisma db push
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
docker compose up -d
```

On first run, a default admin user is seeded (configurable via env vars). Passwords should be changed immediately from the UI.

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `NEXTAUTH_SECRET` | (auto) | JWT signing secret |
| `NEXTAUTH_URL` | `http://localhost:3000` | Public base URL |
| `CRON_SECRET` | `cron-secret` | Protects the `/api/cron/*` endpoints |
| `WEBHOOK_SECRET` | `webhook-secret` | Protects incoming webhook notifications |
| `SEED_ADMIN_USERNAME` | `admin` | Default admin username |
| `SEED_ADMIN_EMAIL` | `admin@localhost` | Default admin email |
| `SEED_ADMIN_PASSWORD` | `admin12345` | Default admin password |

## Library Integration

SongSeerr can detect already-owned content on these platforms:

- **Jellyfin** — detects albums
- **Navidrome** — detects music via Subsonic API (optional)

Configure them in the Admin → Integrations panel.

## Periodic Scan

To trigger library scans on a schedule, hit the cron endpoint:

```
curl https://mediaseer.local/api/cron/library-scan?token=YOUR_CRON_SECRET
```

## License

MIT

## Tags
Jellyseerr for music
Overseerr for music
Self-hosted music request manager
Music request manager for Lidarr
Jellyseerr-style music requests
Music requests with Lidarr
Self-hosted music requests
Music discovery and request management
