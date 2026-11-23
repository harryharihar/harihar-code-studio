import { wait, type SimulationOptions } from '../../../shared/data/simulation';
import {
  createTask,
  deleteTask,
  updateTask,
  type CreateTaskInput,
  type LocalTask,
  type TaskPriority,
  type UpdateTaskInput,
} from '../domain/task';
import type { TaskFilter, TaskRepository } from './taskRepository';

/**
 * Tasks kept in a Map in memory.
 *
 * All rules (IDs, timestamps, version, soft delete) live in the domain
 * functions — this class only stores and filters.
 *
 * ⚠️ Memory is cleared when the app closes. A SQLite repository fixes that.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, LocalTask>();

  constructor(seed: LocalTask[] = [], private options: SimulationOptions = {}) {
    seed.forEach(task => this.tasks.set(task.id, task));
  }

  async list(filter: TaskFilter) {
    await wait(this.options.delayMs ?? 0);
    if (this.options.failWhen?.()) {
      throw new Error('Could not load tasks. Please try again.');
    }

    const status = filter.status ?? 'all';
    const search = filter.search?.trim().toLowerCase() ?? '';

    return [...this.tasks.values()]
      .filter(task => !filter.projectId || task.projectId === filter.projectId)
      .filter(task => task.deletedAt === null) // hide tombstones
      .filter(
        task => status === 'all' || task.isCompleted === (status === 'done'),
      )
      .filter(task => !search || matches(task, search))
      .filter(
        task =>
          !filter.dueBefore ||
          (task.dueAt !== null && task.dueAt <= filter.dueBefore),
      )
      .sort(byOpenFirstThenPriority);
  }

  async getById(id: string) {
    await wait(this.options.delayMs ?? 0);
    const task = this.tasks.get(id);
    return task && task.deletedAt === null ? task : null;
  }

  async create(input: CreateTaskInput) {
    const task = createTask(input); // UUID v7, timestamps, version 1
    this.tasks.set(task.id, task);
    return task;
  }

  async update(id: string, changes: UpdateTaskInput) {
    const task = updateTask(this.require(id), changes); // version + 1
    this.tasks.set(id, task);
    return task;
  }

  async remove(id: string) {
    this.tasks.set(id, deleteTask(this.require(id))); // soft delete
  }

  private require(id: string): LocalTask {
    const task = this.tasks.get(id);
    if (!task || task.deletedAt !== null) {
      throw new Error(`Task ${id} not found`);
    }
    return task;
  }
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function matches(task: LocalTask, search: string): boolean {
  return (
    task.title.toLowerCase().includes(search) ||
    (task.description ?? '').toLowerCase().includes(search)
  );
}

/** Open tasks first, then high → low priority, then newest first. */
function byOpenFirstThenPriority(a: LocalTask, b: LocalTask): number {
  return (
    Number(a.isCompleted) - Number(b.isCompleted) ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    b.createdAt.localeCompare(a.createdAt) ||
    b.id.localeCompare(a.id)
  );
}
