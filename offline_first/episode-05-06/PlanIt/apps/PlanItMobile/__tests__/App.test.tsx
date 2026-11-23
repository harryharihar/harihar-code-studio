/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

test('renders the home screen with the seed projects', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  // Seed data loads after a short simulated delay.
  await ReactTestRenderer.act(
    () => new Promise<void>(resolve => setTimeout(resolve, 800)),
  );

  const root = renderer!.root;
  expect(root.findByProps({ testID: 'project-Personal' })).toBeTruthy();
  expect(root.findByProps({ testID: 'project-Work' })).toBeTruthy();
  ReactTestRenderer.act(() => renderer!.unmount());
});
