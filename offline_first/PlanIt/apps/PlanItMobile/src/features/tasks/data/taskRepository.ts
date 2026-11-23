import type {
  CreateTaskInput,
  LocalTask,
  UpdateTaskInput,
} from '../domain/task';

export type TaskStatusFilter = 'all' | 'active' | 'done';

export type TaskFilter = {
  /** Omit to get tasks from every project. */
  projectId?: string;
  status?: TaskStatusFilter;
  search?: string;
  /** Only tasks due on or before this ISO time (e.g. end of today). */
  dueBefore?: string;
};

/**
 * The contract between screens and task data.
 *
 * Screens only talk to this interface. It can be backed by memory,
 * SQLite or a REST API — the screens never change.
 *
 * Every method is async, even in memory, because SQLite and APIs are.
 */
export interface TaskRepository {
  list(filter: TaskFilter): Promise<LocalTask[]>;
  getById(id: string): Promise<LocalTask | null>;
  create(input: CreateTaskInput): Promise<LocalTask>;
  update(id: string, changes: UpdateTaskInput): Promise<LocalTask>;
  remove(id: string): Promise<void>;
}
