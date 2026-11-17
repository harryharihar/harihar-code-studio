# PlanIt Task Data Model

## Core fields

| Application field | PostgreSQL | Planned SQLite |
|---|---|---|
| id | UUID | TEXT PRIMARY KEY |
| title | TEXT NOT NULL | TEXT NOT NULL |
| description | TEXT nullable | TEXT nullable |
| isCompleted | BOOLEAN | INTEGER (0 or 1) |
| createdAt | TIMESTAMPTZ | TEXT (ISO 8601) |
| updatedAt | TIMESTAMPTZ | TEXT (ISO 8601) |
| deletedAt | TIMESTAMPTZ nullable | TEXT nullable (ISO 8601) |

## Local-only synchronization metadata

The mobile database will track synchronization state separately
from the core task fields.

Initial states:
- pending
- synced
- failed

Sync status is local metadata and is not included in the core
PostgreSQL tasks table.

## Architecture decisions

- SQLite is the planned local source of truth for mobile tasks.
- PostgreSQL stores remote task data.
- The repository separates data access from UI code.
- UUIDs allow tasks to be identified before network access.
- Deletion timestamps can preserve deletion information for sync.
- Timestamps need a consistent format and time-zone policy.

This is the intended design. SQLite persistence, repository
implementation, and synchronization are implemented in later episodes.
