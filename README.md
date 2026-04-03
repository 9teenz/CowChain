# MilkChain

## Auth stack

- NextAuth (JWT session in httpOnly cookies)
- Prisma + SQLite for local development
- OAuth providers: Google and GitHub
- Email verification via SMTP (Ethereal)
- Wallet-only sign-in and wallet linking endpoint

## Local setup

1. Install dependencies.
2. Create environment file from example.
3. Run Prisma generate and migration.
4. Start dev server.

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Required environment variables

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-long-random-secret"
AUTH_URL="http://localhost:3000"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""

ETHEREAL_SMTP_HOST="smtp.ethereal.email"
ETHEREAL_SMTP_PORT="587"
ETHEREAL_SMTP_USER=""
ETHEREAL_SMTP_PASS=""
EMAIL_FROM="CowFi <no-reply@cowfi.local>"
```

## OAuth callbacks

- Google callback URL: `http://localhost:3000/api/auth/callback/google`
- GitHub callback URL: `http://localhost:3000/api/auth/callback/github`

## Implemented auth endpoints

- `POST /api/auth/register`
- `POST /api/auth/verify/request`
- `POST /api/auth/verify/confirm`
- `POST /api/wallet/link`
- `GET|POST /api/auth/[...nextauth]`

## Protected routes

- `/profile/*`
- `/portfolio/*`
- `/herd/*`

Unauthenticated access to these routes is redirected to `/login?next=<path>`.

## Automated tests

Install browsers once for Playwright:

```bash
npx playwright install chromium
```

Run all unit, component, and API integration tests:

```bash
npm run test
```

Run scoped suites:

```bash
npm run test:unit
npm run test:api
```

Run end-to-end smoke tests:

```bash
npm run test:e2e
```

Generate coverage report:

```bash
npm run test:coverage
```

