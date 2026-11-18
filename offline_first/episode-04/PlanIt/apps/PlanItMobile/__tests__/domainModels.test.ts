import { ZodError, z } from 'zod';

import { createProject } from '../src/features/projects/domain/project';
import {
  createTask,
  createTaskInputSchema,
  deleteTask,
  updateTask,
} from '../src/features/tasks/domain/task';
import {
  fromTaskRow,
  toTaskPayload,
  toTaskRow,
} from '../src/features/tasks/data/taskMappers';

const T1 = '2026-11-18T08:42:00.000Z';
const T2 = '2026-11-18T09:15:00.000Z';
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('Project', () => {
  it('gets a UUID v7 and metadata on the device', () => {
    const project = createProject({ name: '  Ghar ka kaam  ' }, T1);

    expect(project.id).toMatch(UUID_V7);
    expect(project.name).toBe('Ghar ka kaam'); // trimmed
    expect(project).toMatchObject({
      createdAt: T1,
      updatedAt: T1,
      deletedAt: null,
      version: 1,
      syncStatus: 'pending',
    });
  });
});

describe('Task', () => {
  const project = createProject({ name: 'Ghar ka kaam' }, T1);

  it('is created offline with a stable ID and pending status', () => {
    const task = createTask(
      { projectId: project.id, title: 'Bijli bill pay karna', priority: 'high' },
      T1,
    );

    expect(task.id).toMatch(UUID_V7);
    expect(task).toMatchObject({
      projectId: project.id,
      title: 'Bijli bill pay karna',
      description: null,
      isCompleted: false,
      priority: 'high',
      dueAt: null,
      createdAt: T1,
      updatedAt: T1,
      deletedAt: null,
      version: 1,
      syncStatus: 'pending',
    });
  });

  it('defaults priority to medium and turns a blank description into null', () => {
    const task = createTask(
      { projectId: project.id, title: 'Doodh lana', description: '   ' },
      T1,
    );

    expect(task.priority).toBe('medium');
    expect(task.description).toBeNull();
  });

  it('gives every task its own ID, sorted by creation time', () => {
    const first = createTask({ projectId: project.id, title: 'A' }, T1);
    const second = createTask({ projectId: project.id, title: 'B' }, T1);

    expect(first.id).not.toBe(second.id);
    expect(first.id < second.id).toBe(true);
  });

  it('rejects bad input with readable messages', () => {
    const badInput = { projectId: 'not-a-uuid', title: '   ', dueAt: 'kal' };

    // createTask throws...
    expect(() => createTask(badInput, T1)).toThrow(ZodError);

    // ...and a form can use safeParse to show errors per field.
    const result = createTaskInputSchema.safeParse(badInput);
    expect(result.success).toBe(false);

    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error);
      expect(fieldErrors.title).toEqual(['Title is required']);
      expect(fieldErrors.projectId).toBeDefined();
      expect(fieldErrors.dueAt).toBeDefined();
    }
  });

  it('update keeps the ID, bumps version and updatedAt, and is pending again', () => {
    const created = {
      ...createTask(
        { projectId: project.id, title: 'Gas cylinder', description: 'HP gas' },
        T1,
      ),
      syncStatus: 'synced' as const,
    };
    const updated = updateTask(created, { isCompleted: true }, T2);

    expect(updated.id).toBe(created.id);
    expect(updated).toMatchObject({
      title: 'Gas cylinder',
      description: 'HP gas', // untouched fields stay as they were
      isCompleted: true,
      createdAt: T1,
      updatedAt: T2,
      version: 2,
      syncStatus: 'pending',
    });
  });

  it('delete is a soft delete (tombstone), not a removed row', () => {
    const task = createTask({ projectId: project.id, title: 'Car service' }, T1);
    const deleted = deleteTask(task, T2);

    expect(deleted.id).toBe(task.id);
    expect(deleted).toMatchObject({ deletedAt: T2, updatedAt: T2, version: 2, syncStatus: 'pending' });
  });
});

describe('Mapping between app, SQLite and API', () => {
  const project = createProject({ name: 'Office' }, T1);
  const task = createTask(
    { projectId: project.id, title: 'Client call', dueAt: '2026-11-21T10:30:00.000Z' },
    T1,
  );

  it('round-trips through a SQLite row without losing data', () => {
    const row = toTaskRow(task);

    expect(row.is_completed).toBe(0);
    expect(row.project_id).toBe(project.id);
    expect(fromTaskRow(row)).toEqual(task);
  });

  it('rejects a corrupted row coming out of storage', () => {
    const row = { ...toTaskRow(task), priority: 'urgent' };

    expect(() => fromTaskRow(row)).toThrow(ZodError);
  });

  it('never sends local-only syncStatus to the server', () => {
    const payload = toTaskPayload(task);

    expect(payload).not.toHaveProperty('syncStatus');
    expect(payload.id).toBe(task.id);
  });
});
