# Episode 04 — Designing Offline-Ready Data Models

> **Phase:** 🟦 Build the product · **Topic:** UUIDs, Timestamps and Validation · **Previous:** [Episode 03](../episode-03/PlanIt) · **Next:** Episode 05 — Build the PlanIt UI

📺 **Watch:** coming soon

---

## TL;DR

- In an offline app, the **phone creates the record** — so the phone must also create its **ID**. No waiting for the server.
- We use **UUID v7** IDs: unique on every device, and they sort by creation time, which keeps database indexes fast.
- Every record carries **`created_at`, `updated_at`, `deleted_at` and `version`** — the metadata that sync and conflict resolution need later.
- **Zod** validates data at the edges (UI input, local DB, server response), so bad data never enters the app.
- **Mappers** convert between the app's camelCase domain model and the database's snake_case rows.
- A new **migration (`002`)** adds projects, task priority and due date, and version metadata to PostgreSQL — without editing `001`.

---

## What changed since Episode 03

| Area | File | What it does |
|---|---|---|
| IDs | `apps/PlanItMobile/src/shared/domain/id.ts` | `createId()` — UUID v7, generated on the device |
| Time | `apps/PlanItMobile/src/shared/domain/time.ts` | ISO-8601 UTC timestamp helpers |
| Validation | `apps/PlanItMobile/src/shared/domain/schemas.ts` | Shared Zod schemas (id, timestamps, version) |
| Task model | `apps/PlanItMobile/src/features/tasks/domain/task.ts` | Task schema + type (priority, due date, project) |
| Project model | `apps/PlanItMobile/src/features/projects/domain/project.ts` | Project schema + type |
| Mappers | `apps/PlanItMobile/src/features/tasks/data/taskMappers.ts` | Domain ⇄ database row conversion |
| Sync Lab | `apps/PlanItMobile/src/dev/syncLab.ts` | Dev tab: 2 offline phones sync the same story with a "junior" model (counter IDs, no validation) vs our model (UUID v7, tombstones, Zod) |
| Tests | `apps/PlanItMobile/__tests__/domainModels.test.ts`, `syncLab.test.ts` | Model, validation and Sync Lab tests |
| Database | `server/database/migrations/002_projects_and_task_fields.sql` | Projects table, task priority/due date/version |
| Docs | `docs/task-data-model.md` | Updated data model reference |

New packages in the mobile app: `uuid`, `react-native-get-random-values`, `zod`, and the dev plugin `@babel/plugin-transform-export-namespace-from` (needed for Zod 4 in Metro).

---

## Setup

### 1. Database

```bash
cd episode-04/PlanIt
docker compose up -d
```

Run the migrations in order (001 first if this is a fresh database):

```bash
psql postgresql://planit_user:local_dev_password@localhost:5432/planit \
  -f server/database/migrations/001_create_tasks.sql
psql postgresql://planit_user:local_dev_password@localhost:5432/planit \
  -f server/database/migrations/002_projects_and_task_fields.sql
```

> Coming from Episode 03 with data already in the database? Only run `002` — existing tasks are moved into a default **Inbox** project.

### 2. API

```bash
cd server
cp .env.example .env      # set YOUR_PASSWORD
npm install
npm run dev               # http://localhost:4000/health
```

### 3. Mobile app

```bash
cd ../apps/PlanItMobile
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios               # or: npm run android
```

New native module this episode (`react-native-get-random-values`) — if you are upgrading an existing install, run `pod install` again and rebuild the app; a Metro reload is not enough.

### 4. Tests

```bash
npm test
```

---

`node_modules`, `ios/Pods` and build folders are not committed — install them yourself.
