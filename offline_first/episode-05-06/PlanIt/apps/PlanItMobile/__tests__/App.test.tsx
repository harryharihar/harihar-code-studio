/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.setTimeout(60000);

test('renders the home screen with the seed projects', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;

  // Seed data loads after a short simulated delay: wait for it, not for a fixed time.
  const deadline = Date.now() + 20000;
  while (
    root.findAllByProps({ testID: 'project-Work' }).length === 0 &&
    Date.now() < deadline
  ) {
    await ReactTestRenderer.act(
      () => new Promise<void>(resolve => setTimeout(resolve, 50)),
    );
  }

  expect(root.findByProps({ testID: 'project-Personal' })).toBeTruthy();
  expect(root.findByProps({ testID: 'project-Work' })).toBeTruthy();
  ReactTestRenderer.act(() => renderer!.unmount());
});
