import { createProject } from '../src/features/projects/domain/project';
import { InMemoryTaskRepository } from '../src/features/tasks/data/inMemoryTaskRepository';
import { InMemoryProjectRepository } from '../src/features/projects/data/inMemoryProjectRepository';

const project = createProject({ name: 'Personal' });
const other = createProject({ name: 'Work' });
const titles = (tasks: { title: string }[]) => tasks.map(task => task.title);

describe('InMemoryTaskRepository — CRUD', () => {
  it('create: saves a pending v1 task that shows up in the list', async () => {
    const repo = new InMemoryTaskRepository();
    const task = await repo.create({
      projectId: project.id,
      title: 'Doodh lana',
    });

    expect(task).toMatchObject({
      version: 1,
      syncStatus: 'pending',
      isCompleted: false,
    });
    expect(titles(await repo.list({ projectId: project.id }))).toEqual([
      'Doodh lana',
    ]);
    expect(await repo.list({ projectId: other.id })).toEqual([]);
  });

  it('read: getById returns the task, or null when unknown', async () => {
    const repo = new InMemoryTaskRepository();
    const task = await repo.create({
      projectId: project.id,
      title: 'Doodh lana',
    });

    expect(await repo.getById(task.id)).toEqual(task);
    expect(
      await repo.getById('00000000-0000-7000-8000-000000000000'),
    ).toBeNull();
  });

  it('update: same id, version + 1, pending again', async () => {
    const repo = new InMemoryTaskRepository();
    const task = await repo.create({
      projectId: project.id,
      title: 'Doodh lana',
    });
    const updated = await repo.update(task.id, {
      title: 'Doodh aur bread lana',
    });

    expect(updated.id).toBe(task.id);
    expect(updated.version).toBe(2);
    expect((await repo.getById(task.id))?.title).toBe('Doodh aur bread lana');
  });

  it('update: invalid changes are rejected and nothing is saved', async () => {
    const repo = new InMemoryTaskRepository();
    const task = await repo.create({
      projectId: project.id,
      title: 'Doodh lana',
    });

    await expect(repo.update(task.id, { title: '   ' })).rejects.toThrow(
      'Title is required',
    );
    expect((await repo.getById(task.id))?.version).toBe(1);
  });

  it('delete: soft delete hides the task everywhere', async () => {
    const repo = new InMemoryTaskRepository();
    const task = await repo.create({
      projectId: project.id,
      title: 'Doodh lana',
    });
    await repo.remove(task.id);

    expect(await repo.list({ projectId: project.id })).toEqual([]);
    expect(await repo.getById(task.id)).toBeNull();
    await expect(repo.update(task.id, { title: 'Back?' })).rejects.toThrow(
      'not found',
    );
  });
});

describe('InMemoryTaskRepository — filter, search, sort', () => {
  async function seeded() {
    const repo = new InMemoryTaskRepository();
    await repo.create({
      projectId: project.id,
      title: 'Bijli bill pay karna',
      priority: 'high',
    });
    await repo.create({
      projectId: project.id,
      title: 'Gym jana',
      priority: 'low',
    });
    const water = await repo.create({
      projectId: project.id,
      title: 'Paani ka bill',
      description: 'online pay',
      priority: 'medium',
    });
    await repo.update(water.id, { isCompleted: true });
    return repo;
  }

  it('sorts open tasks first, then by priority', async () => {
    const repo = await seeded();
    expect(titles(await repo.list({ projectId: project.id }))).toEqual([
      'Bijli bill pay karna',
      'Gym jana',
      'Paani ka bill',
    ]);
  });

  it('filters by status', async () => {
    const repo = await seeded();
    expect(
      titles(await repo.list({ projectId: project.id, status: 'done' })),
    ).toEqual(['Paani ka bill']);
    expect(
      titles(await repo.list({ projectId: project.id, status: 'active' })),
    ).toEqual(['Bijli bill pay karna', 'Gym jana']);
  });

  it('searches title and description, case-insensitive', async () => {
    const repo = await seeded();
    expect(
      titles(await repo.list({ projectId: project.id, search: '  BILL ' })),
    ).toEqual(['Bijli bill pay karna', 'Paani ka bill']);
    expect(
      titles(await repo.list({ projectId: project.id, search: 'online' })),
    ).toEqual(['Paani ka bill']);
    expect(
      titles(
        await repo.list({
          projectId: project.id,
          search: 'bill',
          status: 'active',
        }),
      ),
    ).toEqual(['Bijli bill pay karna']);
  });

  it('can simulate a failed load (for the error state)', async () => {
    let fail = true;
    const repo = new InMemoryTaskRepository([], { failWhen: () => fail });

    await expect(repo.list({ projectId: project.id })).rejects.toThrow(
      'Could not load tasks',
    );
    fail = false;
    await expect(repo.list({ projectId: project.id })).resolves.toEqual([]);
  });
});

describe('InMemoryProjectRepository', () => {
  it('creates validated projects and lists them oldest first', async () => {
    const repo = new InMemoryProjectRepository([project]);
    await repo.create({ name: '  Ghar ka kaam ' });

    expect((await repo.list()).map(p => p.name)).toEqual([
      'Personal',
      'Ghar ka kaam',
    ]);
    await expect(repo.create({ name: '' })).rejects.toThrow(
      'Project name is required',
    );
  });
});
