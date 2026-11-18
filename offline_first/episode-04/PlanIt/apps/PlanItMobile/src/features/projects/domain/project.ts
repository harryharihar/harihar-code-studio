import { z } from 'zod';

import { createId } from '../../../shared/domain/id';
import {
  entityBaseSchema,
  syncStatusSchema,
} from '../../../shared/domain/schemas';
import { nowIso } from '../../../shared/domain/time';

// ---------- Schemas (the rules) ----------

export const projectSchema = entityBaseSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name is too long'),
});

export const localProjectSchema = projectSchema.extend({
  syncStatus: syncStatusSchema,
});

export const createProjectInputSchema = projectSchema.pick({ name: true });

// ---------- Types (inferred from the schemas) ----------

export type Project = z.infer<typeof projectSchema>;
export type LocalProject = z.infer<typeof localProjectSchema>;
export type CreateProjectInput = z.input<typeof createProjectInputSchema>;

// ---------- Factory ----------

export function createProject(
  input: CreateProjectInput,
  now: string = nowIso(),
): LocalProject {
  const { name } = createProjectInputSchema.parse(input);

  return localProjectSchema.parse({
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  });
}
