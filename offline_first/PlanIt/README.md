# 📋 PlanIt — the complete app

This is the **one PlanIt codebase** for the Offline-First / Local-First series on **Harihar Code Studio**.

- The `episode-XX/PlanIt` folders are snapshots: the code exactly as it was at the end of each video.
- **This folder** combines every finished episode into one app and one server. After an episode is recorded, its code is merged here.

**Current version:** Episodes 01–04 (Phase 1 — Foundation & Architecture)

---

## What each episode added

| Ep | Episode | Added to this codebase |
| --- | --- | --- |
| 01 | Offline-First vs Online-First vs Local-First | The problem and the plan (no code) — [notes](../episode-01/README.md) |
| 02 | React Native CLI Project Setup | `apps/PlanItMobile` (React Native CLI + TypeScript), `server/` (Express + TypeScript, `/health`), `docker-compose.yml` (PostgreSQL) |
| 03 | Offline-First System Design | `server/database/migrations/001_create_tasks.sql`, `docs/task-data-model.md`, architecture diagrams in `images/` |
| 04 | Offline-Ready Data Models | `src/shared/domain/` (UUID v7, ISO time, base schemas), `src/features/tasks/domain` + `projects/domain` (Zod models), `src/features/tasks/data/taskMappers.ts`, `src/dev/syncLab.ts`, migration `002`, 17 tests — [notes](../episode-04/README.md) |
| 05 | Build the PlanIt UI | _Planned_ |
| 06 | React Native CRUD with TypeScript | _Planned_ |
| 07 | SQLite in React Native | _Planned_ |
| 08 | Repository Pattern | _Planned_ |
| 09 | Offline CRUD with SQLite | _Planned_ |
| 10 | Optimistic UI | _Planned_ |
| 11 | Offline Mutation Queue (Outbox) | _Planned_ |
| 12 | Sync Engine: Push and Pull | _Planned_ |
| 13 | Retry Logic and Exponential Backoff | _Planned_ |
| 14 | Idempotency in Offline Sync | _Planned_ |
| 15 | Multi-Device Sync | _Planned_ |
| 16 | Conflict Resolution | _Planned_ |
| 17 | Versioning and Tombstones | _Planned_ |
| 18 | Background Sync | _Planned_ |
| 19 | Testing and Optimization | _Planned_ |
| 20 | Production-Ready Architecture | _Planned_ |

---

## Folder layout

```text
PlanIt/
├── apps/PlanItMobile/        React Native app (TypeScript)
│   └── src/
│       ├── shared/domain/    IDs, time, base schemas (Ep 04)
│       ├── features/
│       │   ├── projects/     project model (Ep 04)
│       │   └── tasks/        task model + mappers (Ep 04)
│       └── dev/              Sync Lab teaching simulator (Ep 04)
├── server/                   Node.js + Express API (TypeScript)
│   └── database/migrations/  PostgreSQL migrations (001 from Ep 03, 002 from Ep 04)
├── docs/                     data model reference
├── images/                   episode diagrams
└── docker-compose.yml        local PostgreSQL
```

---

## Run it

Needs Node 22.11+, Docker, and Xcode (or Android Studio).

```bash
cd offline_first/PlanIt

# 1. Database
docker compose up -d
for f in server/database/migrations/*.sql; do
  docker exec -i planit-postgres psql -U planit_user -d planit < "$f"
done

# 2. Server (terminal 1)
cd server
cp .env.example .env          # works as-is with docker compose
npm install
npm run dev                   # http://localhost:4000/health

# 3. App (terminal 2)
cd offline_first/PlanIt/apps/PlanItMobile
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios                   # or: npm run android
npm test                      # 17 tests
```

Run the migrations only once. If you already ran an episode folder before, stop it with `docker compose down` there first. If login fails because of an old database, reset it with `docker compose down -v` (this deletes local data).

---

## Adding a new episode

1. Build and record the episode in `episode-XX/PlanIt` (start from a copy of this folder).
2. When the video is done, copy the episode's changes into this folder.
3. Update the **What each episode added** table and **Current version** above.
