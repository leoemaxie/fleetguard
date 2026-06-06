# FleetGuard Backend

Fastify REST API and SQS worker processes for the FleetGuard fleet intelligence platform. Handles vehicle telemetry ingestion, anomaly detection, driver scoring, and multi-tenant fleet management.

---

## What's in This Package

```
apps/backend/
├── src/
│   ├── app.ts                  # Fastify app factory
│   ├── index.ts                # Process entry point
│   ├── config/                 # Env parsing (Zod), constants
│   ├── db/
│   │   ├── client.ts           # Drizzle + postgres.js
│   │   ├── migrate.ts          # Runs migrations on startup
│   │   └── schema/             # 12 Drizzle table definitions
│   ├── redis/                  # ioredis client + pub/sub helpers
│   ├── plugins/                # Fastify plugins: JWT, CORS, RLS, DB, Redis, SQS
│   ├── hooks/                  # Reusable preHandlers: authenticate, require-role
│   ├── modules/                # Feature modules (routes, controller, service, schema)
│   │   ├── auth/
│   │   ├── tenants/
│   │   ├── vehicles/
│   │   ├── drivers/
│   │   ├── trips/
│   │   ├── telemetry/
│   │   ├── alerts/
│   │   ├── routes-mgmt/
│   │   └── fleet/
│   ├── workers/
│   │   ├── telemetry-ingest.worker.ts
│   │   ├── alert-processing.worker.ts
│   │   └── worker-runner.ts
│   ├── services/
│   │   ├── anomaly/            # idle, geo-fence, private-use, fuel-spike detectors
│   │   ├── scoring/            # weekly driver composite score
│   │   ├── reporting/          # evidence PDF / presigned URL generation
│   │   └── iot/                # IoT Core topic publisher (route geo-fence push)
│   ├── lib/                    # SQS helpers, S3 helpers, pagination, geo utilities
│   └── types/                  # Fastify augmentation, shared TypeScript types
├── db/
│   ├── migrations/             # drizzle-kit generated SQL
│   └── seeds/seed.ts           # Nigerian fleet test data
└── tests/
    ├── setup.ts
    └── helpers/                # Test app factory, data fixtures
```

---

## Prerequisites

- Node.js 20+
- PostgreSQL 15 with PostGIS and TimescaleDB extensions
- Redis 7
- AWS credentials configured (for SQS, S3, IoT Core in deployed environments)

For local development, Docker Compose at the repo root starts PostgreSQL and Redis.

---

## Setup

```bash
# From repo root
docker compose up -d

# In this directory
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, REDIS_HOST, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY

npm run db:migrate   # applies all pending migrations
npm run db:seed      # loads Nigerian fleet test data (dev only)
npm run dev          # starts API on :3000 with ts-node-dev hot reload
```

---

## Environment Variables

All variables are validated at startup by a Zod schema in `src/config/env.ts`. The process exits immediately if any required variable is missing or malformed — no silent misconfiguration.

```env
NODE_ENV=development
PORT=3000
STAGE=dev

# Database
DATABASE_URL=postgresql://fleetguard:password@localhost:5432/fleetguard

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT — RS256 keypair (generate with: openssl genrsa -out private.pem 2048)
JWT_PRIVATE_KEY=          # PEM string, base64-encoded in production
JWT_PUBLIC_KEY=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# AWS
AWS_REGION=af-south-1
TELEMETRY_QUEUE_URL=
ALERT_QUEUE_URL=
RAW_LOGS_BUCKET=
FIRMWARE_BUCKET=
REPORTS_BUCKET=
IOT_ENDPOINT=             # from: aws iot describe-endpoint --endpoint-type iot:Data-ATS

# CORS
ALLOWED_ORIGINS=http://localhost:3001
```

In production, secrets (DATABASE_URL, JWT keys, AWS credentials) are injected from AWS Secrets Manager via the ECS task definition. The ECS task execution role has permission to read those secrets — no secrets live in environment variables on the actual task.

---

## Scripts

```bash
npm run dev           # hot-reload dev server (API only)
npm run dev:workers   # hot-reload workers (telemetry + alert)
npm run build         # tsc → dist/
npm run start         # runs compiled dist/index.js
npm run start:workers # runs compiled dist/workers/worker-runner.js
npm run typecheck     # tsc --noEmit (no output, just type errors)
npm run lint          # eslint src/
npm run test          # vitest run
npm run test:watch    # vitest watch
npm run db:migrate    # drizzle-kit migrate
npm run db:generate   # drizzle-kit generate (after schema changes)
npm run db:seed       # ts-node db/seeds/seed.ts
npm run db:studio     # drizzle-kit studio (visual DB browser on :4983)
```

---

## API Reference

Base URL: `https://api.fleetguard.ng/api/v1` (production) / `http://localhost:3000/api/v1` (local)

All endpoints except `POST /auth/register` and `POST /auth/login` require an `Authorization: Bearer <accessToken>` header. All responses are JSON. All list endpoints use cursor-based pagination.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create tenant + initial fleet manager account |
| `POST` | `/auth/login` | Email + password → access token + refresh token |
| `POST` | `/auth/refresh` | Exchange refresh token → new access token |
| `POST` | `/auth/logout` | Revoke refresh token |
| `GET` | `/auth/me` | Current user profile |

**Register request:**
```json
{
  "tenantName": "Dangote Transport Lagos",
  "email": "admin@dangote-transport.ng",
  "password": "min 12 chars",
  "firstName": "Chidi",
  "lastName": "Okeke"
}
```

**Login response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "admin@dangote-transport.ng",
    "role": "fleet_manager",
    "tenantId": "uuid"
  }
}
```

---

### Vehicles

| Method | Path | Description |
|---|---|---|
| `GET` | `/vehicles` | List vehicles — filter by `status`, `driverId` |
| `POST` | `/vehicles` | Create vehicle |
| `GET` | `/vehicles/:id` | Vehicle detail |
| `PATCH` | `/vehicles/:id` | Update vehicle |
| `DELETE` | `/vehicles/:id` | Deactivate vehicle |
| `GET` | `/vehicles/:id/live` | Latest GPS + fuel snapshot from Redis |

**Create vehicle request:**
```json
{
  "plateNumber": "KJA-412-GJ",
  "make": "Hino",
  "model": "700 Series",
  "year": 2021,
  "fuelTankCapacityLitres": 300,
  "assignedDriverId": "uuid (optional)"
}
```

---

### Trips

| Method | Path | Description |
|---|---|---|
| `GET` | `/trips` | List trips — filter by `vehicleId`, `driverId`, `status`, `from`, `to` |
| `GET` | `/trips/:id` | Trip detail with summary stats |
| `GET` | `/trips/:id/replay` | Full GPS + fuel event sequence for map playback |
| `POST` | `/trips/:id/close` | Manually close an active trip |

The `/replay` endpoint returns a time-ordered array of GPS and fuel events for the trip. The web client uses this to animate a vehicle marker along the route polyline and sync the fuel chart playhead.

---

### Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/alerts` | List alerts — filter by `severity`, `type`, `vehicleId`, `resolved` |
| `GET` | `/alerts/:id` | Alert detail with evidence snapshot |
| `PATCH` | `/alerts/:id/resolve` | Mark alert resolved |
| `POST` | `/alerts/bulk-resolve` | Resolve multiple alerts by ID array |
| `GET` | `/alerts/:id/evidence` | Generate presigned S3 URL for evidence PDF |

Alert types: `fuel_anomaly` `geofence_breach` `tamper_detected` `idle_excess` `private_use` `unauthorized_stop` `speeding`

Severity: `critical` `warning` `info`

---

### Fleet Overview

| Method | Path | Description |
|---|---|---|
| `GET` | `/fleet/live` | All vehicles: latest position, speed, fuel level, open alert count, status |
| `GET` | `/fleet/summary` | Counts: total, active, alerting, offline |

`/fleet/live` is polled every 10 seconds by the dashboard. It reads from Redis (`live:{tenantId}:{vehicleId}` keys written by the telemetry worker) — not from PostgreSQL — so it returns in under 5ms regardless of fleet size.

---

### Drivers

| Method | Path | Description |
|---|---|---|
| `GET` | `/drivers` | List drivers |
| `POST` | `/drivers` | Create driver |
| `GET` | `/drivers/:id` | Driver detail |
| `PATCH` | `/drivers/:id` | Update driver |
| `GET` | `/drivers/:id/score` | Current week composite score |
| `GET` | `/drivers/:id/score/history` | 8-week score history |

**Score breakdown:**
```json
{
  "driverId": "uuid",
  "weekStart": "2026-05-26",
  "totalScore": 84,
  "breakdown": {
    "routeCompliance": 36,
    "fuelEfficiency": 26,
    "alertFree": 15,
    "stopDiscipline": 7
  },
  "tripsCount": 12
}
```

---

### Routes Management

| Method | Path | Description |
|---|---|---|
| `GET` | `/routes` | List saved routes |
| `POST` | `/routes` | Create route with GeoJSON corridor polygon |
| `GET` | `/routes/:id` | Route detail |
| `PATCH` | `/routes/:id` | Update route |
| `DELETE` | `/routes/:id` | Deactivate route |
| `POST` | `/routes/:id/stops` | Add approved stop |
| `DELETE` | `/routes/:id/stops/:stopId` | Remove approved stop |

When a route is saved or updated, the backend publishes the corridor polygon to the IoT Core topic `fg/{tenantId}/routes` so OBUs can download the updated boundary.

---

## Database Schema

All tables carry `tenant_id` with PostgreSQL row-level security enforced at the session level. The backend sets `SET LOCAL app.current_tenant = '<tenantId>'` before every query, activated by an RLS policy on each table. A query without a valid `app.current_tenant` set returns zero rows.

**Time-series tables** (`gps_events`, `fuel_events`) are TimescaleDB hypertables partitioned by week. TimescaleDB continuous aggregates compute hourly rollups for the fuel chart without full table scans on every request.

Run `npm run db:studio` to browse the schema visually via Drizzle Studio at `http://localhost:4983`.

---

## Workers

Workers and the API run as separate processes in production (separate ECS services). Locally, `npm run dev:workers` starts both workers alongside the API.

### Telemetry Ingest Worker

Consumes the `fleetguard-telemetry` SQS queue. For each GPS or fuel event message:

1. Validates payload shape with Zod
2. Confirms the device is provisioned in `device_registry`
3. Inserts into the appropriate hypertable via Drizzle
4. Updates the Redis live-state key with a 60-second TTL
5. Auto-opens a new trip record if no active trip exists for the vehicle

Throughput: 10 concurrent in-flight messages per worker instance. At 500 vehicles × 1Hz, a single worker handles the load. Two worker instances (prod default) provide redundancy.

### Alert Processing Worker

Consumes the `fleetguard-alert` SQS queue. Runs four anomaly detectors in parallel against each incoming telemetry batch:

- **Idle detector** — engine on, speed zero, sustained beyond the tenant's configured idle threshold
- **Geo-fence checker** — GPS point outside the assigned route's corridor polygon (`ST_Within` via PostGIS)
- **Private use detector** — movement detected outside the tenant's configured operating hours in their timezone
- **Fuel anomaly detector** — current consumption rate more than 2.5× the vehicle's rolling 60-minute baseline

Each detector that fires writes an alert record and publishes to the Redis `alerts:{tenantId}` channel. The WebSocket service subscribes to that channel and fans the alert out to all connected dashboard sessions for that tenant.

Alert deduplication: a Redis key `alert-dedup:{tenantId}:{vehicleId}:{type}` with a 5-minute TTL prevents the same alert type from firing repeatedly for the same vehicle within a short window.

---

## Multi-Tenancy

The backend enforces tenant isolation at every layer. JWT payloads carry `tenantId` and `role`. The RLS plugin extracts `tenantId` from each request's verified token and sets the PostgreSQL session variable before the handler runs. All service functions receive `tenantId` as an explicit argument — there is no global tenant context.

**Roles:**
- `super_admin` — cross-tenant access (Team Triumph ops only)
- `fleet_manager` — full access within their tenant
- `driver` — read-only access to their own trips and score
- `auditor` — read-only access to all data within their tenant

---

## Testing

```bash
npm run test              # all tests, single run
npm run test:watch        # watch mode during development
npm run test -- --coverage
```

Tests use a dedicated test database (`fleetguard_test`) that is migrated fresh before each test run. The test app factory in `tests/helpers/build-app.ts` creates an isolated Fastify instance per test file. Fixtures in `tests/helpers/fixtures.ts` generate realistic test data using `@faker-js/faker` — Nigerian names, Lagos plate numbers, realistic GPS coordinates along the Apapa–Ibadan corridor.

External dependencies (SQS, S3, IoT Core) are mocked at the service boundary. Redis is mocked via `ioredis-mock`. No test makes a real AWS call.

---

## Deployment

In production, the API and workers run as separate ECS Fargate services defined in `infra/cdk/lib/stacks/compute-stack.ts`. CI pushes a tagged Docker image to ECR on merge to `main`, then triggers an ECS rolling deploy.

```bash
# Build and push image (done by CI)
docker build -t fleetguard/backend .
docker tag fleetguard/backend:latest $ECR_URI:$GIT_SHA
docker push $ECR_URI:$GIT_SHA

# Update ECS service (done by CI after push)
aws ecs update-service \
  --cluster fleetguard-prod \
  --service fleetguard-api-gateway-prod \
  --force-new-deployment
```

The Dockerfile uses a multi-stage build: compile TypeScript in a build stage, copy `dist/` into the runtime image. Final image is `node:20-alpine` with only production dependencies — no TypeScript toolchain.

Health check endpoint: `GET /health` — returns `200 { status: 'ok' }`. ECS considers a task healthy after 2 consecutive successes.