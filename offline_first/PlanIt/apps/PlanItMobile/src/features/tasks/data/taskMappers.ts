import {
  localTaskSchema,
  taskSchema,
  type LocalTask,
  type Task,
} from '../domain/task';

/**
 * One task, three shapes:
 *
 *   LocalTask (app)  ->  TaskRow (SQLite)    snake_case, 0/1 for booleans
 *   LocalTask (app)  ->  Task    (API JSON)  no local-only syncStatus
 */

// ---------- SQLite row (table created in Ep 07) ----------

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  is_completed: 0 | 1;
  priority: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  sync_status: string;
}

export function toTaskRow(task: LocalTask): TaskRow {
  return {
    id: task.id,
    project_id: task.projectId,
    title: task.title,
    description: task.description,
    is_completed: task.isCompleted ? 1 : 0,
    priority: task.priority,
    due_at: task.dueAt,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt,
    version: task.version,
    sync_status: task.syncStatus,
  };
}

/** Data coming out of storage is validated too — never trust a boundary. */
export function fromTaskRow(row: TaskRow): LocalTask {
  return localTaskSchema.parse({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    isCompleted: row.is_completed === 1,
    priority: row.priority,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    version: row.version,
    syncStatus: row.sync_status,
  });
}

// ---------- API payload (used by the sync engine in Ep 12) ----------

/** Zod drops keys the schema doesn't know, so syncStatus never leaves the phone. */
export function toTaskPayload(task: LocalTask): Task {
  return taskSchema.parse(task);
}
