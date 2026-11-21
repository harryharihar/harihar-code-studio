module.exports = {
  preset: '@react-native/jest-preset',
  // uuid ships modern ES modules; let Babel compile it for Jest.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|uuid)/)',
  ],
};
