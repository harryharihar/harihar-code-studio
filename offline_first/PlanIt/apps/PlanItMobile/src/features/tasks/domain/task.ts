import { z } from 'zod';

import { createId } from '../../../shared/domain/id';
import {
  entityBaseSchema,
  idSchema,
  isoDateTimeSchema,
  syncStatusSchema,
} from '../../../shared/domain/schemas';
import { nowIso } from '../../../shared/domain/time';

// ---------- Field rules ----------

export const taskPrioritySchema = z.enum(['low', 'medium', 'high']);

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title is too long');

/** Empty or blank text from a form becomes null. */
const descriptionInputSchema = z
  .string()
  .trim()
  .max(2000, 'Description is too long')
  .nullish()
  .transform(value => (value ? value : null));

// ---------- Task: the shape shared by app and server ----------

export const taskSchema = entityBaseSchema.extend({
  projectId: idSchema,
  title: titleSchema,
  description: z.string().max(2000).nullable(),
  isCompleted: z.boolean(),
  priority: taskPrioritySchema,
  dueAt: isoDateTimeSchema.nullable(),
});

/** Task + local-only sync metadata (never sent to the server). */
export const localTaskSchema = taskSchema.extend({
  syncStatus: syncStatusSchema,
});

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type Task = z.infer<typeof taskSchema>;
export type LocalTask = z.infer<typeof localTaskSchema>;

// ---------- Inputs: what the user is allowed to send ----------

export const createTaskInputSchema = z.object({
  projectId: idSchema,
  title: titleSchema,
  description: descriptionInputSchema,
  priority: taskPrioritySchema.default('medium'),
  dueAt: isoDateTimeSchema.nullish().transform(value => value ?? null),
});

export const updateTaskInputSchema = z
  .object({
    title: titleSchema,
    description: descriptionInputSchema,
    isCompleted: z.boolean(),
    priority: taskPrioritySchema,
    dueAt: isoDateTimeSchema.nullable(),
  })
  .partial();

export type CreateTaskInput = z.input<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskInputSchema>;

// ---------- Domain operations ----------

/** Creates a task on the device. Works offline: no server needed. */
export function createTask(
  input: CreateTaskInput,
  now: string = nowIso(),
): LocalTask {
  const data = createTaskInputSchema.parse(input);

  return localTaskSchema.parse({
    id: createId(),
    ...data,
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  });
}

/**
 * Every change: same id, new updatedAt, version + 1, pending again.
 * (Fixes the Ep 03 problem: updated_at must change on every update.)
 */
export function updateTask(
  task: LocalTask,
  changes: UpdateTaskInput,
  now: string = nowIso(),
): LocalTask {
  const data = updateTaskInputSchema.parse(changes);

  return localTaskSchema.parse({
    ...task,
    ...data,
    updatedAt: now,
    version: task.version + 1,
    syncStatus: 'pending',
  });
}

/** Soft delete: keep the row, set a tombstone so the delete can sync. */
export function deleteTask(task: LocalTask, now: string = nowIso()): LocalTask {
  return localTaskSchema.parse({
    ...task,
    deletedAt: now,
    updatedAt: now,
    version: task.version + 1,
    syncStatus: 'pending',
  });
}
