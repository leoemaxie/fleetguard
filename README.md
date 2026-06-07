# FleetGuard

**Fleet intelligence for Nigerian commercial operations.**

FleetGuard is a multi-tenant SaaS platform that gives fleet operators real-time visibility into vehicle position, fuel consumption, and driver behavior. It detects fuel theft, route deviations, and unauthorized vehicle use — and surfaces evidence before the fuel card statement arrives.

Built for the realities of Nigerian logistics: GPRS dead zones, unreliable power, informal stop patterns, and fuel prices that make a 20-litre discrepancy worth investigating.

---

## What It Does

A GPS and fuel sensor device (OBU) fitted to each vehicle transmits telemetry over MQTT to AWS IoT Core. The backend ingests that stream, runs anomaly detection against each tenant's configured routes and operating hours, and writes structured alerts to a PostgreSQL database. Fleet managers see the live fleet on a map, review alerts with evidence trails, and pull weekly driver scorecards. The data sits in TimescaleDB hypertables — GPS and fuel events partitioned by week — so trip replay and historical queries stay fast as the dataset grows.

---

## Repository Structure

```
fleetguard/
├── apps/
│   ├── web/                  # TanStack Start PWA — fleet manager dashboard
│   └── backend/              # Fastify API — REST + SQS workers
├── infra/
│   └── cdk/                  # AWS CDK TypeScript — all infrastructure
├── packages/
│   └── shared/               # Shared Zod schemas and TypeScript types
└── docs/
    ├── architecture.md
    ├── iot-provisioning.md
    └── api-reference.md
```

---

## Architecture Overview

```
OBU (ESP32 + GPS + fuel sensor)
    │  MQTT over TLS (X.509 cert per device)
    ▼
AWS IoT Core
    │  Rules Engine → SQS
    ▼
┌─────────────────────────────────────────────────────┐
│  Backend (ECS Fargate)                              │
│                                                     │
│  Telemetry Worker ──► Aurora PostgreSQL             │
│  (SQS consumer)        (PostGIS + TimescaleDB)      │
│                                                     │
│  Alert Worker ──────► Redis pub/sub                 │
│  (anomaly detection)      │                         │
│                           ▼                         │
│  WebSocket Service ◄── Redis                        │
│  (live push to UI)                                  │
│                                                     │
│  REST API ──────────► Fastify + Drizzle ORM         │
└─────────────────────────────────────────────────────┘
    │
    ▼
CloudFront → TanStack Start PWA
```

**Every resource lives on AWS.** IoT Core handles device authentication and message routing. Aurora Serverless v2 scales to near-zero at idle, which keeps the pilot cost manageable. ElastiCache Serverless handles the Redis pub/sub layer that pushes live alerts to the dashboard WebSocket without polling. All infrastructure is provisioned by CDK — one `cdk deploy --all` from a clean account.

Full architecture notes: [`docs/architecture.md`](docs/architecture.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | TanStack Start, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui, Mapbox GL JS |
| Backend | Node.js 20, Fastify v4, Drizzle ORM, `fastify-type-provider-zod` |
| Database | Aurora PostgreSQL 15 + PostGIS + TimescaleDB |
| Cache / Pub-Sub | ElastiCache Redis 7 (Serverless) |
| Queue | AWS SQS (telemetry, alert-processing, AI inference) |
| IoT | AWS IoT Core (X.509 device auth, MQTT, rules engine) |
| Storage | S3 (raw logs, firmware, reports) |
| Infrastructure | AWS CDK v2 (TypeScript) |
| CI/CD | GitHub Actions → ECR → ECS rolling deploy |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL + Redis)
- AWS CLI configured (`af-south-1` region)
- AWS CDK v2: `pnpm install -g aws-cdk`

### Local Development

```bash
# Clone and install
git clone https://github.com/triumph-systems/fleetguard
cd fleetguard
pnpm install          # installs all workspace packages

# Start local infrastructure (Postgres + Redis)
docker compose up -d

# Copy and configure env files
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env

# Run DB migrations and seed
cd apps/backend
pnpm run db:migrate
pnpm run db:seed

# Start backend (port 3000) and web (port 3001) in parallel
cd ../..
pnpm run dev
```

### Infrastructure Deploy

```bash
cd infra/cdk
pnpm install
pnpm run build

# Bootstrap CDK (once per account)
cdk bootstrap aws://YOUR_ACCOUNT_ID/af-south-1

# Deploy all stacks
cdk deploy --all -c stage=prod
```

Stack deploy order is handled automatically by CDK dependency graph:
`Foundation` → `Data` → `IoT` → `Compute`

See [`infra/cdk/README.md`](infra/cdk/README.md) for cost estimates and post-deploy steps.

---

## Applications

### `apps/web` — Dashboard

Progressive Web App. Mobile-native first. Bottom navigation on small screens, sidebar on desktop. Installable as a home screen app.

- Live fleet map (Mapbox GL JS) with vehicle markers color-coded by status
- Trip replay: scrub through any past trip with GPS track + fuel consumption chart synced to a playhead
- Alert inbox with swipe-to-resolve on mobile, evidence PDF export on desktop
- Driver leaderboard with weekly score breakdown and 8-week trend

See [`apps/web/README.md`](apps/web/README.md)

### `apps/backend` — API + Workers

Fastify REST API and two SQS worker processes sharing the same codebase.

- Multi-tenant: every query is scoped by `tenant_id` enforced at the PostgreSQL RLS layer
- JWT RS256 auth with 15-minute access tokens and Redis-backed refresh token rotation
- Telemetry worker: ingests GPS + fuel events from SQS into TimescaleDB hypertables
- Alert worker: runs four anomaly detectors (idle, geo-fence, private use, fuel spike) per event batch

See [`apps/backend/README.md`](apps/backend/README.md)

---

## IoT Device (OBU)

The on-board unit runs MicroPython on an ESP32. It reads GPS (NMEA over UART) and fuel pulse data (hall-effect sensor on the fuel line), buffers to an SD card when offline, and publishes to IoT Core over MQTT when connectivity is available.

Topic structure:
```
fg/{tenantId}/{vehicleId}/gps
fg/{tenantId}/{vehicleId}/fuel
fg/{tenantId}/{vehicleId}/alert
fg/{tenantId}/{vehicleId}/batch     ← SD card catch-up uploads
```

Device provisioning guide: [`docs/iot-provisioning.md`](docs/iot-provisioning.md)

---

## Multi-Tenancy Model

Tenant = fleet operator. One tenant owns its vehicles, drivers, routes, and alerts. Isolation is enforced at three layers:

1. **Application**: `tenantId` extracted from JWT and passed explicitly to every service function
2. **Database**: PostgreSQL row-level security policies read `app.current_tenant` session variable set per request
3. **IoT**: Device certificates scoped to `fg/{tenantId}/*` topic paths via IAM policy conditions

A misconfigured query returns zero rows rather than leaking cross-tenant data.

---

## Contributing

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Run `ppnpm run typecheck` and `pnpm run test` before pushing
3. PRs require passing CI — type errors and failing tests block merge

---

## License

Proprietary. © Team Triumph. All rights reserved.