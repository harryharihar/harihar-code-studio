import { createProject } from '../features/projects/domain/project';
import { createTask, updateTask } from '../features/tasks/domain/task';
import { dueOptionToIso } from '../shared/lib/dates';

/** Starter data, created with the same domain functions as user data. */
const personal = createProject({ name: 'Personal' });
const work = createProject({ name: 'Work' });

export const seedProjects = [personal, work];

export const seedTasks = [
  createTask({
    projectId: personal.id,
    title: 'Pay electricity bill',
    priority: 'high',
    dueAt: dueOptionToIso('today'),
  }),
  createTask({
    projectId: personal.id,
    title: 'Book gas cylinder',
    description: 'Use the HP Gas app',
    priority: 'medium',
    dueAt: dueOptionToIso('tomorrow'),
  }),
  updateTask(
    createTask({
      projectId: personal.id,
      title: 'Renew gym membership',
      priority: 'low',
    }),
    {
      isCompleted: true,
    },
  ),
  createTask({
    projectId: work.id,
    title: 'Prepare sprint demo',
    description: 'Slides + live walkthrough',
    priority: 'high',
    dueAt: dueOptionToIso('tomorrow'),
  }),
  createTask({
    projectId: work.id,
    title: 'Review pull requests',
    priority: 'medium',
  }),
  createTask({
    projectId: work.id,
    title: 'Update API documentation',
    priority: 'low',
    dueAt: dueOptionToIso('nextWeek'),
  }),
];
