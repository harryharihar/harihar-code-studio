/**
 * Sync Lab — a teaching simulator for Episode 04.
 *
 * Two phones work offline, then sync through one server. The same story runs
 * twice: once with a "junior" data model (counter IDs, hard deletes, no
 * validation) and once with our "senior" model (UUID v7, tombstones, Zod).
 *
 * Everything here is in memory. Real SQLite arrives in Ep 07, real sync in Ep 12.
 */
import { z } from 'zod';

import { createProject } from '../features/projects/domain/project';
import {
  createTask,
  createTaskInputSchema,
  deleteTask,
  type LocalTask,
} from '../features/tasks/domain/task';

export type Mode = 'junior' | 'senior';
export type ScenarioId = 'idClash' | 'deleteOffline' | 'badData';
export type Tone = 'info' | 'good' | 'bad';

export interface CardView {
  key: string;
  id: string;
  title: string;
  note?: string;
  tone: 'ok' | 'deleted' | 'error';
}

export interface Snapshot {
  phoneA: CardView[];
  server: CardView[];
  phoneB: CardView[];
}

export interface Step {
  log: string;
  tone: Tone;
  state: Snapshot;
}

export interface Outcome {
  steps: Step[];
  verdict: string;
  verdictTone: 'good' | 'bad';
}

export const SCENARIOS: { id: ScenarioId; label: string; story: string }[] = [
  { id: 'idClash', label: 'ID clash', story: 'Both phones add a task offline' },
  { id: 'deleteOffline', label: 'Delete offline', story: 'Phone A deletes a task offline' },
  { id: 'badData', label: 'Bad data', story: 'A task with “kal shaam” as the date' },
];

// ---------------------------------------------------------------- helpers

/**
 * Short ID for small phone screens. A UUID v7 starts with a timestamp, so two
 * IDs made in the same millisecond share their start — show the random end too.
 */
export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : `#${id}`;
}

type Store<T> = Map<string, T>;

function snapshot<T>(
  a: Store<T>,
  server: Store<T>,
  b: Store<T>,
  view: (t: T, where: 'phone' | 'server') => CardView,
): Snapshot {
  return {
    phoneA: [...a.values()].map(t => view(t, 'phone')),
    server: [...server.values()].map(t => view(t, 'server')),
    phoneB: [...b.values()].map(t => view(t, 'phone')),
  };
}

// ---------------------------------------------------------------- junior model

/** What many first apps do: a counter for IDs, a plain object, no checks. */
interface JuniorTask {
  id: string;
  title: string;
  dueAt: string | null;
}

function juniorView(t: JuniorTask): CardView {
  const due = t.dueAt ? new Date(t.dueAt) : null;
  const badDate = due !== null && Number.isNaN(due.getTime());
  return {
    key: `${t.id}-${t.title}`,
    id: shortId(t.id),
    title: t.title.trim() === '' ? '(empty title)' : t.title,
    note: badDate ? 'Due: Invalid Date' : undefined,
    tone: badDate || t.title.trim() === '' ? 'error' : 'ok',
  };
}

function runJunior(scenario: ScenarioId): Outcome {
  const a: Store<JuniorTask> = new Map();
  const b: Store<JuniorTask> = new Map();
  const server: Store<JuniorTask> = new Map();
  const steps: Step[] = [];
  const push = (log: string, tone: Tone) =>
    steps.push({ log, tone, state: snapshot(a, server, b, juniorView) });

  if (scenario === 'idClash') {
    a.set('1', { id: '1', title: 'Bijli bill pay karna', dueAt: null });
    push('Phone A (offline) adds “Bijli bill pay karna” → id 1', 'info');
    b.set('1', { id: '1', title: 'Doodh lana', dueAt: null });
    push('Phone B (offline) adds “Doodh lana” → also id 1', 'bad');
    server.set('1', a.get('1')!);
    push('Phone A syncs → server saves id 1 = Bijli bill', 'info');
    server.set('1', b.get('1')!);
    push('Phone B syncs → same id 1, so it OVERWRITES Bijli bill', 'bad');
    a.set('1', server.get('1')!);
    push('Phone A pulls → its Bijli bill is replaced too', 'bad');
    return { steps, verdict: 'Bijli bill is gone. From every phone.', verdictTone: 'bad' };
  }

  if (scenario === 'deleteOffline') {
    const task = { id: '1', title: 'Gas cylinder book karna', dueAt: null };
    a.set('1', { ...task });
    b.set('1', { ...task });
    server.set('1', { ...task });
    push('Start: all three have “Gas cylinder book karna”', 'info');
    a.delete('1');
    push('Phone A (offline) deletes it → row removed', 'info');
    push('Phone A syncs → nothing to send. The row is just… gone', 'bad');
    push('Phone B syncs its old copy → server still has the task', 'info');
    a.set('1', { ...server.get('1')! });
    push('Phone A pulls → the deleted task comes BACK', 'bad');
    return { steps, verdict: 'Zombie task: deleted, but it came back.', verdictTone: 'bad' };
  }

  // badData
  a.set('1', { id: '1', title: '   ', dueAt: 'kal shaam' });
  push('Phone A saves title “   ” and due date “kal shaam”. No check.', 'bad');
  push('Screen shows: Invalid Date', 'bad');
  push(
    'Sync → PostgreSQL: invalid input syntax for type timestamp with time zone: "kal shaam"',
    'bad',
  );
  push('Sync fails. Retries. Fails again. Stuck forever.', 'bad');
  return { steps, verdict: 'Bad data got in. Now sync is stuck.', verdictTone: 'bad' };
}

// ---------------------------------------------------------------- senior model

function seniorView(t: LocalTask, where: 'phone' | 'server'): CardView {
  return {
    key: t.id,
    id: shortId(t.id),
    title: t.title,
    note:
      t.deletedAt !== null
        ? `deletedAt set · v${t.version}`
        : where === 'server'
          ? `v${t.version}`
          : `v${t.version} · ${t.syncStatus}`,
    tone: t.deletedAt !== null ? 'deleted' : 'ok',
  };
}

const synced = (t: LocalTask): LocalTask => ({ ...t, syncStatus: 'synced' });

function runSenior(scenario: ScenarioId, now: () => string): Outcome {
  const a: Store<LocalTask> = new Map();
  const b: Store<LocalTask> = new Map();
  const server: Store<LocalTask> = new Map();
  const steps: Step[] = [];
  const push = (log: string, tone: Tone) =>
    steps.push({ log, tone, state: snapshot(a, server, b, seniorView) });
  const project = createProject({ name: 'Ghar ka kaam' }, now());

  if (scenario === 'idClash') {
    const bijli = createTask({ projectId: project.id, title: 'Bijli bill pay karna' }, now());
    a.set(bijli.id, bijli);
    push(`Phone A (offline) adds “Bijli bill pay karna” → ${shortId(bijli.id)}`, 'info');
    const doodh = createTask({ projectId: project.id, title: 'Doodh lana' }, now());
    b.set(doodh.id, doodh);
    push(`Phone B (offline) adds “Doodh lana” → ${shortId(doodh.id)}`, 'good');
    server.set(bijli.id, synced(bijli));
    a.set(bijli.id, synced(bijli));
    push('Phone A syncs → server saves Bijli bill', 'info');
    server.set(doodh.id, synced(doodh));
    b.set(doodh.id, synced(doodh));
    push('Phone B syncs → different UUID, so it is ADDED, not overwritten', 'good');
    a.set(doodh.id, synced(doodh));
    b.set(bijli.id, synced(bijli));
    push('Both phones pull → both have both tasks', 'good');
    return { steps, verdict: 'Both tasks safe. On every phone.', verdictTone: 'good' };
  }

  if (scenario === 'deleteOffline') {
    const gas = synced(
      createTask({ projectId: project.id, title: 'Gas cylinder book karna' }, now()),
    );
    a.set(gas.id, gas);
    b.set(gas.id, gas);
    server.set(gas.id, gas);
    push('Start: all three have “Gas cylinder book karna” (v1)', 'info');
    const tomb = deleteTask(gas, now());
    a.set(gas.id, tomb);
    push('Phone A (offline) deletes it → deletedAt set, v2, pending', 'good');
    server.set(gas.id, synced(tomb));
    a.set(gas.id, synced(tomb));
    push('Phone A syncs → the tombstone (v2) reaches the server', 'good');
    push('Phone B syncs → its copy is only v1, nothing new to send', 'info');
    b.set(gas.id, synced(tomb));
    push('Phone B pulls → gets v2 with deletedAt → hides the task', 'good');
    return { steps, verdict: 'Deleted everywhere. It stays deleted.', verdictTone: 'good' };
  }

  // badData
  const result = createTaskInputSchema.safeParse({
    projectId: project.id,
    title: '   ',
    dueAt: 'kal shaam',
  });
  const errors = result.success ? {} : z.flattenError(result.error).fieldErrors;
  push('Phone A tries to save title “   ” and due date “kal shaam”', 'info');
  for (const [field, messages] of Object.entries(errors)) {
    push(`Zod stops it → ${field}: ${(messages ?? []).join(', ')}`, 'good');
  }
  push('Nothing bad is saved. Nothing bad is sent. Sync stays healthy.', 'good');
  return { steps, verdict: 'Bad data stopped at the door.', verdictTone: 'good' };
}

// ---------------------------------------------------------------- entry point

export function runScenario(
  scenario: ScenarioId,
  mode: Mode,
  now: () => string = () => new Date().toISOString(),
): Outcome {
  return mode === 'junior' ? runJunior(scenario) : runSenior(scenario, now);
}
