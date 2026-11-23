import { InMemoryProjectRepository } from '../features/projects/data/inMemoryProjectRepository';
import { InMemoryTaskRepository } from '../features/tasks/data/inMemoryTaskRepository';
import { seedProjects, seedTasks } from './seed';

/**
 * The ONE place that decides where data lives.
 *
 * To move to SQLite, change only these lines, e.g.
 *   tasks: new SqliteTaskRepository(db)
 * Screens don't change — they only know the repository interfaces.
 */
export const repositories = {
  tasks: new InMemoryTaskRepository(seedTasks, { delayMs: 250 }),
  projects: new InMemoryProjectRepository(seedProjects, { delayMs: 250 }),
};
