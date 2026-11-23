/**
 * The demo flow, end to end through the real screens and navigation:
 * open project → validation error → create → edit → complete → filter → delete.
 */

import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import App from '../App';

jest.setTimeout(120000);

const settle = () =>
  act(() => new Promise<void>(resolve => setTimeout(resolve, 600)));

/** Waits for a result instead of a fixed time, so slow machines pass too. */
const waitUntil = async (check: () => boolean) => {
  const deadline = Date.now() + 20000;
  while (!check() && Date.now() < deadline) {
    await act(() => new Promise<void>(resolve => setTimeout(resolve, 50)));
  }
};

let renderer: ReactTestRenderer.ReactTestRenderer;
const byId = (testID: string) => renderer.root.findByProps({ testID });
const has = (testID: string) =>
  renderer.root.findAllByProps({ testID }).length > 0;
const texts = () =>
  renderer.root
    .findAll(node => (node.type as unknown) === 'Text') // host text nodes
    .map(node =>
      node.children.filter(child => typeof child === 'string').join(''),
    );
const press = async (testID: string) => {
  await waitUntil(() => has(testID));
  await act(async () => byId(testID).props.onPress());
  await settle();
};
const type = async (testID: string, value: string) => {
  await waitUntil(() => has(testID));
  await act(async () => byId(testID).props.onChangeText(value));
  await settle();
};

beforeAll(async () => {
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await waitUntil(() => has('project-Personal') && has('project-Work'));
});

afterAll(() => act(() => renderer.unmount()));

test('home: stats and projects', async () => {
  await waitUntil(() => has('project-Personal'));
  expect(has('project-Personal')).toBe(true);
  await waitUntil(() => has('project-Work'));
  expect(has('project-Work')).toBe(true);
  await waitUntil(() =>
    ['To do', 'Due today', 'Completed'].every(text => texts().includes(text)),
  );
  expect(texts()).toEqual(
    expect.arrayContaining(['To do', 'Due today', 'Completed']),
  );
});

test('open Personal: seed tasks, progress and filter counts', async () => {
  await press('project-Personal');
  await waitUntil(() => has('task-Pay electricity bill'));
  expect(has('task-Pay electricity bill')).toBe(true);
  await waitUntil(() => has('task-Renew gym membership'));
  expect(has('task-Renew gym membership')).toBe(true);
  await waitUntil(() =>
    ['All 3', 'Active 2', 'Done 1'].every(text => texts().includes(text)),
  );
  expect(texts()).toEqual(
    expect.arrayContaining(['All 3', 'Active 2', 'Done 1']),
  );
});

test('create: empty title shows the Zod message, valid task is added', async () => {
  await press('add-task');
  await press('save-task');
  await waitUntil(() => texts().includes('Title is required'));
  expect(texts()).toContain('Title is required');

  await type('title-input', 'Buy milk');
  await press('priority-high');
  await press('due-today');
  await press('save-task');
  await waitUntil(() => has('task-Buy milk'));
  expect(has('task-Buy milk')).toBe(true);
  await waitUntil(() => texts().includes('All 4'));
  expect(texts()).toContain('All 4');
});

test('update: rename keeps the same task, version goes up', async () => {
  await press('task-Buy milk');
  await type('title-input', 'Buy milk and bread');
  await press('save-task');
  await waitUntil(() => has('task-Buy milk and bread'));
  expect(has('task-Buy milk and bread')).toBe(true);
  await waitUntil(() => !has('task-Buy milk'));
  expect(has('task-Buy milk')).toBe(false);

  await press('task-Buy milk and bread');
  await waitUntil(() => texts().includes('Version 2'));
  expect(texts()).toContain('Version 2');
  await press('save-task');
});

test('complete and filter', async () => {
  await press('toggle-Buy milk and bread');
  await waitUntil(
    () => byId('toggle-Buy milk and bread').props.accessibilityState.checked,
  );
  expect(byId('toggle-Buy milk and bread').props.accessibilityState).toEqual({
    checked: true,
  });

  await press('filter-active');
  await waitUntil(() => !has('task-Buy milk and bread'));
  expect(has('task-Buy milk and bread')).toBe(false);
  await waitUntil(() => has('task-Pay electricity bill'));
  expect(has('task-Pay electricity bill')).toBe(true);

  await press('filter-done');
  await waitUntil(() => has('task-Buy milk and bread'));
  expect(has('task-Buy milk and bread')).toBe(true);
  await press('filter-all');
});

test('delete: confirm removes the task', async () => {
  const alert = jest
    .spyOn(Alert, 'alert')
    .mockImplementation((_title, _message, buttons) => {
      buttons?.find(button => button.style === 'destructive')?.onPress?.();
    });
  await press('task-Buy milk and bread');
  await press('delete-task');
  await settle();
  expect(alert).toHaveBeenCalled();
  await waitUntil(() => !has('task-Buy milk and bread'));
  expect(has('task-Buy milk and bread')).toBe(false);
  await waitUntil(() => texts().includes('All 3'));
  expect(texts()).toContain('All 3');
  alert.mockRestore();
});
