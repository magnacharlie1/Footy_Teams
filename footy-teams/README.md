# Footy Teams

Mobile-first Next.js app for organising weekly football sessions: paste WhatsApp lists, build balanced teams, record scores, and track league tables across groups.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v3 + shadcn/ui components
- Prisma ORM (Postgres) with docker-compose for local database
- Auth.js (NextAuth) with Google and Apple OAuth (coming in later steps)
- Zod for validation and Luxon for timezone-safe logic (coming soon)

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy environment defaults and adjust secrets:

```bash
cp .env.example .env.local
```

3. Start Postgres (local dev):

```bash
docker-compose up -d db
```

4. Run Prisma migrations and seed demo data:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

5. Run the dev server:

```bash
npm run dev
```

Visit http://localhost:3000.

## Environment

Required values for Auth.js OAuth:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY`
- `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` (e.g., `http://localhost:3000`)
- `SEED_ADMIN_EMAIL` (optional for seed user, defaults to admin@example.com)

Database: `DATABASE_URL` (default points to docker-compose Postgres).

## Scripts

- `npm run dev` – start Next dev server
- `npm run lint` – run ESLint
- `npm run build` – production build
- `npm test` – run utility tests (Vitest)
- `npm run prisma:generate` – regenerate Prisma client
- `npm run prisma:format` – format Prisma schema

## Scripts

- `npm run dev` – start Next dev server
- `npm run lint` – run ESLint
- `npm run build` – production build

## Deployment

Netlify configuration lives in `netlify.toml` and uses the official Next.js runtime plugin. Set the required environment variables (database + NextAuth secret + Google/Apple OAuth) in Netlify before deploying. Build command: `npm run build`, publish: `.next`.

## MVP checklist

- [x] Next.js App Router + Tailwind + shadcn/ui scaffold
- [x] Prisma schema for users, groups, invites, players, sessions, teams, fixtures, MoTM votes
- [x] Dockerised Postgres for local dev
- [x] Auth.js with Google/Apple providers (Prisma adapter)
- [x] WhatsApp parsing utility with tests
- [x] Team balancing/formation + scoring utilities with tests
- [x] Session creation with WhatsApp paste, default fixtures, team builder (manual/auto), publish teams
- [x] Basic dashboards for groups/sessions and login page
- [ ] MoTM voting window and leaderboard UI
- [ ] League tables UI and member management polish
