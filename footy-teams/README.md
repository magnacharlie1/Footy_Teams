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

4. Run the dev server:

```bash
npm run dev
```

Visit http://localhost:3000.

## Scripts

- `npm run dev` – start Next dev server
- `npm run lint` – run ESLint
- `npm run build` – production build

## Deployment

Netlify configuration lives in `netlify.toml` and uses the official Next.js runtime plugin. Set the required environment variables (OAuth + database) in Netlify before deploying.
