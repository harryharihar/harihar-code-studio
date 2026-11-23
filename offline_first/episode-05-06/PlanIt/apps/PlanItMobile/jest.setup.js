/* eslint-env jest */
// Native modules don't exist in Jest: use the libraries' official mocks.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
