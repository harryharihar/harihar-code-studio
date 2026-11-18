# 📋 PlanIt: Offline-Ready Data Models

### Episode 04: Designing Offline-Ready Data Models (UUIDs, Timestamps and Validation)

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

> **The phone creates the record, so the phone creates the ID. Every change leaves a trace. Bad data stops at the door.**

🎬 This folder is the code from **Episode 04** of the **Offline-First / Local-First** series on **Harihar Code Studio**.

Two phones, both offline. Each adds a task. They sync, and **one task disappears from every phone**. The screens were fine. The bug was in the **data model**.

This episode fixes the model with four ideas:

| Idea | What it fixes |
| --- | --- |
| 🆔 **UUID v7 IDs** | The phone makes its own ID, so two offline phones never pick the same one. The IDs also sort by time, so database indexes stay fast |
| 🕒 **Timestamps + version** | `createdAt`, `updatedAt` and `version` on every record, so sync can tell what changed and when |
| 🪦 **Tombstones** | Delete sets `deletedAt` instead of removing the row, so the delete can sync and the task doesn't come back |
| 🛡 **Zod validation** | Bad input (an empty title, a due date of "kal shaam") is rejected before it is saved or sent |

The new **Sync Lab** tab plays the same three stories twice, once with the **Junior model** (counter IDs, no checks) and once with the **Senior model** (UUID v7, tombstone, Zod):

```text
STORY 1  ID clash         Phone A (offline) adds "Bijli bill pay karna" → id 1
                          Phone B (offline) adds "Doodh lana"           → also id 1
         Junior model:    Phone B syncs → same id, OVERWRITES Bijli bill      → Bijli bill is gone. From every phone.
         Senior model:    different UUIDs → added, not overwritten            → Both tasks safe. On every phone.

STORY 2  Delete offline   Phone A (offline) deletes "Gas cylinder book karna"
         Junior model:    row removed, nothing to sync → task comes BACK      → Zombie task.
         Senior model:    deletedAt set, v2 → tombstone syncs → hidden        → Deleted everywhere. It stays deleted.

STORY 3  Bad data         title "   ", due date "kal shaam"
         Junior model:    saved → "Invalid Date" → PostgreSQL rejects it      → Sync stuck forever.
         Senior model:    Zod rejects both fields                             → Bad data stopped at the door.
```

### ✨ Highlights

- 🆔 **IDs made on the device:** `createId()` returns a UUID v7. No server round trip, no counter, no clashes.
- 🧱 **One base for every entity:** `id`, `createdAt`, `updatedAt`, `deletedAt`, `version`, shared by projects and tasks.
- 🔁 **Every change follows one rule:** same ID, new `updatedAt`, `version + 1`, `syncStatus: 'pending'` again.
- 🪦 **Soft delete:** `deleteTask` sets a tombstone, so the delete is a change that can sync.
- 🛡 **Validate at every boundary:** user input, data coming out of storage, and data going to the server.
- 🔄 **Mappers:** one task, three shapes: the app's object, the SQLite row (snake_case, `0`/`1`), and the API payload (no local-only `syncStatus`).
- 🗄 **Migration `002`:** projects, task priority, due date and version in PostgreSQL. `001` is never edited.
- 📱 **New app screens:** **Sync Lab** (Junior vs Senior model, step by step) and **Models** (create, update and break a task on the phone).
- ✅ **17 tests**, including all three Sync Lab stories in both modes.

This is Episode 04 of the [Offline-First series](../README.md), built on [Episode 03](../episode-03/PlanIt).

---

## 🗺 Series Roadmap

| Ep | Topic | What PlanIt gains |
| --- | --- | --- |
| 01 | Offline-First vs Online-First vs Local-First | The problem and the plan |
| 02 | React Native CLI Project Setup | The app, the server and the database running |
| 03 | Offline-First System Design | Architecture, data flow, the first task model |
| **04** | **Offline-Ready Data Models** | **UUID v7, timestamps, tombstones, Zod, mappers (this folder)** |
| 05 | Build the PlanIt UI | Projects, tasks and navigation |
| 06 | React Native CRUD with TypeScript | Create, edit and delete from the screens |
| 07 | SQLite in React Native | A real local database on the phone |
| 08–20 | Repository, offline CRUD, outbox, sync engine, retries, idempotency, multi-device, conflicts, background sync, production | See the [full list](../README.md) |

---

## 🔄 How It Works

```mermaid
flowchart LR
    U[📱 User input] -->|Zod: createTaskInputSchema| D[🧠 LocalTask<br/>UUID v7 · timestamps · version · syncStatus]
    D -->|toTaskRow| R[(🗄 SQLite row<br/>snake_case · 0/1)]
    R -->|fromTaskRow + Zod| D
    D -->|toTaskPayload<br/>drops syncStatus| A[🌐 API JSON]
    A --> P[(🐘 PostgreSQL<br/>migration 002)]
```

Every change to a task goes through the same steps:

```mermaid
stateDiagram-v2
    [*] --> v1: createTask<br/>new UUID v7, pending
    v1 --> v2: updateTask<br/>same id, updatedAt new, version + 1, pending
    v2 --> v3: deleteTask<br/>deletedAt set, version + 1, pending
    v3 --> [*]: synced as a tombstone
```

---

## 🧩 The Code

All paths are inside `PlanIt/`.

| File | What it does |
| --- | --- |
| `apps/PlanItMobile/src/shared/domain/id.ts` | **New.** `createId()`: a UUID v7, made on the phone |
| `apps/PlanItMobile/src/shared/domain/time.ts` | **New.** `nowIso()`: one time format everywhere (ISO 8601, UTC) |
| `apps/PlanItMobile/src/shared/domain/schemas.ts` | **New.** `idSchema`, `isoDateTimeSchema`, `entityBaseSchema` (the fields every entity has), `syncStatusSchema` |
| `apps/PlanItMobile/src/features/tasks/domain/task.ts` | **New.** The task schema, input rules, and `createTask` / `updateTask` / `deleteTask` |
| `apps/PlanItMobile/src/features/projects/domain/project.ts` | **New.** The project schema and `createProject` |
| `apps/PlanItMobile/src/features/tasks/data/taskMappers.ts` | **New.** `toTaskRow`, `fromTaskRow` (validated), `toTaskPayload` |
| `apps/PlanItMobile/src/dev/syncLab.ts` | **New.** The Sync Lab simulator: 3 stories × Junior / Senior model, all in memory |
| `apps/PlanItMobile/App.tsx` | **Sync Lab** and **Models** tabs |
| `apps/PlanItMobile/index.js` | Imports `react-native-get-random-values` first, so `uuid` gets a secure random source on the phone |
| `apps/PlanItMobile/__tests__/domainModels.test.ts` | **New.** IDs, defaults, validation, update, soft delete, row round trip, payload |
| `apps/PlanItMobile/__tests__/syncLab.test.ts` | **New.** All three stories in both modes |
| `server/database/migrations/002_projects_and_task_fields.sql` | **New.** `projects` table, a default **Inbox** project for existing tasks, `priority`, `due_at`, `version`, title length check |
| `docs/task-data-model.md` | The data model reference, updated |

The heart of it, simplified:

```ts
// Every entity: an ID made on the phone + the metadata sync needs
const entityBaseSchema = z.object({
  id: z.uuid(),                          // 🆔 UUID v7, from createId()
  createdAt: z.iso.datetime(),           // 🕒 ISO 8601, UTC
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(), // 🪦 tombstone: null = not deleted
  version: z.int().min(1),               // 🔁 +1 on every change
});

function updateTask(task, changes) {
  const data = updateTaskInputSchema.parse(changes);   // 🛡 bad input stops here
  return localTaskSchema.parse({
    ...task, ...data,
    updatedAt: nowIso(),
    version: task.version + 1,
    syncStatus: 'pending',                             // not on the server yet
  });
}
```

---

## 🗄 Database (new in Episode 04)

| Table | Change |
| --- | --- |
| `projects` | **New:** `id UUID`, `name` (1–100 chars), `created_at`, `updated_at`, `deleted_at`, `version` |
| `tasks` | **New columns:** `project_id` (existing tasks go to the default **Inbox**), `priority` (`low` / `medium` / `high`, default `medium`), `due_at`, `version` |
| `tasks` | **New check:** title is 1–200 characters, the same rule Zod uses in the app |

The migration runs in one transaction: either all of it applies, or none of it.

---

## ⚙️ Setup

Node 20+, Xcode (or Android Studio), and Docker for the database.

```bash
cd offline_first/episode-04/PlanIt

# Database
docker compose up -d
psql postgresql://planit_user:local_dev_password@localhost:5432/planit \
  -f server/database/migrations/001_create_tasks.sql     # skip if you ran it in Ep 03
psql postgresql://planit_user:local_dev_password@localhost:5432/planit \
  -f server/database/migrations/002_projects_and_task_fields.sql

# Terminal 1: server
cd server
cp .env.example .env        # set YOUR_PASSWORD
npm install && npm run dev  # http://localhost:4000/health

# Terminal 2: app
cd apps/PlanItMobile
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios                 # or: npm run android
```

| New package | Why |
| --- | --- |
| `uuid` | `v7()` for IDs |
| `react-native-get-random-values` | A secure random source for `uuid` on the phone. **Native module:** run `pod install` and rebuild, a Metro reload is not enough |
| `zod` | Schemas, validation and TypeScript types from one place |
| `@babel/plugin-transform-export-namespace-from` (dev) | Needed for Zod 4 in Metro |

| Command | Shows |
| --- | --- |
| `npm test` (in `apps/PlanItMobile`) | 17 tests, no server or database needed |

---

## 🙋 Try It

1. Open the app. The **Sync Lab** tab shows Phone A, the server and Phone B.
2. Pick **ID clash** with the **Junior model**. Watch the steps: Bijli bill disappears from every phone.
3. Switch to the **Senior model** and run it again. Both tasks survive, each with its own UUID.
4. **Delete offline:** Junior gets a zombie task. Senior sends a tombstone (`deletedAt`, v2) and it stays deleted.
5. **Bad data:** Junior saves "kal shaam" and sync gets stuck. Senior: Zod stops both fields.
6. Open the **Models** tab: tap **+ Task** (see the UUID v7 and `updatedAt`), **Toggle done** (version goes up), and **Invalid** (see Zod's messages).

---

## 🔒 Safety Rules in This Model

- IDs are never made by a counter or by the server. The phone makes them, and they are unique everywhere.
- Nothing is deleted for real. A delete is a change (`deletedAt` + `version + 1`) that syncs like any other.
- Data is validated when it comes **in** (user input) and when it comes **out** (storage). Never trust a boundary.
- `syncStatus` is local-only. `toTaskPayload` drops it, so it never reaches the server.
- The database has the same rules as the app (`CHECK` constraints), so bad data is stopped in both places.

---

## 🎓 What We Learned

- In an offline app the phone creates the record, so the phone must create the ID.
- UUID v7 is unique like any UUID, and it also sorts by time, which keeps indexes fast.
- `updatedAt` and `version` must change on **every** update, or sync can't see the change.
- A hard delete can't sync. A tombstone can.
- One Zod schema gives you validation **and** the TypeScript type.
- Mappers keep the app, the local database and the API each in their own shape.
- A schema change is a new migration file. Old migrations are never edited.

---

## 🎓 About Harihar Code Studio

**Harihar Code Studio** focuses on practical software engineering tutorials covering:

`React Native` · `Mobile Engineering` · `Offline-First Architecture` · `Sync Engines` · `Databases` · `Developer Tools` · `Production Engineering`

The goal is to understand not only **how** to implement a feature, but also the **architecture and engineering decisions** behind it.
