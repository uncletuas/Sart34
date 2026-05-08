# Sart34 Backend

Backend-first implementation for Sart34: AI campaign generation, Meta campaign launch workflow, CRM, creative uploads, credit wallet, Paystack payments, and admin/compliance operations.

## Stack

- NestJS API with Swagger at `/docs`
- Prisma + PostgreSQL
- Redis + BullMQ jobs
- Custom JWT auth and workspace RBAC
- Local creative storage through a storage abstraction
- OpenAI integration with mock fallback when no API key is set
- Paystack wallet integration with mock credit purchase fallback when no secret is set

## Quick Start

1. Copy `.env.example` to `.env` and update secrets.
2. Start infrastructure:

```bash
docker compose up -d
```

3. Generate Prisma client and migrate:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Run the API:

```bash
npm run start:dev
```

The API listens on `http://localhost:4000/api/v1` by default.

Seeded local accounts:

```txt
Sart34 Super Admin: admin@sart34.test / AdminPassword123!
Demo Business User: owner@sart34.test / password123
```

### Dockerless Local Mode

This workstation has PostgreSQL installed locally and an older Redis service. For that setup, use:

```env
DATABASE_URL=postgresql://sart34:sart34@localhost:5432/sart34?schema=public
DISABLE_QUEUES=true
```

With `DISABLE_QUEUES=true`, campaign launch jobs run inline for local development instead of BullMQ. Production should use Redis 5+ and set `DISABLE_QUEUES=false`.

## Frontend

The React web app lives in `frontend/` and talks to the backend through `VITE_API_BASE_URL`.

```bash
cd frontend
npm install
npm run dev
```

The frontend listens on `http://localhost:5173` by default. Copy `frontend/.env.example` to `frontend/.env` if the API is not running at `http://localhost:4000/api/v1`.

## Main API Groups

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `/workspaces` for business, agency, client workspace, member, and invite management
- `/campaigns` for campaign wizard, AI generation, policy review, approval, launch, pause/resume, metrics
- `/creatives` for local upload, listing, preview, deletion
- `/integrations` for Meta OAuth/connect/sync placeholders and encrypted token storage
- `/leads` for CRM pipeline, notes, assignments, reminders, and AI follow-up
- `/wallet` for credit balance, Paystack purchase, verification, webhooks, and transaction history
- `/admin` for super-admin review queues, users, campaigns, credits, and logs
- `/reports/overview` for workspace summary metrics

## Launch Safety

Meta launch is intentionally gated. A campaign must have:

- workspace permission
- connected Meta integration
- successful policy review
- no pending human review
- explicit user approval
- enough Sart34 credits

The current launch processor records a queued Meta adapter result. Replace that adapter section with live Graph API campaign/adset/creative/ad calls after Meta app credentials and permissions are approved.
