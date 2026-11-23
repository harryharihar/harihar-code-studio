# Harihar Code Studio — Offline-First Series

This directory contains the Offline-First / Local-First experiments demonstrated on the **Harihar Code Studio** YouTube channel.

The goal of this series is to build **PlanIt**, a real React Native task app, step by step — one that keeps working without a network, stores data locally first, and syncs safely across devices when the connection comes back.

## What this series covers

- Offline-first vs online-first vs local-first
- React Native CLI project setup
- App UI, typed navigation and CRUD
- Offline-first system design and data flow
- Offline-ready data models (UUIDs, timestamps, validation)
- SQLite in React Native
- Repository pattern
- Offline CRUD and optimistic UI
- Offline mutation queue (outbox pattern)
- Sync engine: push and pull
- Retry logic and exponential backoff
- Idempotency
- Multi-device sync and conflict resolution
- Versioning and tombstones
- Background sync
- Testing, optimization and production-ready architecture

## Episodes

| # | Episode | Folder | Status |
|---|---|---|---|
| 01 | Offline-First vs Online-First vs Local-First | [episode-01](episode-01/README.md) | Completed |
| 02 | React Native CLI Project Setup | [episode-02](episode-02/PlanIt) | Completed |
| 03 | Offline-First System Design: Architecture, Data Flow and Repository Pattern | [episode-03](episode-03/PlanIt) | Completed |
| 04 | Designing Offline-Ready Data Models: UUIDs, Timestamps and Validation | [episode-04](episode-04/README.md) | Completed |
| 05 | Build the PlanIt UI: Projects, Tasks and Navigation | [episode-05-06](episode-05-06/README.md) | Completed |
| 06 | React Native CRUD with TypeScript | [episode-05-06](episode-05-06/README.md) | Completed |
| 07 | SQLite in React Native | — | Planned |
| 08 | Repository Pattern in React Native | — | Planned |
| 09 | Offline CRUD with SQLite | — | Planned |
| 10 | Optimistic UI | — | Planned |
| 11 | Offline Mutation Queue (Outbox Pattern) | — | Planned |
| 12 | Sync Engine: Push and Pull | — | Planned |
| 13 | Retry Logic and Exponential Backoff | — | Planned |
| 14 | Idempotency in Offline Sync | — | Planned |
| 15 | Multi-Device Sync | — | Planned |
| 16 | Conflict Resolution | — | Planned |
| 17 | Versioning and Tombstones | — | Planned |
| 18 | Background Sync | — | Planned |
| 19 | Testing and Optimization | — | Planned |
| 20 | Production-Ready Architecture | — | Planned |

Each `episode-XX/PlanIt` folder is the code **as it stands at the end of that episode**, so you can open the folder that matches the video you are watching.

**[`PlanIt/`](PlanIt/README.md) is the complete app:** one app and one server that finished episodes are merged into (currently Episodes 01–04; Episodes 05–06 are in [`episode-05-06`](episode-05-06/README.md) and not merged yet). Its README shows which episode added which part of the code.

## File structure

```text
offline_first/
├── README.md         this file
├── PlanIt/           the complete app (Episodes 01–04 merged)
├── episode-01/       notes (no code)
├── episode-02/       PlanIt/ snapshot
├── episode-03/       PlanIt/ snapshot
├── episode-04/       README + PlanIt/ snapshot
└── episode-05-06/    README + PlanIt/ snapshot (one folder for both episodes)
```

Each `PlanIt/` from Episode 02 on has `apps/PlanItMobile` (the React Native app), `server/` (the API) and `docker-compose.yml` (PostgreSQL).

## Running any episode

```bash
cd episode-XX/PlanIt

# Database
docker compose up -d

# Database tables (from Episode 03 on): run each migration once, in order
for f in server/database/migrations/*.sql; do
  docker exec -i planit-postgres psql -U planit_user -d planit < "$f"
done

# API
cd server
cp .env.example .env      # works as-is with the docker-compose database
npm install
npm run dev               # http://localhost:4000/health

# Mobile app (new terminal)
cd ../apps/PlanItMobile
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios               # or: npm run android
```

`node_modules`, `ios/Pods` and build folders are not committed — install them per episode.

> **Switching episodes?** Every episode uses the same container (`planit-postgres`) and the same database volume. Stop the old one first with `docker compose down` in that episode's folder. If the database still refuses to log in (it was created by an older version), reset it with `docker compose down -v` and run the steps above again. This deletes the local data.

## About

Each episode is designed as a practical, hands-on engineering exercise and is demonstrated through the **Harihar Code Studio** YouTube series.

The goal is not only to show the final implementation, but to understand the concepts, architecture, trade-offs, and engineering decisions behind each feature.
