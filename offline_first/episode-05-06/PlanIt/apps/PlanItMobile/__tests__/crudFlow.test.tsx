/**
 * The demo flow, end to end through the real screens and navigation:
 * open project → validation error → create → edit → complete → filter → delete.
 */

import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import App from '../App';

jest.setTimeout(30000);

const settle = () =>
  act(() => new Promise<void>(resolve => setTimeout(resolve, 600)));

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
  await act(async () => byId(testID).props.onPress());
  await settle();
};
const type = async (testID: string, value: string) => {
  await act(async () => byId(testID).props.onChangeText(value));
  await settle();
};

beforeAll(async () => {
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await settle();
});

afterAll(() => act(() => renderer.unmount()));

test('home: stats and projects', () => {
  expect(has('project-Personal')).toBe(true);
  expect(has('project-Work')).toBe(true);
  expect(texts()).toEqual(
    expect.arrayContaining(['To do', 'Due today', 'Completed']),
  );
});

test('open Personal: seed tasks, progress and filter counts', async () => {
  await press('project-Personal');
  expect(has('task-Pay electricity bill')).toBe(true);
  expect(has('task-Renew gym membership')).toBe(true);
  expect(texts()).toEqual(
    expect.arrayContaining(['All 3', 'Active 2', 'Done 1']),
  );
});

test('create: empty title shows the Zod message, valid task is added', async () => {
  await press('add-task');
  await press('save-task');
  expect(texts()).toContain('Title is required');

  await type('title-input', 'Buy milk');
  await press('priority-high');
  await press('due-today');
  await press('save-task');
  expect(has('task-Buy milk')).toBe(true);
  expect(texts()).toContain('All 4');
});

test('update: rename keeps the same task, version goes up', async () => {
  await press('task-Buy milk');
  await type('title-input', 'Buy milk and bread');
  await press('save-task');
  expect(has('task-Buy milk and bread')).toBe(true);
  expect(has('task-Buy milk')).toBe(false);

  await press('task-Buy milk and bread');
  expect(texts()).toContain('Version 2');
  await press('save-task');
});

test('complete and filter', async () => {
  await press('toggle-Buy milk and bread');
  expect(byId('toggle-Buy milk and bread').props.accessibilityState).toEqual({
    checked: true,
  });

  await press('filter-active');
  expect(has('task-Buy milk and bread')).toBe(false);
  expect(has('task-Pay electricity bill')).toBe(true);

  await press('filter-done');
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
  expect(has('task-Buy milk and bread')).toBe(false);
  expect(texts()).toContain('All 3');
  alert.mockRestore();
});
