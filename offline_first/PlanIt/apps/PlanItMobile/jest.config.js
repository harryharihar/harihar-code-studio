module.exports = {
  preset: '@react-native/jest-preset',
  // uuid and React Navigation ship modern ES modules; let Babel compile them for Jest.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-svg|uuid)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
