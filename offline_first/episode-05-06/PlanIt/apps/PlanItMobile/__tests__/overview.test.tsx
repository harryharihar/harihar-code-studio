/**
 * Home summary cards → cross-project task overview with tabs.
 */

import React from 'react';
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

beforeAll(async () => {
  await act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await settle();
});

afterAll(() => act(() => renderer.unmount()));

test('overview: stat cards open cross-project task lists', async () => {
  await press('stat-To do');
  expect(texts()).toContain('tasks still open');
  expect(has('task-Pay electricity bill')).toBe(true); // Personal
  expect(has('task-Review pull requests')).toBe(true); // Work
  expect(has('task-Renew gym membership')).toBe(false); // completed

  await press('view-done');
  expect(has('task-Renew gym membership')).toBe(true);
  expect(has('task-Pay electricity bill')).toBe(false);

  await press('view-today');
  expect(has('task-Pay electricity bill')).toBe(true); // due today
  expect(has('task-Book gas cylinder')).toBe(false); // due tomorrow

  await act(async () =>
    renderer.root.findByProps({ testID: 'view-all' }).props.onPress(),
  );
  await settle();
  expect(has('task-Update API documentation')).toBe(true);
});
