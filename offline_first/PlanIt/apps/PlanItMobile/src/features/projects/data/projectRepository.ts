import type { CreateProjectInput, LocalProject } from '../domain/project';

/** The contract between screens and project data (same idea as TaskRepository). */
export interface ProjectRepository {
  list(): Promise<LocalProject[]>;
  create(input: CreateProjectInput): Promise<LocalProject>;
}
