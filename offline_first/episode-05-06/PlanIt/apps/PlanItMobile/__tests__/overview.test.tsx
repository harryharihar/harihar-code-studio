/**
 * Home summary cards → cross-project task overview with tabs.
 */

import React from 'react';
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

beforeAll(async () => {
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await waitUntil(() => has('project-Personal') && has('project-Work'));
});

afterAll(() => act(() => renderer.unmount()));

test('overview: stat cards open cross-project task lists', async () => {
  await press('stat-To do');
  await waitUntil(() => texts().includes('tasks still open'));
  expect(texts()).toContain('tasks still open');
  await waitUntil(() => has('task-Pay electricity bill'));
  expect(has('task-Pay electricity bill')).toBe(true); // Personal
  await waitUntil(() => has('task-Review pull requests'));
  expect(has('task-Review pull requests')).toBe(true); // Work
  await waitUntil(() => !has('task-Renew gym membership'));
  expect(has('task-Renew gym membership')).toBe(false); // completed

  await press('view-done');
  await waitUntil(() => has('task-Renew gym membership'));
  expect(has('task-Renew gym membership')).toBe(true);
  await waitUntil(() => !has('task-Pay electricity bill'));
  expect(has('task-Pay electricity bill')).toBe(false);

  await press('view-today');
  await waitUntil(() => has('task-Pay electricity bill'));
  expect(has('task-Pay electricity bill')).toBe(true); // due today
  await waitUntil(() => !has('task-Book gas cylinder'));
  expect(has('task-Book gas cylinder')).toBe(false); // due tomorrow

  await act(async () =>
    renderer.root.findByProps({ testID: 'view-all' }).props.onPress(),
  );
  await settle();
  await waitUntil(() => has('task-Update API documentation'));
  expect(has('task-Update API documentation')).toBe(true);
});
