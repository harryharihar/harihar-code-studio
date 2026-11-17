# PlanIt — Offline-First / Local-First React Native

One folder per episode. Each `episode-XX/PlanIt` is the code **as it stands at the end of that episode**, so you can open the folder that matches the video you are watching.

| Ep | Title | Folder | Status |
|---|---|---|---|
| 01 | Offline-First vs Online-First vs Local-First | [episode-01](episode-01/README.md) | ✅ |
| 02 | React Native CLI Project Setup | [episode-02](episode-02/PlanIt) | ✅ |
| 03 | Offline-First System Design: Architecture, Data Flow and Repository Pattern | [episode-03](episode-03/PlanIt) | ✅ |
| 04 | Designing Offline-Ready Data Models: UUIDs, Timestamps and Validation — | 🎬 Recording |
| 05 | Build the PlanIt UI: Projects, Tasks and Navigation | — | ⬜ |
| 06 | React Native CRUD with TypeScript | — | ⬜ |
| 07 | SQLite in React Native | — | ⬜ |
| 08 | Repository Pattern in React Native | — | ⬜ |
| 09 | Offline CRUD with SQLite | — | ⬜ |
| 10 | Optimistic UI | — | ⬜ |
| 11 | Offline Mutation Queue (Outbox Pattern) | — | ⬜ |
| 12 | Sync Engine: Push and Pull | — | ⬜ |
| 13 | Retry Logic and Exponential Backoff | — | ⬜ |
| 14 | Idempotency in Offline Sync | — | ⬜ |
| 15 | Multi-Device Sync | — | ⬜ |
| 16 | Conflict Resolution | — | ⬜ |
| 17 | Versioning and Tombstones | — | ⬜ |
| 18 | Background Sync | — | ⬜ |
| 19 | Testing and Optimization | — | ⬜ |
| 20 | Production-Ready Architecture | — | ⬜ |

## Running any episode

```bash
cd episode-XX/PlanIt

# Database
docker compose up -d

# API
cd server
cp .env.example .env      # then edit values
npm install
npm run dev               # http://localhost:4000/health

# Mobile app (new terminal)
cd ../apps/PlanItMobile
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios               # or: npm run android
```

`node_modules`, `ios/Pods` and build folders are not committed — install them per episode.
