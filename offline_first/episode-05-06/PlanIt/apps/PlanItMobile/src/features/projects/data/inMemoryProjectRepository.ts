import { wait, type SimulationOptions } from '../../../shared/data/simulation';
import {
  createProject,
  type CreateProjectInput,
  type LocalProject,
} from '../domain/project';
import type { ProjectRepository } from './projectRepository';

export class InMemoryProjectRepository implements ProjectRepository {
  private projects = new Map<string, LocalProject>();

  constructor(
    seed: LocalProject[] = [],
    private options: SimulationOptions = {},
  ) {
    seed.forEach(project => this.projects.set(project.id, project));
  }

  async list() {
    await wait(this.options.delayMs ?? 0);
    if (this.options.failWhen?.()) {
      throw new Error('Could not load projects. Please try again.');
    }
    return [...this.projects.values()]
      .filter(project => project.deletedAt === null)
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      );
  }

  async create(input: CreateProjectInput) {
    const project = createProject(input); // UUID v7, timestamps, version 1
    this.projects.set(project.id, project);
    return project;
  }
}
