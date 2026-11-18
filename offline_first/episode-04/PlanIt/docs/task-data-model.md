# PlanIt Data Model

## Entities

### Shared fields (every synced entity)

| Application field | PostgreSQL | SQLite (Ep 07) | Why |
|---|---|---|---|
| id | UUID | TEXT PRIMARY KEY | UUID v7, created on the phone |
| createdAt | TIMESTAMPTZ | TEXT (ISO 8601 UTC) | when it was made |
| updatedAt | TIMESTAMPTZ | TEXT (ISO 8601 UTC) | changes on **every** update |
| deletedAt | TIMESTAMPTZ nullable | TEXT nullable | tombstone (soft delete) |
| version | INTEGER ≥ 1 | INTEGER | +1 on every change, for conflicts (Ep 16) |

### Project

| Application field | PostgreSQL | SQLite | Rules |
|---|---|---|---|
| name | TEXT NOT NULL | TEXT NOT NULL | trimmed, 1–100 chars |

### Task

| Application field | PostgreSQL | SQLite | Rules |
|---|---|---|---|
| projectId | UUID NOT NULL → projects.id | TEXT NOT NULL | valid UUID |
| title | TEXT NOT NULL | TEXT NOT NULL | trimmed, 1–200 chars |
| description | TEXT nullable | TEXT nullable | blank becomes null, max 2000 |
| isCompleted | BOOLEAN | INTEGER (0 or 1) | |
| priority | TEXT | TEXT | `low` · `medium` · `high`, default `medium` |
| dueAt | TIMESTAMPTZ nullable | TEXT nullable | ISO 8601 UTC |

## Local-only synchronization metadata

`syncStatus`: `pending` · `synced` · `failed`

Stored only on the phone. `toTaskPayload()` strips it before anything is sent to the server.

## One task, three shapes

| Shape | Where | Example difference |
|---|---|---|
| `LocalTask` | app code | `isCompleted: true`, has `syncStatus` |
| `TaskRow` | SQLite | `is_completed: 1`, snake_case |
| `Task` payload | API JSON | no `syncStatus` |

Mappers live in `apps/PlanItMobile/src/features/tasks/data/taskMappers.ts`.

## Validation at every boundary

- **User input → app:** `createTaskInputSchema` / `updateTaskInputSchema` (Zod)
- **Storage → app:** `fromTaskRow()` validates rows read from SQLite
- **App → server:** `toTaskPayload()` validates and strips local fields
- **Database:** CHECK constraints in `002_projects_and_task_fields.sql` enforce the same rules

## Architecture decisions

- SQLite is the local source of truth; PostgreSQL stores remote data.
- IDs are UUID v7: created offline, unique, and time-ordered (good for indexes).
- All timestamps are ISO 8601 strings in UTC (`...Z`).
- Deletes are soft deletes so they can be synced.
- Zod schemas are the single source of truth; TypeScript types are inferred from them.

SQLite persistence (Ep 07), the repository (Ep 08) and sync (Ep 11–12) come later.
